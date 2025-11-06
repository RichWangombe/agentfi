import "./globals.css";
import Providers from "./providers";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata = {
  title: 'AgentFi Dashboard',
  description: 'Monitor and interact with AgentFi agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-100 dark:bg-gray-900">
      <body className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        <Providers>
          <ToastProvider>
            <div className="min-h-screen flex flex-col">
              <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AgentFi</h1>
                    <div className="flex items-center space-x-4">
                      <w3m-button />
                    </div>
                  </div>
                </div>
              </header>
              <main className="flex-grow">
                <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                  {children}
                </div>
              </main>
              <footer className="bg-white dark:bg-gray-800 shadow-inner">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    © {new Date().getFullYear()} AgentFi. All rights reserved.
                  </p>
                </div>
              </footer>
            </div>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  )
}
