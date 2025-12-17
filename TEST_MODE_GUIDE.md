# 🧪 Test Mode Usage Guide

## ✅ Test Mode Enabled

The contract has test mode enabled, and you can now **bypass the 24-hour submission limit** for convenient development and testing.

## 📊 Current Status

- **Contract Address**: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`
- **Test Mode**: ✅ Enabled
- **Network**: Localhost (ChainId: 31337)

## 🚀 Usage

### Method 1: Direct Submission (Recommended)

After test mode is enabled, you can **submit scores multiple times directly** without waiting 24 hours:

1. Open the frontend application
2. Navigate to the "Submit Score" page
3. Fill in the score and submit
4. **You can submit again immediately** without encountering the "Only one submission per day" error

### Method 2: Reset User Submit Time

If you have already submitted before and want to reset the time limit, you can use the reset script:

```bash
cd road-safety-contracts
npx hardhat run scripts/reset-user-time.ts --network localhost <your-wallet-address>
```

**Example**:
```bash
npx hardhat run scripts/reset-user-time.ts --network localhost 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
```

## 🔧 Managing Test Mode

### Enable Test Mode

```bash
cd road-safety-contracts
npx hardhat run scripts/enable-test-mode.ts --network localhost
```

### Disable Test Mode

If you need to disable test mode (restore production environment restrictions), you can modify the script:

```typescript
// In enable-test-mode.ts
await contract.setTestMode(false);  // Change to false
```

Then run:
```bash
npx hardhat run scripts/enable-test-mode.ts --network localhost
```

## 📝 New Contract Features

### New Functions

1. **`setTestMode(bool _enabled)`**
   - Function: Enable/disable test mode
   - Permission: Admin only (deployer)
   - Purpose: Control whether to allow bypassing time restrictions

2. **`resetUserSubmitTime(address user)`**
   - Function: Reset the submit time for a specified user
   - Permission: Admin only (deployer), and test mode must be enabled
   - Purpose: Clear the user's `lastSubmitTime` to allow immediate submission

3. **`testMode()`** (public view)
   - Function: Query test mode status
   - Returns: `bool` - true indicates test mode is enabled

4. **`admin()`** (public view)
   - Function: Query admin address
   - Returns: `address` - Admin address (deployer)

## ⚠️ Important Notes

### Security Tips

1. **Development and Testing Only**
   - Test mode should only be used in local development environments
   - **Do not enable test mode in production environments**

2. **Admin Permissions**
   - Only the deployer account can manage test mode
   - Deployer address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Hardhat default account)

3. **Data Integrity**
   - In test mode, consecutive days statistics still work normally
   - However, frequent submissions may affect statistical accuracy

### Production Environment

When deploying to production:
1. Ensure test mode is set to `false`
2. Remove or restrict access to admin functions
3. Use timelock or multisig to manage test mode toggle

## 🐛 Troubleshooting

### Issue 1: Still Getting "Only one submission per day"

**Possible Causes**:
- Test mode is not enabled
- Wrong contract address is being used

**Solution**:
```bash
# Check test mode status
npx hardhat console --network localhost
> const contract = await ethers.getContractAt("RoadSafetyTrack", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9")
> await contract.testMode()
# Should return true

# If it returns false, re-enable it
> npx hardhat run scripts/enable-test-mode.ts --network localhost
```

### Issue 2: Cannot Reset User Time

**Possible Causes**:
- Test mode is not enabled
- Non-admin account is being used

**Solution**:
1. Ensure test mode is enabled
2. Use the deployer account to execute the script

### Issue 3: Frontend Shows Old Contract Address

**Solution**:
```bash
cd road-safety-frontend
npm run genabi
# Refresh the browser page
```

## 📋 Quick Command Reference

```bash
# Enable test mode
npx hardhat run scripts/enable-test-mode.ts --network localhost

# Reset user submit time
npx hardhat run scripts/reset-user-time.ts --network localhost <user-address>

# Check test mode status
npx hardhat console --network localhost
> const contract = await ethers.getContractAt("RoadSafetyTrack", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9")
> await contract.testMode()

# View admin address
> await contract.admin()
```

## 🎯 Test Scenarios

### Scenario 1: Quick Test Multiple Submissions

1. Enable test mode ✅ (Already done)
2. Submit the first score on the frontend
3. Immediately submit the second score (should succeed)
4. Continue submitting multiple scores to test functionality

### Scenario 2: Test Consecutive Days Feature

1. Submit the first score (consecutive days = 1)
2. Immediately submit the second score (consecutive days = 2)
3. Verify that consecutive days are correctly incremented

### Scenario 3: Test Trend Analysis

1. Submit multiple records with different scores
2. Navigate to the "Trend Analysis" page
3. Verify that trend calculations are correct

## 📞 Need Help?

If you encounter issues, please check:
1. Is the Hardhat node running (port 8545)
2. Is the contract correctly deployed
3. Is the frontend ABI updated
4. Is MetaMask connected to the correct network

---

**Test mode is enabled, you can now test freely!** 🎉

*Last updated: December 9, 2024*
