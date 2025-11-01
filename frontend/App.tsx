import React from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- Web3 Imports ---
import { Web3ReactProvider, Web3ReactHooks, initializeConnector } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';

// --- Page Imports ---
import Onboarding from './pages/Onboarding';
import Charities from './pages/Charities';
import BindPool from './pages/BindPool';
import Wallet from './pages/Wallet';
import Certificate from './pages/Certificate';
import WinningResult from './pages/WinningResult';
import TransactionDetails from './pages/TransactionDetails';
import { MetaMask } from '@web3-react/metamask';
import { Connector } from '@web3-react/types';
import { metaMask, hooks } from './lib/connectors'; // <-- 從新檔案匯入

const connectors: [Connector, Web3ReactHooks][] = [
  [metaMask, hooks],
  // You could add [walletConnect, walletConnectHooks], etc. here
];

// --- getLibrary Function ---
// web3-react 會自動將 connector 提供的 provider (例如 window.ethereum) 傳入
const getLibrary = (provider: any): Web3Provider => {
  const library = new Web3Provider(provider);
  // library.pollingInterval = 12000 // (可選)
  return library;
};

// --- PageWrapper (No changes) ---
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// --- AnimatedRoutes (No changes) ---
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
  <Routes location={location}>
        <Route path="/" element={<PageWrapper><Onboarding /></PageWrapper>} />
        <Route path="/charities" element={<PageWrapper><Charities /></PageWrapper>} />
        <Route path="/bind-pool/:charityId" element={<PageWrapper><BindPool /></PageWrapper>} />
        <Route path="/wallet" element={<PageWrapper><Wallet /></PageWrapper>} />
        <Route path="/certificate/:nftId" element={<PageWrapper><Certificate /></PageWrapper>} />
        <Route path="/winning-result" element={<PageWrapper><WinningResult /></PageWrapper>} />
        <Route path="/transaction-details" element={<PageWrapper><TransactionDetails /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

// --- AutoRedirect: 檢查用戶是否已註冊，如果已註冊且在首頁則跳轉 ---
const AutoRedirect: React.FC = () => {
  const { useIsActive, useAccount } = hooks;
  const isActive = useIsActive();
  const account = useAccount();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const checkUserRegistration = async (walletAddress: string) => {
      try {
        const response = await fetch(`/api/users/${walletAddress}`);
        
        if (response.ok) {
          const result = await response.json();
          // 如果用戶已註冊且目前在首頁，自動跳轉到 charities
          if (result.success && location.pathname === '/') {
            console.log('用戶已註冊，自動跳轉到 charities');
            navigate('/charities');
          }
        }
      } catch (error) {
        console.error('檢查用戶註冊狀態失敗:', error);
      }
    };

    // 只在錢包連接且有 account 時檢查
    if (isActive && account) {
      const walletAddress = (typeof account === 'string' ? account : (account as any)?.address || account) as string;
      if (walletAddress) {
        checkUserRegistration(walletAddress);
      }
    }
  }, [isActive, account, location.pathname, navigate]);

  return null;
};

// --- Updated App Component ---
const App: React.FC = () => {
  return (
    <Web3ReactProvider connectors={connectors}>
      <HashRouter>
        <AutoRedirect />
        <AnimatedRoutes />
      </HashRouter>
    </Web3ReactProvider>
  );
};

export default App;