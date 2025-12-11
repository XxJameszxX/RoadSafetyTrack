import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { RoadSafetyTrackABI, RoadSafetyTrackAddresses } from '../abi'
import { FhevmDecryptionSignature } from '../fhevm/FhevmDecryptionSignature'
import { GenericStringInMemoryStorage } from '../fhevm/GenericStringStorage'

interface AnalyticsProps {
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

interface ChartDataPoint {
  date: string
  score: number
  mileageLevel: number
}

export default function Analytics({ wallet, fhevm }: AnalyticsProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [stats, setStats] = useState({
    average: null as number | null,
    highest: null as number | null,
    lowest: null as number | null,
    trend: null as number | null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const storage = new GenericStringInMemoryStorage()

  const getContract = () => {
    if (!wallet.chainId || !wallet.signer) return null
    const chainIdStr = wallet.chainId.toString()
    const address = RoadSafetyTrackAddresses[chainIdStr as keyof typeof RoadSafetyTrackAddresses]
    if (!address || address.address === ethers.ZeroAddress) return null
    return new ethers.Contract(address.address, RoadSafetyTrackABI.abi, wallet.signer)
  }

  const loadAnalytics = async () => {
    if (!wallet.signer || !fhevm.instance) return
    
    setIsLoading(true)
    try {
      const contract = getContract()
      if (!contract) return

      const userAddress = await wallet.signer.getAddress()
      const contractAddress = await contract.getAddress()
      const recordCount = await contract.getRecordCount(userAddress)
      
      if (Number(recordCount) === 0) {
        setIsLoading(false)
        return
      }

      // Load all records
      const records = []
      for (let i = 0; i < Number(recordCount); i++) {
        const [timestamp, mileageLevel, encScore] = await contract.getRecord(userAddress, i)
        records.push({
          timestamp: Number(timestamp),
          mileageLevel: Number(mileageLevel),
          encScore: encScore,
        })
      }

      // Decrypt scores
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevm.instance,
        [contractAddress],
        wallet.signer,
        storage
      )

      if (!sig) {
        setIsLoading(false)
        return
      }

      const decryptedRecords = await Promise.all(
        records.map(async (record) => {
          try {
            const result = await fhevm.instance.userDecrypt(
              [{ handle: record.encScore, contractAddress }],
              sig.privateKey,
              sig.publicKey,
              sig.signature,
              sig.contractAddresses,
              sig.userAddress,
              sig.startTimestamp,
              sig.durationDays
            )
            return {
              ...record,
              score: Number(result[record.encScore]),
            }
          } catch (error) {
            return { ...record, score: 0 }
          }
        })
      )

      // Prepare chart data
      const data: ChartDataPoint[] = decryptedRecords.map(record => ({
        date: new Date(record.timestamp * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        score: record.score,
        mileageLevel: record.mileageLevel,
      }))

      setChartData(data)

      // Calculate statistics
      const scores = decryptedRecords.map(r => r.score)
      const average = scores.reduce((a, b) => a + b, 0) / scores.length
      const highest = Math.max(...scores)
      const lowest = Math.min(...scores)
      
      let trend = null
      if (scores.length >= 2) {
        trend = scores[scores.length - 1] - scores[scores.length - 2]
      }

      setStats({ average, highest, lowest, trend })
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (wallet.isConnected && fhevm.instance) {
      loadAnalytics()
    }
  }, [wallet.isConnected, fhevm.instance])

  const getMileageColor = (level: number) => {
    const colors = ['#9CA3AF', '#3B82F6', '#8B5CF6', '#10B981']
    return colors[level] || colors[0]
  }

  const getMileageName = (level: number) => {
    const names = ['Unknown', 'Short', 'Medium', 'Long']
    return names[level] || 'Unknown'
  }

  if (!wallet.isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Please Connect Wallet</h2>
          <p className="text-gray-600">Connect your wallet to view trend analysis</p>
        </div>
      </div>
    )
  }

  const contractAvailable = getContract() !== null

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center text-3xl">
              📈
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Trend Analysis</h1>
              <p className="text-gray-600">Data-driven insights into driving habits</p>
            </div>
          </div>
          
          {chartData.length > 0 && (
            <button
              onClick={loadAnalytics}
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Refreshing...</span>
                </span>
              ) : (
                '🔄 Refresh Data'
              )}
            </button>
          )}
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
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && contractAvailable && chartData.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {!isLoading && contractAvailable && chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Average Score */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-700">Average Score</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-4xl font-bold text-blue-600">
              {stats.average !== null ? stats.average.toFixed(1) : '--'}
            </p>
            <p className="text-sm text-blue-600 mt-2">Overall Performance</p>
          </div>

          {/* Highest Score */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-700">Highest Score</h3>
              <span className="text-2xl">🏆</span>
            </div>
            <p className="text-4xl font-bold text-green-600">
              {stats.highest !== null ? stats.highest : '--'}
            </p>
            <p className="text-sm text-green-600 mt-2">Best Record</p>
          </div>

          {/* Lowest Score */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-orange-700">Lowest Score</h3>
              <span className="text-2xl">📉</span>
            </div>
            <p className="text-4xl font-bold text-orange-600">
              {stats.lowest !== null ? stats.lowest : '--'}
            </p>
            <p className="text-sm text-orange-600 mt-2">Needs Improvement</p>
          </div>

          {/* Trend */}
          <div className={`bg-gradient-to-br rounded-xl p-6 border ${
            stats.trend === null ? 'from-gray-50 to-gray-100 border-gray-200' :
            stats.trend > 0 ? 'from-green-50 to-green-100 border-green-200' :
            stats.trend < 0 ? 'from-red-50 to-red-100 border-red-200' :
            'from-gray-50 to-gray-100 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-medium ${
                stats.trend === null ? 'text-gray-700' :
                stats.trend > 0 ? 'text-green-700' :
                stats.trend < 0 ? 'text-red-700' :
                'text-gray-700'
              }`}>
                Latest Trend
              </h3>
              <span className="text-2xl">
                {stats.trend === null ? '➖' : stats.trend > 0 ? '📈' : stats.trend < 0 ? '📉' : '➖'}
              </span>
            </div>
            <p className={`text-4xl font-bold ${
              stats.trend === null ? 'text-gray-600' :
              stats.trend > 0 ? 'text-green-600' :
              stats.trend < 0 ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {stats.trend !== null ? `${stats.trend > 0 ? '+' : ''}${stats.trend}` : '--'}
            </p>
            <p className={`text-sm mt-2 ${
              stats.trend === null ? 'text-gray-600' :
              stats.trend > 0 ? 'text-green-600' :
              stats.trend < 0 ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {stats.trend === null ? 'No data' :
               stats.trend > 0 ? 'Continuously improving' :
               stats.trend < 0 ? 'Needs attention' :
               'Stable'}
            </p>
          </div>
        </div>
      )}

      {/* Score Trend Chart */}
      {!isLoading && contractAvailable && chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
            <span>📊</span>
            <span>Score Trend Chart</span>
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Safety Score"
                dot={{ fill: '#3B82F6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mileage Distribution Chart */}
      {!isLoading && contractAvailable && chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
            <span>🚗</span>
            <span>Mileage Distribution Statistics</span>
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value, name) => {
                if (name === 'mileageLevel') {
                  return getMileageName(value as number)
                }
                return value
              }} />
              <Legend formatter={(value) => {
                if (value === 'mileageLevel') return 'Mileage Level'
                return value
              }} />
              <Bar 
                dataKey="mileageLevel" 
                fill="#8B5CF6"
                name="Mileage Level"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            {[0, 1, 2, 3].map(level => (
              <div key={level} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: getMileageColor(level) }}
                ></div>
                <span className="text-sm text-gray-600">{getMileageName(level)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && contractAvailable && chartData.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-lg border border-gray-100 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Analytics Data</h3>
          <p className="text-gray-600 mb-6">Submit at least 2 records to view trend analysis</p>
          <a
            href="/submit"
            className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
          >
            Submit Score Now
          </a>
        </div>
      )}

      {/* Intelligent Insights */}
      {!isLoading && contractAvailable && chartData.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <h3 className="font-bold text-purple-800 mb-4 flex items-center space-x-2">
            <span>💡</span>
            <span>Intelligent Insights</span>
          </h3>
          <div className="space-y-2 text-sm text-purple-700">
            {stats.average !== null && stats.average >= 85 && (
              <p>• 🌟 Your average score is excellent, keep maintaining good driving habits!</p>
            )}
            {stats.average !== null && stats.average < 70 && (
              <p>• ⚠️ Consider focusing on safe driving details to improve overall score.</p>
            )}
            {stats.trend !== null && stats.trend > 0 && (
              <p>• 📈 Recent scores show an upward trend, you're continuously improving!</p>
            )}
            {stats.trend !== null && stats.trend < 0 && (
              <p>• 📉 Recent scores have declined, please stay focused.</p>
            )}
            {chartData.filter(d => d.mileageLevel === 3).length > chartData.length * 0.5 && (
              <p>• 🌄 You frequently take long-distance drives, please pay attention to rest and safety.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
