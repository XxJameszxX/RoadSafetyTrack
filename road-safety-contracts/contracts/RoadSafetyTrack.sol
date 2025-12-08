// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title RoadSafetyTrack - Privacy-Preserving Driving Safety Score On-Chain Contract
/// @notice Uses FHEVM fully homomorphic encryption to protect personal driving behavior privacy
/// @dev All score data is fully encrypted and stored, supporting trend calculation and statistics in encrypted state
contract RoadSafetyTrack is ZamaEthereumConfig {
    /// @notice Safety record structure
    struct SafetyRecord {
        euint32 encScore;      // Encrypted score 0-100
        uint64 timestamp;      // On-chain timestamp
        uint8 mileageLevel;   // Mileage level: 0=unknown, 1=short(0-20km), 2=medium(20-50km), 3=long(50km+)
    }

    /// @notice User statistics information
    struct UserStats {
        euint32 encTotalScore;     // Accumulated total score (for average calculation)
        uint32 recordCount;        // Record count
        uint64 lastSubmitTime;     // Last submission time
        uint16 consecutiveDays;    // Consecutive safe driving days
        euint32 encPreviousScore;  // Previous score (for trend calculation)
        euint32 encScoreDiff;      // Score difference (current - previous, for trend judgment)
        SafetyRecord[] records;    // History record array (retain up to 50 most recent records)
    }

    /// @notice Mapping from user address to statistics information
    mapping(address => UserStats) public userStats;

    /// @notice Maximum number of records to retain
    uint8 public constant MAX_RECORDS = 50;

    /// @notice Daily submission interval (seconds)
    uint256 public constant SUBMIT_INTERVAL = 86400; // 24 hours

    /// @notice Test mode: allows bypassing time restrictions (for development and testing only)
    bool public testMode = false;

    /// @notice Admin address (for enabling/disabling test mode)
    address public admin;

    /// @notice Test mode toggle event
    event TestModeToggled(bool enabled);

    /// @notice Constructor
    constructor() {
        admin = msg.sender;
    }

    /// @notice Toggle test mode (admin only)
    function setTestMode(bool _enabled) external {
        require(msg.sender == admin, "Only admin");
        testMode = _enabled;
        emit TestModeToggled(_enabled);
    }

    /// @notice Reset user submission time (test mode only)
    /// @param user User address to reset
    function resetUserSubmitTime(address user) external {
        require(testMode, "Test mode not enabled");
        require(msg.sender == admin, "Only admin");
        userStats[user].lastSubmitTime = 0;
    }

    /// @notice Score submission event
    event ScoreSubmitted(
        address indexed user,
        uint64 timestamp,
        uint8 mileageLevel
    );

    /// @notice Consecutive days update event
    event ConsecutiveDaysUpdated(
        address indexed user,
        uint16 consecutiveDays
    );

    /// @notice Submit driving safety score
    /// @param encScore Encrypted score value (0-100)
    /// @param inputProof Input proof
    /// @param mileageLevel Mileage level (0=unknown, 1=short, 2=medium, 3=long)
    function submitScore(
        externalEuint32 encScore,
        bytes calldata inputProof,
        uint8 mileageLevel
    ) external {
        // 1. Verify and convert external encrypted input
        euint32 encryptedScore = FHE.fromExternal(encScore, inputProof);

        // 2. Verify mileage level range
        require(mileageLevel <= 3, "Invalid mileage level");

        // 3. Check daily submission limit (skip in test mode)
        UserStats storage stats = userStats[msg.sender];
        if (stats.lastSubmitTime > 0 && !testMode) {
            require(
                block.timestamp - stats.lastSubmitTime >= SUBMIT_INTERVAL,
                "Only one submission per day"
            );
        }

        // 4. Update accumulated total score (for average calculation)
        if (stats.recordCount == 0) {
            // First submission, assign directly
            stats.encTotalScore = encryptedScore;
        } else {
            // Accumulate
            stats.encTotalScore = FHE.add(stats.encTotalScore, encryptedScore);
        }

        // 5. Calculate trend difference (current score - previous score)
        if (stats.recordCount > 0) {
            // Calculate difference: current - previous
            // If difference > 0, indicates improvement; < 0 indicates decline; = 0 indicates no change
            stats.encScoreDiff = FHE.sub(encryptedScore, stats.encPreviousScore);
        } else {
            // First submission, difference is 0 (encrypted)
            stats.encScoreDiff = FHE.sub(encryptedScore, encryptedScore);
        }

        // 6. Update record count
        stats.recordCount++;

        // 7. Update consecutive days
        if (stats.lastSubmitTime == 0) {
            // First submission
            stats.consecutiveDays = 1;
        } else {
            uint256 timeDiff = block.timestamp - stats.lastSubmitTime;
            if (timeDiff < SUBMIT_INTERVAL + 3600) {
                // Submit within 25 hours, considered consecutive
                stats.consecutiveDays++;
            } else {
                // Exceed 25 hours, reset consecutive days
                stats.consecutiveDays = 1;
            }
        }

        // 8. Add new record
        stats.records.push(SafetyRecord({
            encScore: encryptedScore,
            timestamp: uint64(block.timestamp),
            mileageLevel: mileageLevel
        }));

        // 9. Limit record count (retain most recent MAX_RECORDS)
        if (stats.records.length > MAX_RECORDS) {
            // Remove oldest records (simplified implementation: only retain indices 0 to MAX_RECORDS-1)
            // Note: Solidity array deletion operations are expensive, consider circular queue in practice
            for (uint256 i = 0; i < stats.records.length - MAX_RECORDS; i++) {
                delete stats.records[i];
            }
        }

        // 10. Update previous score and timestamp
        stats.encPreviousScore = encryptedScore;
        stats.lastSubmitTime = uint64(block.timestamp);

        // 11. ACL authorization - allow contract and user to access encrypted data
        FHE.allowThis(encryptedScore);
        FHE.allowThis(stats.encTotalScore);
        FHE.allowThis(stats.encScoreDiff);
        FHE.allowThis(stats.encPreviousScore);
        
        // Authorize user to decrypt
        FHE.allow(encryptedScore, msg.sender);
        FHE.allow(stats.encTotalScore, msg.sender);
        FHE.allow(stats.encScoreDiff, msg.sender);
        FHE.allow(stats.encPreviousScore, msg.sender);

        emit ScoreSubmitted(msg.sender, uint64(block.timestamp), mileageLevel);
        
        if (stats.consecutiveDays > 1) {
            emit ConsecutiveDaysUpdated(msg.sender, stats.consecutiveDays);
        }
    }

    /// @notice Get trend difference (encrypted)
    /// @param user User address
    /// @return Encrypted score difference (>0 improvement, <0 decline, =0 no change)
    /// @dev Requires at least 2 records to calculate trend
    function getTrend(address user) external view returns (euint32) {
        UserStats storage stats = userStats[user];
        require(stats.recordCount >= 2, "Insufficient records for trend");
        return stats.encScoreDiff;
    }

    /// @notice Get accumulated value and count (for frontend to calculate average)
    /// @param user User address
    /// @return encTotal Encrypted accumulated total score
    /// @return count Record count
    function getAverageData(address user) external view returns (euint32 encTotal, uint32 count) {
        UserStats storage stats = userStats[user];
        return (stats.encTotalScore, stats.recordCount);
    }

    /// @notice Get latest record
    /// @param user User address
    /// @return Latest safety record
    function getLatestRecord(address user) external view returns (SafetyRecord memory) {
        UserStats storage stats = userStats[user];
        require(stats.records.length > 0, "No records");
        return stats.records[stats.records.length - 1];
    }

    /// @notice Get user statistics (plaintext portion)
    /// @param user User address
    /// @return recordCount Record count
    /// @return consecutiveDays Consecutive days
    /// @return lastSubmitTime Last submission time
    function getUserStats(address user) external view returns (
        uint32 recordCount,
        uint16 consecutiveDays,
        uint64 lastSubmitTime
    ) {
        UserStats storage stats = userStats[user];
        return (stats.recordCount, stats.consecutiveDays, stats.lastSubmitTime);
    }

    /// @notice Get record count
    /// @param user User address
    /// @return Record count
    function getRecordCount(address user) external view returns (uint256) {
        return userStats[user].records.length;
    }

    /// @notice Get record at specified index (only returns publicly available information)
    /// @param user User address
    /// @param index Record index
    /// @return timestamp Timestamp
    /// @return mileageLevel Mileage level
    /// @return encScore Encrypted score (requires authorization to decrypt)
    function getRecord(address user, uint256 index) external view returns (
        uint64 timestamp,
        uint8 mileageLevel,
        euint32 encScore
    ) {
        UserStats storage stats = userStats[user];
        require(index < stats.records.length, "Index out of bounds");
        SafetyRecord storage record = stats.records[index];
        return (record.timestamp, record.mileageLevel, record.encScore);
    }
}

