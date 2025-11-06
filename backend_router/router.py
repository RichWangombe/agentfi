#!/usr/bin/env python3
"""
backend_router/router.py

Simple poller that watches AgentInvoked events on AgentCallManagerWithVerify,
runs a mock LLM (or OpenAI if configured), 'uploads' result (mock), signs the
message = keccak256(agentId, invocationId, resultHash, nonce, chainId) and calls
confirmResult(...) on-chain.

Usage:
  pip install -r requirements.txt
  copy env.example to .env and set values
  python router.py
"""

import os
import time
import json
import pathlib
from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct

NET = os.getenv("NETWORK", "sepolia")
DOTENV_PATH = pathlib.Path(__file__).with_name(f".env.{NET}")
if DOTENV_PATH.exists():
    load_dotenv(DOTENV_PATH)
else:
    # Fallback to .env if specific file is missing
    load_dotenv()

SOMNIA_RPC = os.getenv("SOMNIA_RPC")
CHAIN_ID = int(os.getenv("CHAIN_ID", "0") or 0)
ROUTER_PRIVATE_KEY = os.getenv("ROUTER_PRIVATE_KEY")
CALL_MANAGER_ADDRESS = os.getenv("CALL_MANAGER_ADDRESS")
REGISTRY_ADDRESS = os.getenv("REGISTRY_ADDRESS")
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not SOMNIA_RPC or not ROUTER_PRIVATE_KEY or not CALL_MANAGER_ADDRESS:
    print("Please set SOMNIA_RPC, ROUTER_PRIVATE_KEY, CALL_MANAGER_ADDRESS in .env")
    raise SystemExit(1)

w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC))
acct = Account.from_key(ROUTER_PRIVATE_KEY)
ROUTER_ADDRESS = acct.address
print("Router address:", ROUTER_ADDRESS)

# Load ABI for AgentCallManagerWithVerify
ABI_PATH = os.path.join(os.path.dirname(__file__), "abis", "AgentCallManagerWithVerify.json")
if not os.path.exists(ABI_PATH):
    print("ABI not found:", ABI_PATH)
    print("Compile contracts and copy ABI to backend_router/abis/AgentCallManagerWithVerify.json")
    raise SystemExit(1)

with open(ABI_PATH, "r") as f:
    _artifact = json.load(f)
    CALL_MANAGER_ABI = _artifact["abi"] if isinstance(_artifact, dict) and "abi" in _artifact else _artifact

call_manager = w3.eth.contract(address=Web3.to_checksum_address(CALL_MANAGER_ADDRESS), abi=CALL_MANAGER_ABI)

# Deterministic mock LLM
def call_llm_mock(prompt: str) -> str:
    return f"[MOCK RESPONSE] {prompt}"

# Mock upload: returns (result_uri, result_hash)
def upload_result_mock(payload: dict):
    body = json.dumps(payload, ensure_ascii=False)
    result_hash = w3.keccak(text=body)
    result_uri = "data:application/json;base64," + body.encode("utf-8").hex()
    return result_uri, result_hash

# Sign result tuple according to on-chain verification
def sign_result(agent_id: int, invocation_id: bytes, result_hash: bytes, nonce: int):
    types = ["uint256", "bytes32", "bytes32", "uint256", "uint256"]
    values = [agent_id, invocation_id, result_hash, nonce, CHAIN_ID]
    message_hash = w3.solidity_keccak(types, values)
    eth_message = encode_defunct(message_hash)
    signed = acct.sign_message(eth_message)
    return signed.signature

# Handle a single AgentInvoked event
def handle_event(ev):
    args = ev["args"]
    agent_id = int(args["agentId"])  # uint256
    invocation_id = args["invocationId"]  # bytes32 (HexBytes)
    caller = args["caller"]
    paid = int(args["paid"])  # uint256

    print(f"Invocation: agentId={agent_id} invocationId={invocation_id.hex()} caller={caller} paid={paid}")

    # 1) Build prompt (in production, retrieve the input payload from off-chain storage or event)
    prompt = f"Run agent {agent_id} for invocation {invocation_id.hex()}"

    # 2) LLM: mock or real (OpenAI integration stub)
    if MOCK_MODE or not OPENAI_API_KEY:
        llm_output = call_llm_mock(prompt)
    else:
        # TODO: implement real OpenAI call if desired
        llm_output = call_llm_mock(prompt)

    # 3) Upload result (mock)
    result_uri, result_hash = upload_result_mock({
        "agentId": agent_id,
        "invocation": invocation_id.hex(),
        "output": llm_output,
    })
    print("Result uploaded:", result_uri[:80], "... hash:", result_hash.hex())

    # 4) Nonce (timestamp for demo)
    nonce = int(time.time())

    # 5) Sign
    signature = sign_result(agent_id, invocation_id, result_hash, nonce)

    # 6) Call confirmResult on-chain
    tx = call_manager.functions.confirmResult(
        agent_id,
        invocation_id,
        result_hash,
        nonce,
        signature,
    ).build_transaction({
        "from": ROUTER_ADDRESS,
        "nonce": w3.eth.get_transaction_count(ROUTER_ADDRESS),
        "gas": 600_000,
        "gasPrice": w3.eth.gas_price,
        "chainId": CHAIN_ID if CHAIN_ID != 0 else None,
    })

    signed_tx = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print("confirmResult tx:", tx_hash.hex())
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print("confirmResult status:", receipt.status)

# Poll loop

def poll_loop(poll_interval: int = 3):
    print("Polling for AgentInvoked events...")
    last_checked = w3.eth.block_number
    while True:
        try:
            current_block = w3.eth.block_number
            if current_block > last_checked:
                from_block = last_checked + 1
                to_block = current_block
                # Fetch logs for the range
                events = call_manager.events.AgentInvoked.get_logs(fromBlock=from_block, toBlock=to_block)
                for ev in events:
                    handle_event(ev)
                last_checked = to_block
            time.sleep(poll_interval)
        except Exception as e:
            print("Poll error:", e)
            time.sleep(5)

if __name__ == "__main__":
    poll_loop()
