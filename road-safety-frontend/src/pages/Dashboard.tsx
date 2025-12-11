import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { RoadSafetyTrackABI, RoadSafetyTrackAddresses } from '../abi'
import { FhevmDecryptionSignature } from '../fhevm/FhevmDecryptionSignature'
import { GenericStringInMemoryStorage } from '../fhevm/GenericStringStorage'

interface DashboardProps {
  wallet: {
    provider: any
    chainId: number | undefined
    accounts: string[]
    signer: any
    isConnected: boolean
  }
  fhevm: {
    instance: any
    status: string
    error: Error | undefined
  }
}

export default function Dashboard({ wallet, fhevm }: DashboardProps) {
  const [stats, setStats] = useState({
    consecutiveDays: 0,
    recordCount: 0,
    averageScore: null as number | null,
    trend: null as number | null,
    lastSubmitTime: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [isDecrypted, setIsDecrypted] = useState(false)
  const storage = new GenericStringInMemoryStorage()

  const getContract = () => {
    if (!wallet.chainId || !wallet.signer) return null
    const chainIdStr = wallet.chainId.toString()
    const address = RoadSafetyTrackAddresses[chainIdStr as keyof typeof RoadSafetyTrackAddresses]
    if (!address || address.address === ethers.ZeroAddress) return null
    return new ethers.Contract(address.address, RoadSafetyTrackABI.abi, wallet.signer)
  }

  // Load basic data (no decryption needed)
  const loadBasicStats = async () => {
    if (!wallet.signer) return
    
    setIsLoading(true)
    try {
      const contract = getContract()
      if (!contract) return

      const userAddress = await wallet.signer.getAddress()

      // Only get basic statistics that don't need decryption
      const [recordCount, days, lastTime] = await contract.getUserStats(userAddress)

      setStats(prev => ({
        ...prev,
        consecutiveDays: Number(days),
        recordCount: Number(recordCount),
        lastSubmitTime: Number(lastTime),
      }))
    } catch (error) {
      console.error('Failed to load basic stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Decrypt and load encrypted data (requires signature)
  const decryptAndLoadStats = async () => {
    if (!wallet.signer || !fhevm.instance) return
    
    setIsDecrypting(true)
    try {
      const contract = getContract()
      if (!contract) return

      const userAddress = await wallet.signer.getAddress()
      const contractAddress = await contract.getAddress()

      // Get encrypted average score
      let average = null
      if (stats.recordCount > 0) {
        const [encTotal, count] = await contract.getAverageData(userAddress)
        const sig = await FhevmDecryptionSignature.loadOrSign(
          fhevm.instance,
          [contractAddress],
          wallet.signer,
          storage
        )
        if (sig) {
          const totalResult = await fhevm.instance.userDecrypt(
            [{ handle: encTotal, contractAddress }],
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses,
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays
          )
          const total = Number(totalResult[encTotal])
          average = total / Number(count)
        }
      }

      // Get encrypted trend
      let trend = null
      if (stats.recordCount >= 2) {
        const encTrend = await contract.getTrend(userAddress)
        const sig = await FhevmDecryptionSignature.loadOrSign(
          fhevm.instance,
          [contractAddress],
          wallet.signer,
          storage
        )
        if (sig) {
          const trendResult = await fhevm.instance.userDecrypt(
            [{ handle: encTrend, contractAddress }],
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses,
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays
          )
          trend = Number(trendResult[encTrend])
        }
      }

      setStats(prev => ({
        ...prev,
        averageScore: average,
        trend,
      }))
      setIsDecrypted(true)
    } catch (error) {
      console.error('Failed to decrypt stats:', error)
    } finally {
      setIsDecrypting(false)
    }
  }

  // Only load basic data, don't auto-decrypt
  useEffect(() => {
    if (wallet.isConnected) {
      loadBasicStats()
      // Reset decryption state to ensure re-decryption on each page visit
      setIsDecrypted(false)
      setStats(prev => ({
        ...prev,
        averageScore: null,
        trend: null,
      }))
    }
  }, [wallet.isConnected])

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'No records'
    return new Date(timestamp * 1000).toLocaleString('en-US')
  }

  const getTrendIcon = (trend: number | null) => {
    if (trend === null) return '➖'
    if (trend > 0) return '📈'
    if (trend < 0) return '📉'
    return '➖'
  }

  const getTrendText = (trend: number | null) => {
    if (trend === null) return 'No data'
    if (trend > 0) return `Up ${trend} points`
    if (trend < 0) return `Down ${Math.abs(trend)} points`
    return 'Stable'
  }

  const getTrendColor = (trend: number | null) => {
    if (trend === null) return 'text-gray-600'
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (!wallet.isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Please Connect Wallet</h2>
          <p className="text-gray-600">Connect your wallet to view your driving safety data</p>
        </div>
      </div>
    )
  }

  const contractAvailable = getContract() !== null

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome Back! 👋</h1>
            <p className="text-blue-100 text-lg">Let's track your safe driving journey together</p>
          </div>
          <div className="hidden md:block text-8xl opacity-20">🚗</div>
        </div>
      </div>

      {/* Contract Not Deployed Warning */}
      {!contractAvailable && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-lg font-bold text-red-800 mb-1">Contract Not Deployed</h3>
              <p className="text-red-600">
                Contract not deployed on current network (ChainId: {wallet.chainId || 'Unknown'}).
                Please ensure you're connected to localhost (ChainId: 31337) or Sepolia testnet (ChainId: 11155111).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Decryption Prompt Card */}
      {contractAvailable && !isDecrypted && stats.recordCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl">
                🔐
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">Data Encrypted & Protected</h3>
                <p className="text-gray-600">Your score data is encrypted on-chain. Click the button to decrypt and view detailed data</p>
              </div>
            </div>
            <button
              onClick={decryptAndLoadStats}
              disabled={isDecrypting || !fhevm.instance || fhevm.status !== 'ready'}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all shadow-lg whitespace-nowrap ${
                isDecrypting || !fhevm.instance || fhevm.status !== 'ready'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isDecrypting ? (
                <span className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Decrypting...</span>
                </span>
              ) : fhevm.status !== 'ready' ? (
                'FHEVM Not Ready'
              ) : (
                '🔓 Decrypt Data'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Decryption Success Prompt */}
      {contractAvailable && isDecrypted && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">✅</span>
            <p className="text-green-800 font-medium">Data successfully decrypted! You can now view detailed score information.</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {contractAvailable && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Consecutive Days */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-2xl">
                🔥
              </div>
              {isLoading && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Consecutive Days</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.consecutiveDays}</p>
            <p className="text-sm text-gray-500 mt-2">Keep it up! Keep going</p>
          </div>

          {/* Average Score */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-2xl">
                ⭐
              </div>
              {isLoading && (
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Average Score</h3>
            <p className="text-3xl font-bold text-gray-800">
              {isDecrypted && stats.averageScore !== null 
                ? stats.averageScore.toFixed(1) 
                : isDecrypting 
                  ? 'Decrypting...' 
                  : '🔒 Encrypted'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {isDecrypted ? 'Out of 100 points' : 'Click to decrypt'}
            </p>
          </div>

          {/* Trend */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                {getTrendIcon(stats.trend)}
              </div>
              {isLoading && (
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Score Trend</h3>
            <p className={`text-2xl font-bold ${isDecrypted ? getTrendColor(stats.trend) : 'text-gray-400'}`}>
              {isDecrypted 
                ? getTrendText(stats.trend) 
                : isDecrypting 
                  ? 'Decrypting...' 
                  : '🔒 Encrypted'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {isDecrypted ? 'Compared to last time' : 'Click to decrypt'}
            </p>
          </div>

          {/* Total Records */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-2xl">
                📊
              </div>
              {isLoading && (
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Total Records</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.recordCount}</p>
            <p className="text-sm text-gray-500 mt-2">Cumulative submissions</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {contractAvailable && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submit Score Card */}
          <Link to="/submit" className="group">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  📝
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">Submit Today's Score</h3>
                  <p className="text-gray-600">Record your safe driving performance today</p>
                </div>
              </div>
            </div>
          </Link>

          {/* View Analytics Card */}
          <Link to="/analytics" className="group">
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  📈
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">View Trend Analysis</h3>
                  <p className="text-gray-600">Understand your driving habit changes</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Latest Information */}
      {contractAvailable && stats.lastSubmitTime > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <span>ℹ️</span>
            <span>Latest Information</span>
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Last Submission Time</p>
              <p className="text-lg font-semibold text-gray-800">{formatDate(stats.lastSubmitTime)}</p>
            </div>
            <Link
              to="/history"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              View History
            </Link>
          </div>
        </div>
      )}

      {/* Empty State */}
      {contractAvailable && stats.recordCount === 0 && !isLoading && (
        <div className="bg-white rounded-xl p-12 shadow-lg border border-gray-100 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Start Your Safe Driving Journey</h3>
          <p className="text-gray-600 mb-6">Submit your first driving score and start privacy-protected data tracking</p>
          <Link
            to="/submit"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            Submit Score Now
          </Link>
        </div>
      )}
    </div>
  )
}
