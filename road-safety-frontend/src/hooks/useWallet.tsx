import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

export function useWallet() {
  const [provider, setProvider] = useState<ethers.Eip1193Provider | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();

      setProvider(window.ethereum);
      setChainId(Number(network.chainId));
      setAccounts(accounts);
      setSigner(signer);
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window.ethereum === "undefined") {
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    
    const checkConnection = async () => {
      try {
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          const network = await provider.getNetwork();
          const signer = await provider.getSigner();
          setProvider(window.ethereum);
          setChainId(Number(network.chainId));
          setAccounts(accounts);
          setSigner(signer);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Failed to check connection:", error);
      }
    };

    checkConnection();

    const handleAccountsChanged = (accounts: string[]) => {
      setAccounts(accounts);
      setIsConnected(accounts.length > 0);
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    const ethereum = window.ethereum as any;
    if (ethereum && typeof ethereum.on === 'function') {
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (ethereum && typeof ethereum.removeListener === 'function') {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  return {
    provider,
    chainId,
    accounts,
    signer,
    isConnected,
    connect,
  };
}

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

