import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { RoadSafetyTrackABI, RoadSafetyTrackAddresses } from '../abi'
import { FhevmDecryptionSignature } from '../fhevm/FhevmDecryptionSignature'
import { GenericStringInMemoryStorage } from '../fhevm/GenericStringStorage'

interface HistoryProps {
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

interface Record {
  timestamp: number
  mileageLevel: number
  score: number | null
  encScore: string
}

export default function History({ wallet, fhevm }: HistoryProps) {
  const [records, setRecords] = useState<Record[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const storage = new GenericStringInMemoryStorage()

  const getContract = () => {
    if (!wallet.chainId || !wallet.signer) return null
    const chainIdStr = wallet.chainId.toString()
    const address = RoadSafetyTrackAddresses[chainIdStr as keyof typeof RoadSafetyTrackAddresses]
    if (!address || address.address === ethers.ZeroAddress) return null
    return new ethers.Contract(address.address, RoadSafetyTrackABI.abi, wallet.signer)
  }

  const loadRecords = async () => {
    if (!wallet.signer || !fhevm.instance) return
    
    setIsLoading(true)
    try {
      const contract = getContract()
      if (!contract) return

      const userAddress = await wallet.signer.getAddress()
      const recordCount = await contract.getRecordCount(userAddress)
      
      const loadedRecords: Record[] = []
      for (let i = 0; i < Number(recordCount); i++) {
        const [timestamp, mileageLevel, encScore] = await contract.getRecord(userAddress, i)
        loadedRecords.push({
          timestamp: Number(timestamp),
          mileageLevel: Number(mileageLevel),
          score: null,
          encScore: encScore,
        })
      }

      setRecords(loadedRecords.reverse()) // Latest first
    } catch (error) {
      console.error('Failed to load records:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const decryptScores = async () => {
    if (!wallet.signer || !fhevm.instance || records.length === 0) return
    
    setIsDecrypting(true)
    try {
      const contract = getContract()
      if (!contract) return

      const contractAddress = await contract.getAddress()
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevm.instance,
        [contractAddress],
        wallet.signer,
        storage
      )

      if (!sig) return

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
            console.error('Decrypt error for record:', error)
            return record
          }
        })
      )

      setRecords(decryptedRecords)
    } catch (error) {
      console.error('Failed to decrypt scores:', error)
    } finally {
      setIsDecrypting(false)
    }
  }

  useEffect(() => {
    if (wallet.isConnected && fhevm.instance) {
      loadRecords()
    }
  }, [wallet.isConnected, fhevm.instance])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getMileageInfo = (level: number) => {
    const info = [
      { icon: '❓', name: 'Unknown', color: 'bg-gray-100 text-gray-700' },
      { icon: '🏙️', name: 'Short', color: 'bg-blue-100 text-blue-700' },
      { icon: '🛣️', name: 'Medium', color: 'bg-purple-100 text-purple-700' },
      { icon: '🌄', name: 'Long', color: 'bg-green-100 text-green-700' },
    ]
    return info[level] || info[0]
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreEmoji = (score: number | null) => {
    if (score === null) return '🔒'
    if (score >= 90) return '🌟'
    if (score >= 70) return '😊'
    if (score >= 50) return '😐'
    return '😟'
  }

  if (!wallet.isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Please Connect Wallet</h2>
          <p className="text-gray-600">Connect your wallet to view history</p>
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
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-3xl">
              📜
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">History</h1>
              <p className="text-gray-600">View your driving safety score history</p>
            </div>
          </div>
          
          {records.length > 0 && records.some(r => r.score === null) && (
            <button
              onClick={decryptScores}
              disabled={isDecrypting}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDecrypting ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Decrypting...</span>
                </span>
              ) : (
                '🔓 Decrypt Scores'
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
      {isLoading && contractAvailable && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading history records...</p>
          </div>
        </div>
      )}

      {/* Record List */}
      {!isLoading && contractAvailable && records.length > 0 && (
        <div className="space-y-4">
          {records.map((record, index) => {
            const mileageInfo = getMileageInfo(record.mileageLevel)
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  {/* Left: Time and Mileage Info */}
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{getScoreEmoji(record.score)}</div>
                    <div>
                      <div className="font-semibold text-gray-800">{formatDate(record.timestamp)}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${mileageInfo.color}`}>
                          {mileageInfo.icon} {mileageInfo.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score */}
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${getScoreColor(record.score)}`}>
                      {record.score !== null ? record.score : '***'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {record.score !== null ? 'points' : 'Encrypted'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && contractAvailable && records.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-lg border border-gray-100 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No History Records</h3>
          <p className="text-gray-600 mb-6">You haven't submitted any driving scores yet</p>
          <a
            href="/submit"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            Submit Score Now
          </a>
        </div>
      )}

      {/* Privacy Notice */}
      {contractAvailable && records.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🔐</span>
            <div>
              <h4 className="font-semibold text-green-800 mb-1">Privacy Protection</h4>
              <p className="text-sm text-green-700">
                All score data is encrypted and stored on the blockchain. Click the "Decrypt Scores" button to view your actual scores.
                Decryption is performed completely locally and will not leak your privacy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Summary */}
      {!isLoading && contractAvailable && records.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-bold text-gray-800 mb-4">📊 Statistics Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">{records.length}</div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {records.filter(r => r.score !== null).length}
              </div>
              <div className="text-sm text-gray-600">Decrypted</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {records.filter(r => r.score !== null && r.score >= 90).length}
              </div>
              <div className="text-sm text-gray-600">Excellent Scores</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {records.filter(r => r.mileageLevel === 3).length}
              </div>
              <div className="text-sm text-gray-600">Long Distance</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
