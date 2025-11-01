import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { charities } from '../lib/charities';
import BottomNav from '../components/BottomNav';
import TransferNft from './TransferNft';
import Toast from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { hooks } from '../lib/connectors';
import { contractAddress } from '../lib/utils'

// --- On-Chain Imports ---
import { ethers, Contract } from "ethers";
import axios from "axios";

// --- On-Chain Constants (from find-all-1155.ts) ---
// 這是 Zircuit 測試網上的 RWA Hackathon NFT
const rpcUrl = "https://zircuit-garfield.liquify.com"; // Fallback provider
const staticProvider = new ethers.JsonRpcProvider(rpcUrl);

const erc1155Abi = [
  // --- Functions ---
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function uri(uint256 id) view returns (string)",
  "function getTokenTypeData(uint256 tokenTypeId) view returns (uint8 donationPercent, uint256 poolId, uint256 lotteryDay, bool hasBeenDrawn)",
  // --- Events ---
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)"
];

// --- On-Chain Helper Functions (from find-all-1155.ts) ---
/**
 * 將 IPFS URI 轉換為可訪問的 HTTP Gateway URL
 * @param url IPFS 網址 (e.g., ipfs://QmW...)
 * @returns 可訪問的 URL (e.g., https://ipfs.io/ipfs/QmW...)
 */
function resolveIpfsUrl(url: string): string {
  if (!url || !url.startsWith('ipfs://')) {
    // 如果不是 'ipfs://' 開頭，直接返回原網址
    return url;
  }
  // 使用一個公共的 IPFS 閘道
  return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
}

// 定義 Metadata 的基本結構
interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: any[];
}

// --- React Component ---
const { useAccount, useProvider } = hooks; // Added useProvider

// React UI 所需的 NFT 結構
interface UserNft {
  id: string;
  name: string;
  donationRatio: number;
  invoiceCount: number;
  issueDate: string;
  image: string;
  status: string;
  transferable: boolean;
  poolName?: string; // 新增：公益池名稱
}

const Wallet: React.FC = () => {
  const barcode = localStorage.getItem('userBarcode') || '/ABC123DE';
  const navigate = useNavigate();

  // --- React State ---
  const [userNfts, setUserNfts] = useState<UserNft[]>([]); // Start empty
  const [transferringNftId, setTransferringNftId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [transferredNfts, setTransferredNfts] = useState<string[]>(() => {
    const saved = localStorage.getItem('transferredNfts');
    return saved ? JSON.parse(saved) : [];
  });
  
  // --- Web3 Hooks ---
  const connectedAccount = useAccount();
  const connectedProvider = useProvider(); // Get provider from wallet
  
  // Convert web3-react provider to ethers BrowserProvider if available
  const provider = React.useMemo(() => {
    if (connectedProvider) {
      try {
        // web3-react provider is typically an EIP-1193 provider
        // Wrap it with ethers BrowserProvider for v6 compatibility
        return new ethers.BrowserProvider(connectedProvider as any);
      } catch (e) {
        console.warn('Failed to create BrowserProvider, using static provider', e);
        return staticProvider;
      }
    }
    return staticProvider;
  }, [connectedProvider]);
  
  const fullWalletAddress = (connectedAccount ?? localStorage.getItem('userWalletAddress') ?? '0xAbCdEf123456789012345678901234567890dEaF') as string;
  const truncatedAddress = `${fullWalletAddress.substring(0, 6)}...${fullWalletAddress.substring(fullWalletAddress.length - 4)}`;

  // --- Charity State (unchanged) ---
  const boundCharityId = localStorage.getItem('boundCharityId');
  const defaultCharity = charities.find(c => c.id === 'stray-animal') || charities[0];
  const boundCharity = charities.find(c => c.id === boundCharityId) || defaultCharity;


  // --- On-Chain Fetch Logic (NEW) ---
  const fetchNfts = useCallback(async () => {
    const owner = fullWalletAddress; // Use the wallet address
    
    // Don't fetch if wallet is not connected or is the placeholder address
    if (!owner || !provider || owner.startsWith('0xAbCdEf')) {
      console.log("Wallet not connected or is placeholder, skipping NFT fetch.");
      return;
    }

    console.log(`🔍 正在索引 ERC1155 合約：${contractAddress} for ${owner}`);
    setIsRefreshing(true); // Use this as loading indicator

    try {
      const nftContract = new ethers.Contract(contractAddress, erc1155Abi, provider);
      const allTokenIds = new Set<string>();

      // --- 步驟一：查詢 TransferSingle ---
      console.log("(1/4) 正在查詢 'TransferSingle' 事件 (to: owner)...");
      const transferSingleFilter = nftContract.filters.TransferSingle(null, null, owner);
      const singleEvents = await nftContract.queryFilter(transferSingleFilter, 0, 'latest');
      console.log(`  > 找到 ${singleEvents.length} 筆 'TransferSingle' 紀錄。`);

      for (const event of singleEvents) {
        // Type guard: check if event is EventLog (not just Log)
        if ('args' in event && event.args && event.args.id) {
          allTokenIds.add(event.args.id.toString());
        }
      }

      // --- 步驟二：查詢 TransferBatch ---
      console.log("(2/4) 正在查詢 'TransferBatch' 事件 (to: owner)...");
      const transferBatchFilter = nftContract.filters.TransferBatch(null, null, owner);
      const batchEvents = await nftContract.queryFilter(transferBatchFilter, 0, 'latest');
      console.log(`  > 找到 ${batchEvents.length} 筆 'TransferBatch' 紀錄。`);

      for (const event of batchEvents) {
        // Type guard: check if event is EventLog (not just Log)
        if ('args' in event && event.args && event.args.ids) {
          for (const id of event.args.ids) {
            allTokenIds.add(id.toString());
          }
        }
      }

      if (allTokenIds.size === 0) {
        console.log("❌ 在此合約中，該地址沒有接收過任何 NFT。");
        setUserNfts([]); // Clear list
        setIsRefreshing(false);
        return;
      }

      console.log(`(3/4) 總共找到 ${allTokenIds.size} 個曾經收到過的 Token ID。`);
      console.log(`(4/4) 正在驗證餘額並抓取詳細資料...`);
      const balanceChecks = Array.from(allTokenIds).map(async (id) => {
        try {
          const balance = await nftContract.balanceOf(owner, id);
          
          // 修正：將 0n (BigInt literal) 更改為 BigInt(0)
          // 這是為了與 "es2015" build target 相容
          if (balance > BigInt(0)) {
            // 使用 getTokenTypeData 獲取詳細資料
            try {
              const tokenData = await nftContract.getTokenTypeData(id);
              // tokenData 返回: [donationPercent, poolId, lotteryDay, hasBeenDrawn]
              const donationPercent = Number(tokenData[0]); // uint8
              const poolId = tokenData[1].toString(); // uint256
              const lotteryDay = Number(tokenData[2]); // uint256 (timestamp)
              const hasBeenDrawn = tokenData[3]; // bool
              
              // 將 lotteryDay (timestamp) 轉換為日期字串
              const lotteryDate = new Date(lotteryDay * 1000).toLocaleDateString('en-CA').replace(/-/g, '/');
              
              // 從 charities 查找對應的 pool 名稱
              const poolName = charities.find(c => c.id === poolId)?.name || `Pool #${poolId}`;
              
              return {
                id: id,
                name: `發票 NFT #${id}`,
                donationRatio: donationPercent,
                invoiceCount: Number(balance), // 使用餘額作為發票數量
                issueDate: lotteryDate,
                image: '/nft-placeholder.png', // 可以根據 poolId 設定不同圖片
                status: hasBeenDrawn ? '已開獎 🎉' : '已上鏈 ✅',
                transferable: !hasBeenDrawn, // 已開獎的不可轉移
                poolName: poolName,
              };
            } catch (dataError: any) {
              console.warn(`  > 警告: 無法獲取 ID ${id} 的 token data - 錯誤: ${dataError.message}`);
              // 如果 getTokenTypeData 失敗，返回基本資訊
              return {
                id: id,
                name: `發票 NFT #${id}`,
                donationRatio: 0,
                invoiceCount: Number(balance),
                issueDate: new Date().toLocaleDateString('en-CA').replace(/-/g, '/'),
                image: '/nft-placeholder.png',
                status: '已上鏈 ✅',
                transferable: true,
              };
            }
          }
        } catch (e) {
          return null;
        }
        return null;
      });
      
      const results = await Promise.all(balanceChecks);
      const currentlyOwned = results.filter(item => item !== null) as UserNft[];

      console.log("✅ 查詢完畢！");
      setUserNfts(currentlyOwned);

    } catch (error: any) {
      console.error("❌ 查詢失敗：", error.message);
      setToastMessage(`查詢 NFT 失敗`);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    } finally {
      setIsRefreshing(false);
    }
  }, [provider, fullWalletAddress]); // Dependencies


  // --- Event Handlers ---
  
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

  const handleTransferSuccess = () => {
    if (!transferringNftId) return;
    const newTransferred = [...transferredNfts, transferringNftId];
    setTransferredNfts(newTransferred);
    localStorage.setItem('transferredNfts', JSON.stringify(newTransferred));
    setTransferringNftId(null);
  };
  
  const handleRefreshWallet = () => {
    // This button now *only* fetches from chain
    fetchNfts();

    // Reset transfer status
    setTransferredNfts([]);
    localStorage.removeItem('transferredNfts');
  };

  // --- useEffect (NEW) ---
  // Fetch NFTs on component mount
  useEffect(() => {
    // Only fetch if provider and account are available
    if (provider && fullWalletAddress && !fullWalletAddress.startsWith('0xAbCdEf')) {
      fetchNfts();
    }
  }, [fetchNfts, provider, fullWalletAddress]); // Rerun if account or provider changes


  // --- JSX (Render) ---
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
              {userNfts.length > 0 ? (
                userNfts.map((nft, index) => {
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
                              <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">{nft.poolName || nft.name}・捐出 {nft.donationRatio}%</p>
                              {/* 修正：將打錯的 </Gala> 標籤修正為 </p> */}
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
                })
              ) : (
                <div className="bg-component-bg-light dark:bg-component-bg-dark p-4 text-center">
                  <p className="text-subtle-light dark:text-subtle-dark">
                    {isRefreshing ? '正在讀取...' : '目前沒有公益憑證。'}
                  </p>
                </div>
              )}
            </div>
            
            {/* REMOVED PendingInvoices section */}

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
              {isRefreshing ? '正在從區塊鏈讀取...' : '刷新錢包'}
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

