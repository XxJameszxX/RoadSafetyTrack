import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
  wallet: {
    provider: any
    chainId: number | undefined
    accounts: string[]
    signer: any
    isConnected: boolean
    connect: () => Promise<void>
  }
  fhevm: {
    instance: any
    status: string
    error: Error | undefined
  }
}

export default function Layout({ children, wallet, fhevm }: LayoutProps) {
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Submit Score', path: '/submit', icon: '📝' },
    { name: 'History', path: '/history', icon: '📜' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Top Navigation Bar */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                🚗
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  RoadSafetyTrack
                </h1>
                <p className="text-xs text-gray-500">Privacy-Preserving Driving Safety Score On-Chain</p>
              </div>
            </div>

            {/* Connection Info */}
            <div className="flex items-center space-x-4">
              {wallet.isConnected ? (
                <>
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-700 font-medium">
                      {wallet.accounts[0]?.slice(0, 6)}...{wallet.accounts[0]?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-xs text-blue-600">
                      {wallet.chainId === 31337 ? '🏠 Localhost' : wallet.chainId === 11155111 ? '🌐 Sepolia' : `⚠️ ${wallet.chainId}`}
                    </span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border ${
                    fhevm.status === 'ready' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <span className={`text-xs font-medium ${
                      fhevm.status === 'ready' ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      🔐 FHEVM: {fhevm.status}
                    </span>
                  </div>
                </>
              ) : (
                <button
                  onClick={wallet.connect}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-2">
            <nav className="space-y-2 sticky top-24">
              {navigation.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                      : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md hover:scale-102'
                  }`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-10">
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>Based on FHEVM Fully Homomorphic Encryption · Your Privacy, We Protect 🔒</p>
        </div>
      </footer>
    </div>
  )
}
