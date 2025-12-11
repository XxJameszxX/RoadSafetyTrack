import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useWallet } from './hooks/useWallet'
import { useFhevm } from './fhevm/useFhevm'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Submit from './pages/Submit'
import History from './pages/History'
import Analytics from './pages/Analytics'
import './App.css'

function App() {
  const wallet = useWallet();
  const [isMockMode] = useState(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const fhevm = useFhevm({
    provider: wallet.provider,
    chainId: wallet.chainId,
    enabled: wallet.isConnected,
    initialMockChains: isMockMode ? { 31337: "http://localhost:8545" } : undefined,
  });

  return (
    <Router>
      <Layout wallet={wallet} fhevm={fhevm}>
        <Routes>
          <Route path="/" element={<Dashboard wallet={wallet} fhevm={fhevm} />} />
          <Route path="/submit" element={<Submit wallet={wallet} fhevm={fhevm} />} />
          <Route path="/history" element={<History wallet={wallet} fhevm={fhevm} />} />
          <Route path="/analytics" element={<Analytics wallet={wallet} fhevm={fhevm} />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App

