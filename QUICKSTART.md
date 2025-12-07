# 🚀 Quick Start Guide

## View the New UI

### Step 1: Start Hardhat Node

```bash
cd road-safety-contracts
npx hardhat node --verbose
```

Keep this terminal running.

### Step 2: Deploy Contract (New Terminal)

```bash
cd road-safety-contracts
npx hardhat deploy --network localhost
```

### Step 3: Generate ABI (New Terminal)

```bash
cd road-safety-frontend
npm run genabi
```

### Step 4: Start Frontend

```bash
cd road-safety-frontend
npm run dev:mock
```

### Step 5: Access the Application

1. Open browser and visit: `http://localhost:5173`
2. Click the "Connect Wallet" button
3. Select localhost network (ChainId: 31337) in MetaMask
4. Start exploring the new multi-page UI!

## 📱 Page Navigation

### 🏠 Dashboard (Home Page)
- View key statistics
- Quick access to all features
- Welcome and guidance information

### 📝 Submit Score
1. Use slider to select score (0-100)
2. Select mileage level
3. Click "Submit Score"
4. Wait for transaction confirmation

### 📜 History
- View all submitted records
- Click "Decrypt Score" to view actual scores
- View statistics summary

### 📈 Trend Analysis
- View score trend charts
- View mileage distribution statistics
- Get intelligent insights and suggestions

## 💡 Usage Tips

1. **Once Per Day**: You can only submit one score every 24 hours
2. **Consecutive Check-in**: Continuous submissions increase "consecutive days"
3. **Privacy Protection**: All data is encrypted on-chain, only you can decrypt
4. **Refresh Data**: Click refresh button on each page to get latest data

## ⚙️ Configure MetaMask

If you're using a fresh Hardhat node:

1. Open MetaMask
2. Add network:
   - Network Name: Localhost
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
3. Import test account (use private key provided by Hardhat)

## 🎨 UI Features Preview

- ✅ Gradient backgrounds and cards
- ✅ Sidebar navigation
- ✅ Responsive design
- ✅ Smooth animations
- ✅ Interactive charts
- ✅ Emoji icons
- ✅ Real-time status feedback
- ✅ Friendly error messages

## 🐛 Troubleshooting?

### Contract Not Deployed
- Ensure Hardhat node is running
- Re-run deployment command
- Run `npm run genabi` to update ABI

### MetaMask Connection Failed
- Check if network is localhost (31337)
- Refresh page and reconnect
- Reset MetaMask account (Settings → Advanced → Reset Account)

### FHEVM Not Ready
- Wait a few seconds for FHEVM to initialize
- Check browser console for error messages
- Refresh page and retry

## 📞 Get Help

View detailed documentation:
- [UI Upgrade Guide](./road-safety-frontend/UI_UPGRADE.md)
- [Main README](./README.md)
- [Contract README](./road-safety-contracts/README.md)
- [Frontend README](./road-safety-frontend/README.md)

---

**Enjoy using it! 🚗✨**
