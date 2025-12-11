import { useState } from 'react'
import { ethers } from 'ethers'
import { RoadSafetyTrackABI, RoadSafetyTrackAddresses } from '../abi'

interface SubmitProps {
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

export default function Submit({ wallet, fhevm }: SubmitProps) {
  const [score, setScore] = useState<number>(85)
  const [mileageLevel, setMileageLevel] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  const getContract = () => {
    if (!wallet.chainId || !wallet.signer) return null
    const chainIdStr = wallet.chainId.toString()
    const address = RoadSafetyTrackAddresses[chainIdStr as keyof typeof RoadSafetyTrackAddresses]
    if (!address || address.address === ethers.ZeroAddress) return null
    return new ethers.Contract(address.address, RoadSafetyTrackABI.abi, wallet.signer)
  }

  const submitScore = async () => {
    if (!fhevm.instance || !wallet.signer) {
      setMessage({ type: 'error', text: 'FHEVM not ready or wallet not connected' })
      return
    }

    if (score < 0 || score > 100) {
      setMessage({ type: 'error', text: 'Score must be between 0-100' })
      return
    }

    setIsSubmitting(true)
    setMessage({ type: 'info', text: 'Encrypting your score data...' })

    try {
      const contract = getContract()
      if (!contract) {
        setMessage({ type: 'error', text: 'Contract not deployed on current network' })
        return
      }

      const contractAddress = await contract.getAddress()
      const userAddress = await wallet.signer.getAddress()

      // Create encrypted input
      const input = fhevm.instance.createEncryptedInput(contractAddress, userAddress)
      input.add32(score)
      const enc = await input.encrypt()

      setMessage({ type: 'info', text: 'Submitting to blockchain...' })
      
      // Submit transaction
      const tx = await contract.submitScore(enc.handles[0], enc.inputProof, mileageLevel)
      
      setMessage({ type: 'info', text: `Transaction submitted, hash: ${tx.hash.slice(0, 10)}...` })

      // Wait for confirmation
      await tx.wait()
      
      setMessage({ type: 'success', text: '✅ Score submitted successfully! Your data has been securely stored on-chain.' })
      
      // Reset form (optional)
      // setScore(85)
      // setMileageLevel(1)
    } catch (error: any) {
      console.error('Submit error:', error)
      setMessage({ type: 'error', text: `Submission failed: ${error.message || 'Unknown error'}` })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🌟'
    if (score >= 70) return '😊'
    if (score >= 50) return '😐'
    return '😟'
  }

  const getMileageInfo = (level: number) => {
    const info = [
      { icon: '❓', name: 'Unknown', desc: 'Unspecified mileage' },
      { icon: '🏙️', name: 'Short (0-20km)', desc: 'Urban short commute' },
      { icon: '🛣️', name: 'Medium (20-50km)', desc: 'Cross-regional travel' },
      { icon: '🌄', name: 'Long (50km+)', desc: 'Long-distance driving' },
    ]
    return info[level] || info[0]
  }

  if (!wallet.isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Please Connect Wallet</h2>
          <p className="text-gray-600">Connect your wallet to submit scores</p>
        </div>
      </div>
    )
  }

  const contractAvailable = getContract() !== null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl">
            📝
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Submit Driving Score</h1>
            <p className="text-gray-600">Your data will be securely stored on-chain with fully homomorphic encryption</p>
          </div>
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

      {/* Submission Form */}
      {contractAvailable && (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="space-y-6">
            {/* Safety Score */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Safety Score (0-100)
              </label>
              
              {/* Score Display */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-4 text-center">
                <div className="text-6xl mb-2">{getScoreEmoji(score)}</div>
                <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
                  {score}
                </div>
                <div className="text-gray-600 mt-2">
                  {score >= 90 ? 'Excellent!' : score >= 70 ? 'Good' : score >= 50 ? 'Pass' : 'Needs Improvement'}
                </div>
              </div>

              {/* Score Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${score}%, #e5e7eb ${score}%, #e5e7eb 100%)`
                }}
              />
              
              {/* Score Scale */}
              <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>

              {/* Number Input */}
              <div className="mt-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-center text-2xl font-bold"
                />
              </div>
            </div>

            {/* Mileage Level */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Mileage Level
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((level) => {
                  const info = getMileageInfo(level)
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setMileageLevel(level)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        mileageLevel === level
                          ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                      }`}
                    >
                      <div className="text-3xl mb-2">{info.icon}</div>
                      <div className={`font-semibold text-sm ${
                        mileageLevel === level ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {info.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{info.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🔐</span>
                <div>
                  <h4 className="font-semibold text-green-800 mb-1">Privacy Protection</h4>
                  <p className="text-sm text-green-700">
                    Your score data will be encrypted using FHEVM fully homomorphic encryption technology before being stored on-chain.
                    Even on the blockchain, data remains encrypted at all times, only you can decrypt and view it.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={submitScore}
              disabled={isSubmitting || fhevm.status !== 'ready'}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                isSubmitting || fhevm.status !== 'ready'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </span>
              ) : fhevm.status !== 'ready' ? (
                'FHEVM Not Ready'
              ) : (
                'Submit Score'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Message Prompt */}
      {message && (
        <div className={`rounded-xl p-6 border-2 ${
          message.type === 'success' ? 'bg-green-50 border-green-200' :
          message.type === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <p className={`font-medium ${
            message.type === 'success' ? 'text-green-800' :
            message.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Tips */}
      {contractAvailable && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center space-x-2">
            <span>💡</span>
            <span>Tips</span>
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• You can only submit one score every 24 hours</li>
            <li>• Continuous submissions increase "consecutive days" statistics</li>
            <li>• Higher scores indicate safer driving</li>
            <li>• View data in "History" and "Trend Analysis" after submission</li>
          </ul>
        </div>
      )}
    </div>
  )
}
