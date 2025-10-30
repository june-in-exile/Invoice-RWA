import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { nfts as initialNfts } from '../lib/nfts';
import { charities } from '../lib/charities';
import BottomNav from '../components/BottomNav';
import TransferNft from './TransferNft';
import Toast from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { hooks } from '../lib/connectors';

const { useAccount } = hooks;

const Wallet: React.FC = () => {
  const barcode = localStorage.getItem('userBarcode') || '/ABC123DE';
  const navigate = useNavigate();
  const [transferringNftId, setTransferringNftId] = useState<string | null>(null);
  const [userNfts, setUserNfts] = useState(initialNfts);

  const [transferredNfts, setTransferredNfts] = useState<string[]>(() => {
    const saved = localStorage.getItem('transferredNfts');
    return saved ? JSON.parse(saved) : [];
  });

  const [pendingInvoices, setPendingInvoices] = useState([
    { id: 'AB-12345678', date: '2025 / 09 / 10' },
    { id: 'CD-87654321', date: '2025 / 09 / 08' },
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showCopyToast, setShowCopyToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Prefer the connected account from web3-react v8 hooks
  const connectedAccount = useAccount();
  // Also allow fallback to any stored address in localStorage (set elsewhere) or a default placeholder
  const fullWalletAddress = (connectedAccount ?? localStorage.getItem('userWalletAddress') ?? '0xAbCdEf123456789012345678901234567890dEaF') as string;
  const truncatedAddress = `${fullWalletAddress.substring(0, 6)}...${fullWalletAddress.substring(fullWalletAddress.length - 4)}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(fullWalletAddress).then(() => {
      setToastMessage('已成功複製地址');
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    }).catch(() => {
      setToastMessage('複製失敗');
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    });
  };


  const boundCharityId = localStorage.getItem('boundCharityId');
  const defaultCharity = charities.find(c => c.id === 'stray-animal') || charities[0];
  const boundCharity = charities.find(c => c.id === boundCharityId) || defaultCharity;

  const handleTransferSuccess = () => {
    if (!transferringNftId) return;
    const newTransferred = [...transferredNfts, transferringNftId];
    setTransferredNfts(newTransferred);
    localStorage.setItem('transferredNfts', JSON.stringify(newTransferred));
    setTransferringNftId(null);
  };

  const handleRefreshWallet = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // "Mint" new NFTs from pending invoices
      const newNfts = pendingInvoices.map((invoice, index) => ({
        id: `M${Date.now() + index}`,
        name: boundCharity.name,
        donationRatio: 100,
        invoiceCount: 1,
        issueDate: new Date().toLocaleDateString('en-CA').replace(/-/g, '/'),
        image: boundCharity.image,
        status: '已上鏈 ✅',
        transferable: true,
      }));

      setUserNfts(prevNfts => [...newNfts, ...prevNfts]);
      setPendingInvoices([]);

      // Reset transfer status
      setTransferredNfts([]);
      localStorage.removeItem('transferredNfts');

      setIsRefreshing(false);
    }, 2000);
  };


  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden pb-24">
      <header className="sticky top-0 z-10 flex items-center bg-component-bg-light dark:bg-component-bg-dark p-4 pb-3 justify-between shadow-sm">
        <div className="flex size-8 shrink-0 items-center justify-center"></div>
        <h1 className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">我的錢包 👛</h1>
        <div className="flex size-8 shrink-0 items-center justify-center"></div>
      </header>
      <main className="flex-1">
        <div className="p-4 space-y-4">
          <div className="flex flex-col items-center justify-start rounded-xl bg-component-bg-light dark:bg-component-bg-dark p-4 shadow-sm">
            <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal mb-2 self-start">我的手機載具</p>
            <img
              className="w-full max-w-sm"
              alt="Carrier Barcode"
              src={`https://barcode.tec-it.com/barcode.ashx?data=${barcode}&code=Code128&translate-esc=on`}
            />
            <p className="text-text-light dark:text-text-dark text-xl font-mono font-medium leading-tight mt-2 tracking-widest">{barcode}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-subtle-light dark:text-subtle-dark hover:text-primary dark:hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-base">cached</span>
              <span>更換手機載具</span>
            </button>
          </div>

          <div className="flex flex-col items-stretch justify-start rounded-xl bg-component-bg-light dark:bg-component-bg-dark p-4 shadow-sm">
            <div className="flex w-full items-start gap-3">
              <img className="h-8 w-auto" alt="imToken logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcnQRwRmvXXigXYp-14vq4CZ4nB0k-r1ZlwK8OojlN1CkTks0zs7w8S9HG8otCPjuATDgFopFw7jx1M7gcdFKzNx665MAjTLy0xMyL5ng6sbOVP72cKOOfyz3ww28NWqNVJ7qA13A7gdOC7-PMPChTmgAim10nL9v5aMjJHOpv5hI0t9BDR9UHwr5SAb4gPYtI7yrHszBYHXayiQ699vzKE6_TE78jmUJZCKNITioaOQFd1qJwXK_5LCdsL_ndwxhNX59e5JOUzYlq" />
              <div className="flex w-full min-w-0 grow flex-col items-stretch justify-center gap-1">
                <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">錢包地址</p>
                <div className="flex items-center gap-2">
                  <p className="text-text-light dark:text-text-dark text-base font-medium leading-tight truncate">{truncatedAddress}</p>
                  <span onClick={handleCopyAddress} className="material-symbols-outlined text-subtle-light dark:text-subtle-dark cursor-pointer text-xl">content_copy</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 mt-3">
              <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">由 imToken 安全託管</p>
            </div>
          </div>
          <div className="flex flex-col items-stretch justify-start rounded-xl bg-component-bg-light dark:bg-component-bg-dark p-4 shadow-sm">
            <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">目前綁定的公益池</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img className="h-10 w-10 rounded-full object-cover" alt={`${boundCharity.name} Logo`} src={boundCharity.image} />
                <p className="text-text-light dark:text-text-dark text-base font-semibold leading-tight">{boundCharity.name}</p>
              </div>
              <div className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-green-700 dark:text-primary">生效中</div>
            </div>
            <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark">
              <p className="text-subtle-light dark:text-subtle-dark text-sm">目前已捐贈5張發票</p>
            </div>
          </div>
          <div className="flex flex-col items-stretch justify-start rounded-xl bg-component-bg-light dark:bg-component-bg-dark p-4 shadow-sm">
            <div className="flex w-full grow flex-col items-stretch justify-center gap-1">
              <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">目前餘額</p>
              <p className="text-text-light dark:text-text-dark text-2xl font-bold leading-tight tracking-[-0.015em]">30.000 USDT</p>
              <div className="flex items-end gap-3 justify-between mt-2">
                <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">此金額將於開獎後自動入帳.</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em] px-1 pb-2 pt-4">我的公益憑證 🌱</h3>
            <div className="flex flex-col rounded-xl overflow-hidden shadow-sm">
              {userNfts.map((nft, index) => {
                const isTransferred = transferredNfts.includes(nft.id);
                const isDisabled = !nft.transferable || isTransferred;
                return (
                  <React.Fragment key={nft.id}>
                    <div className="bg-component-bg-light dark:bg-component-bg-dark">
                      <div className="flex gap-4 p-4 justify-between items-center">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-12 shrink-0" style={{ backgroundImage: `url("${nft.image}")` }}></div>
                          <div className="flex flex-1 flex-col justify-center gap-0.5 min-w-0">
                            <p className="text-text-light dark:text-text-dark text-base font-medium leading-normal truncate">InvoicePool NFT #{nft.id}</p>
                            <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">{nft.name}・捐出 {nft.donationRatio}%</p>
                            <p className="text-subtle-light dark:text-subtle-dark text-xs font-normal leading-normal">{nft.issueDate.replace(/\//g, ' / ')}</p>
                            <div className="mt-1 inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-primary self-start">{nft.status}</div>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col gap-2 items-center">
                          <Link to={`/certificate/${nft.id}`} className="text-sm font-medium leading-normal text-text-light dark:text-text-dark bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-md">查看</Link>
                          <button
                            onClick={() => setTransferringNftId(nft.id)}
                            disabled={isDisabled}
                            className="text-sm font-medium leading-normal text-text-light dark:text-text-dark bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            轉移
                          </button>
                        </div>
                      </div>
                    </div>
                    {index < userNfts.length - 1 && <hr className="border-t border-border-light dark:border-border-dark/50 mx-4" />}
                  </React.Fragment>
                )
              })}
            </div>
            {pendingInvoices.length > 0 && (
              <div className="mt-4">
                <h4 className="text-text-light dark:text-text-dark text-base font-bold leading-tight px-1 pb-2">未生成NFT的發票</h4>
                <div className="flex flex-col rounded-xl bg-component-bg-light dark:bg-component-bg-dark shadow-sm overflow-hidden">
                  {pendingInvoices.map((invoice, index) => (
                    <div key={invoice.id} className={`p-4 ${index < pendingInvoices.length - 1 ? 'border-b border-border-light dark:border-border-dark/50' : ''}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <p className="text-text-light dark:text-text-dark font-medium">發票號碼 {invoice.id}</p>
                          <p className="text-subtle-light dark:text-subtle-dark text-sm mt-0.5">{invoice.date}</p>
                        </div>
                        <div className="inline-flex items-center rounded-full bg-gray-200 dark:bg-gray-600 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200">待生成</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em] px-1 pb-2 pt-4">交易紀錄 📜</h3>
              <div className="flex flex-col rounded-xl bg-component-bg-light dark:bg-component-bg-dark shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border-light dark:border-border-dark/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">arrow_upward</span>
                      </div>
                      <div className="flex flex-col">
                        <p className="font-medium text-text-light dark:text-text-dark">公益捐贈</p>
                        <p className="text-sm text-subtle-light dark:text-subtle-dark mt-0.5">2025 / 11 / 25</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600 dark:text-red-400">- 20.000 USDT</p>
                      <p className="text-sm text-subtle-light dark:text-subtle-dark mt-0.5">已完成</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-b border-border-light dark:border-border-dark/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400">arrow_downward</span>
                      </div>
                      <div className="flex flex-col">
                        <p className="font-medium text-text-light dark:text-text-dark">獎金入帳</p>
                        <p className="text-sm text-subtle-light dark:text-subtle-dark mt-0.5">2025 / 11 / 25</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600 dark:text-green-400">+ 20.000 USDT</p>
                      <p className="text-sm text-subtle-light dark:text-subtle-dark mt-0.5">已完成</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">arrow_upward</span>
                      </div>
                      <div className="flex flex-col">
                        <p className="font-medium text-text-light dark:text-text-dark">公益捐贈</p>
                        <p className="text-sm text-subtle-light dark:text-subtle-dark mt-0.5">2025 / 09 / 25</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600 dark:text-red-400">- 10.000 USDT</p>
                      <p className="text-sm text-subtle-light dark:text-subtle-dark mt-0.5">已完成</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex flex-col gap-2 max-w-md mx-auto">
            <Link className="w-full text-center text-primary dark:text-primary font-bold py-3 px-4 rounded-xl text-base leading-normal bg-component-bg-light dark:bg-component-bg-dark shadow-sm" to="/winning-result">查看本期中獎結果</Link>
            <button
              onClick={handleRefreshWallet}
              disabled={isRefreshing}
              className="w-full text-white bg-primary dark:bg-primary hover:bg-green-500 dark:hover:bg-green-500 font-bold py-3 px-4 rounded-xl text-base leading-normal disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {isRefreshing && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
              {isRefreshing ? '處理中...' : '刷新錢包'}
            </button>
          </div>
        </div>
      </main>
      <AnimatePresence>
        {transferringNftId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-40"
          >
            <TransferNft
              nftId={transferringNftId}
              onClose={() => setTransferringNftId(null)}
              onTransferSuccess={handleTransferSuccess}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <BottomNav />
      <Toast message={toastMessage} show={showCopyToast} />
    </div>
  );
};
export default Wallet;
