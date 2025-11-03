# AgentFi — The AI Agent Marketplace on Somnia

**Tagline:**
The decentralized marketplace where AI agents live, earn, and evolve on-chain.

## Overview
AgentFi is the first on-chain AI Agent Marketplace built on the Somnia Blockchain, enabling developers to deploy autonomous agents as smart-contract-registered services — and users to rent, invoke, and stake those agents directly from a decentralized marketplace.

Instead of building one AI agent, AgentFi creates the infrastructure layer that powers the entire agent economy on Somnia. It’s like OpenSea for AI agents — a composable, permissionless platform where AI services can:

- **Register** with metadata and fee models
- **Execute** on-chain or off-chain tasks
- **Earn** from user interactions
- **Build reputation** through staking and performance

## System Architecture

### 1) Smart Contracts (Somnia / Solidity)
- **`AgentRegistry.sol`** — Registers agents with metadata, endpoints, and fee structures.
- **`AgentCallManager.sol`** — Handles agent invocations, payments, and completion confirmations.
- **`AgentStake.sol`** — Enables users to stake on agents for discovery and curation rewards.
- **`AgentRevenueVault.sol`** — Collects usage fees and distributes revenue to creators and curators.
- **`AgentOracleRouter.sol`** — Bridges on-chain logic to off-chain AI APIs (OpenAI, Replicate, etc.).

### 2) Off-Chain Layer
AI Router (FastAPI or Next.js API route):
- Receives invocation requests from contracts
- Forwards them to external AI endpoints
- Returns signed results for verification

Example payload:
```json
{
  "agentId": 42,
  "input": "Summarize top 3 DeFi trends this week",
  "signature": "0x..."
}
```

### 3) Frontend (Next.js + Tailwind + Wagmi)
Core Pages:
- `/` → Explore all agents (filter by type, cost, rating)
- `/agent/[id]` → View, invoke, and stake on an agent
- `/dashboard` → Manage your deployed agents
- `/create` → Register a new agent

Features:
- Wallet Connect
- On-chain interactions via Somnia testnet
- Simple “invoke agent” call flow with live output

## Data & Flow Summary
- **Browse**: User connects wallet and browses agents
- **Invoke**: Select agent → invoke with SOMI payment
- **Execute**: Contract logs event → AI Router executes off-chain task
- **Settle**: Result returned → task completion confirmed → funds released to agent creator
- **Curate**: Stakers and curators earn rewards via `AgentRevenueVault`

## Monetization & Tokenomics
- **Transaction Fees**: Small % (2–5%) from each agent call goes to protocol vault
- **Staking Rewards**: Users stake SOMI to support high-performing agents
- **Agent Boosting**: Developers pay small SOMI fee to boost visibility
- **Subscriptions (Future)**: Power users buy bundles of agent credits
- **SDK/API Access (Future)**: Third parties integrate AgentFi agent registry into dApps
- **Future Token: `$AGENT`**: Used for staking, ranking, and governance; protocol performs SOMI→$AGENT buybacks from marketplace fees

## Why It Wins
- **Ecosystem Fit**: Directly aligned with Somnia’s mission to build on-chain AI agents
- **Leverage**: Platform-of-platforms; every agent built on Somnia plugs into AgentFi
- **Completeness**: Simple MVP (registry + invoke) fully demo-able
- **Network Effects**: More agents → more users → more fees → more agents
- **Scalability**: Easy to extend post-hackathon with token and SDK
- **Low Overhead**: No AI training needed — only smart contracts + frontend + router

## Tech Stack Summary
- **Smart Contracts**: Solidity + Hardhat (Somnia Testnet)
- **Frontend**: Next.js 14 + Tailwind + Wagmi + RainbowKit
- **Off-chain Execution**: FastAPI or Next.js API route
- **Database**: Prisma (SQLite for local or Neon for Postgres)
- **Hosting**: Vercel (Frontend) + Somnia RPC + testnet faucet
- **AI API**: OpenAI or Replicate (free-tier or mocked)

## MVP Demo Flow
- Deploy all contracts on Somnia testnet
- Register a sample agent (e.g., “AI DeFi Analyzer”)
- Invoke the agent with on-chain SOMI payment
- Display AI-generated output in the UI
- Stake SOMI on that agent to boost its rank
- Show leaderboard updating in real time

## Vision
AgentFi is not just a dApp — it’s the economic layer for autonomous agents on Somnia. It allows agents to earn, evolve, and collaborate in a decentralized ecosystem. By building the marketplace instead of a single agent, you enable the entire AI × Web3 economy to scale.

> “We built the platform where every future Somnia AI agent will live and earn.”

## Paste-ready summary line
AgentFi — The on-chain marketplace for autonomous AI agents on Somnia. Deploy, discover, rent, and stake AI agents — the economic layer powering decentralized intelligence.
