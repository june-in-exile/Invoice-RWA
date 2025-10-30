import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// --- v8 Web3 Imports (Added) ---
// 假設你的 connectors.ts 在 'src/' 資料夾中
import { metaMask, hooks } from '../lib/connectors'; 

// 這些 hooks 是從上面匯入的 'hooks' 解構出來的
// 使用 v8 hooks：useIsActive, useAccount 等
const { useIsActive, useAccount } = hooks;

// --- Zircuit 網路參數 (Added) ---
// 這是 Zircuit Testnet 的 EIP-3085 參數
// Chain ID 48899 (十進位) = 0xBF13 (十六進位)
const zircuitTestnetParams = {
  // 使用數字型別以符合 web3-react v8 的 AddEthereumChainParameter 定義
  // 十進位 Chain ID = 48899 (0xBF13)
  chainId: '0xBF02',
  chainName: 'Zircuit Testnet',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://garfield-testnet.zircuit.com'], // 來自 ChainList (Snippet 1.4)
  blockExplorerUrls: [], // 瀏覽器 URL (可選)
};

const Onboarding: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [image, setImage] = useState<File | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const simulatedBarcode = '/DMSL94Z';

  // --- Use v8 Hooks (Added) ---
  // isActive: connection status flag
  // account: connected wallet address (if any)
  const isActive = useIsActive();
  const account = useAccount();

  // --- (原有函數 - 處理載具) ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  const handleManualBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (sanitizedValue.length <= 7) {
      setManualBarcode(sanitizedValue);
    }
  };

  // --- (原有邏輯 - 處理載具) ---
  const isManualInputValid = manualBarcode.trim().length === 7;
  const isUploadValid = image !== null;
  const canStart = (activeTab === 'upload' && isUploadValid) || (activeTab === 'manual' && isManualInputValid);

  // --- "Flow A" (載具登入) 的處理函數 ---
  const handleStart = () => {
    if (!canStart) return;

    let barcodeToStore = '';
    if (activeTab === 'upload') {
      barcodeToStore = simulatedBarcode;
    } else { // activeTab === 'manual'
      barcodeToStore = `/${manualBarcode.trim()}`;
    }

    localStorage.setItem('userBarcode', barcodeToStore);
    localStorage.removeItem('userWalletAddress'); // 確保狀態互斥
    navigate('/charities');
  };

  // --- "Flow B" (錢包登入) 的處理函數 (Added) ---
  const handleConnectWallet = async () => {
    try {
  // 如果已連線或已有 account，就不再重複連線
  if (isActive || account) return alert('錢包已經連上了');

      // 取得 provider（一般情況為 window.ethereum）
      const provider = (window as any).ethereum;
      if (!provider) {
        alert('找不到瀏覽器錢包 (window.ethereum)。請安裝 MetaMask 或使用 WalletConnect。');
        return;
      }

  // 嘗試切換到 Zircuit（hex chainId）或在必要時新增該鏈
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: zircuitTestnetParams.chainId }] });
      } catch (switchError: any) {
        // 4902 or message 包含 Unrecognized/Unknown chain => 該鏈未被加入錢包
        if (switchError?.code === 4902 || (switchError?.message && /(unrecognized|unknown|not added|4902)/i.test(switchError.message))) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: zircuitTestnetParams.chainId,
                chainName: zircuitTestnetParams.chainName,
                nativeCurrency: zircuitTestnetParams.nativeCurrency,
                rpcUrls: zircuitTestnetParams.rpcUrls,
                blockExplorerUrls: zircuitTestnetParams.blockExplorerUrls,
              }],
            });
            // 新增成功後嘗試再切換一次
            await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: zircuitTestnetParams.chainId }] });
          } catch (addErr: any) {
            console.error('add chain failed', addErr);
            alert('新增區塊鏈失敗: ' + (addErr?.message || addErr));
            return;
          }
        } else {
          console.error('switch chain failed', switchError);
          alert('切換網路失敗: ' + (switchError?.message || switchError));
          return;
        }
      }

      // 切換/新增鏈成功，接著啟動 connector（傳入數字 chainId 以符合 type）
      await metaMask.activate(zircuitTestnetParams.chainId);

      // 如果 await 成功，連線就啟動了
      localStorage.removeItem('userBarcode'); // 確保狀態互斥
      navigate('/charities'); // 導航到下一頁

    } catch (err: any) {
      // 錯誤處理
      if (err.message && err.message.includes('user_canceled')) {
        alert('你取消了連線，請重試');
      } else {
        console.error(err);
        alert(`連線失敗: ${err.message || '發生未知錯誤'}`);
      }
    }
  };


  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <main className="flex-grow px-4 pb-8 pt-6">
        <div className="w-full max-w-md mx-auto flex flex-col">
          {/* ... (頂部的 Logo 和標題) ... */}
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white">savings</span>
            </div>
            <span className="text-xl font-bold">Invoice Pool</span>
          </div>
          <h1 className="text-text-light dark:text-text-dark tracking-tight text-[28px] font-bold leading-tight text-center pb-2">
            綁定手機載具，開始你的公益旅程 🌱
          </h1>
          <p className="text-subtle-light dark:text-subtle-dark text-base font-normal leading-normal pb-6 text-center">
            上傳載具截圖或輸入條碼，系統將自動建立你的公益錢包。
          </p>

          {/* ... (Tab 標籤) ... */}
          <div className="pb-3">
            <div className="flex border-b border-border-light dark:border-border-dark justify-between">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
                  activeTab === 'upload'
                    ? 'border-b-primary text-primary'
                    : 'border-b-transparent text-subtle-light dark:text-subtle-dark'
                }`}
              >
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">上傳載具截圖</p>
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
                  activeTab === 'manual'
                    ? 'border-b-primary text-primary'
                    : 'border-b-transparent text-subtle-light dark:text-subtle-dark'
                }`}
              >
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">輸入手機條碼</p>
              </button>
            </div>
          </div>

          {/* ... (Tab: 上傳) ... */}
          {activeTab === 'upload' && (
            <div className="flex flex-col py-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
              />
              {image ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-border-light dark:border-border-dark p-6 bg-component-bg-light dark:bg-component-bg-dark">
                  {/* ... (已上傳圖片 UI) ... */}
                  <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal self-start">您上傳的圖片</p>
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Uploaded screenshot"
                    className="w-full max-w-xs rounded-lg object-contain border border-border-light dark:border-border-dark"
                  />
                  <hr className="w-full border-t border-border-light dark:border-border-dark my-2" />
                  <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal self-start">掃描到的手機載具</p>
                  <img 
                    className="w-full max-w-xs" 
                    alt="Carrier Barcode" 
                    src={`https://barcode.tec-it.com/barcode.ashx?data=${simulatedBarcode}&code=Code128&translate-esc=on`}
                  />
                  <p className="text-text-light dark:text-text-dark text-xl font-mono font-medium leading-tight mt-2 tracking-widest">{simulatedBarcode}</p>
                  <button
                    type="button"
                    onClick={triggerFileUpload}
                    className="mt-2 flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary/20 dark:bg-primary/30 text-primary text-sm font-bold leading-normal tracking-[0.015em]"
                  >
                    <span className="truncate">重新上傳</span>
                  </button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border-light dark:border-border-dark px-6 py-10 bg-component-bg-light dark:bg-component-bg-dark cursor-pointer"
                  onClick={triggerFileUpload}
                >
                  {/* ... (上傳提示 UI) ... */}
                  <span className="material-symbols-outlined text-4xl text-subtle-light dark:text-subtle-dark">
                    photo_camera
                  </span>
                  <div className="flex max-w-[480px] flex-col items-center gap-1">
                    <p className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em] text-center">
                      點擊此處上傳
                    </p>
                    <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal text-center">
                      請上傳您的載具條碼截圖
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary/20 dark:bg-primary/30 text-primary text-sm font-bold leading-normal tracking-[0.015em]"
                  >
                    <span className="truncate">選擇圖片</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ... (Tab: 手動輸入) ... */}
          {activeTab === 'manual' && (
            <div className="flex flex-col py-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-subtle-light dark:text-subtle-dark text-lg font-medium">/</span>
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={handleManualBarcodeChange}
                  placeholder="ABC123D"
                  maxLength={7}
                  className="w-full h-14 pl-8 pr-4 rounded-xl border-2 border-border-light dark:border-border-dark bg-component-bg-light dark:bg-component-bg-dark focus:ring-primary focus:border-primary text-lg font-mono tracking-widest"
                  aria-label="Carrier Barcode Input"
                />
              </div>
              <p className="text-subtle-light dark:text-subtle-dark text-xs mt-2 px-2">請輸入斜線後方的7位英數字元。</p>
            </div>
          )}

          {/* ... (自動建立錢包 UI) ... */}
          <div className="flex flex-col gap-3 p-4 bg-component-bg-light dark:bg-component-bg-dark rounded-xl mt-4">
            <p className="text-text-light dark:text-text-dark text-base font-medium leading-normal">
              系統將自動建立你的公益錢包
            </p>
            <div className="rounded-full bg-border-light dark:bg-border-dark">
              <div className="h-2 rounded-full bg-primary" style={{ width: '100%' }}></div>
            </div>
            <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">
              由 imToken 安全託管
            </p>
          </div>

          {/* --- "綁定已有錢包" 區塊 (Updated) --- */}
          <div
            className="flex flex-col items-center gap-2 pt-6 pb-2 cursor-pointer" // <-- Added cursor-pointer
            onClick={handleConnectWallet} // <-- Added onClick
          >
            <div className="flex justify-center items-center gap-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-full ring-2 ring-primary bg-component-bg-light dark:bg-component-bg-dark">
                <img
                  alt="imToken logo"
                  className="h-8 w-8"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDR-Wiu6TKyppKxRLOSbOIOzY2ax1PGa2Dp_pFeZbwUKg3Uyz1OaLAsz8ylwloDeqrUAdGddrhBdj5iEyylC6hBGqkvt70Ys8WDX13D6e5m2Yer10aG8MKPtLvb5nXob-imOKzmKpHgVjoRDJvxZY-0fwG5AFaXa1kCKzftmSbTe89gZJLRwcemGsV6BL5qa9LBqUKQyf6aOrksOiweW5w7WrRK00U0dGfIRjlJml2VpnFqoXgyxVFstBe0HAE8iolQmUop6AgZi1qS"
                />
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-component-bg-light dark:bg-component-bg-dark opacity-50">
                <img
                  alt="MetaMask logo"
                  className="h-6 w-6"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdi23bGvlMfJ1EuQFd3mRnY2QMEn9mABXEXoSYkrfevTP7Pvtft3fAYoQLVym1aJBrbnGfgwf6gmx_kZHaVNQidXLZuvO-_87FbDUBNidWNNucuMAzr-GO0dLpMJhYsgihNWczisjksCF-HfsDCfUezfms5ls4Dhs37U6k2h7EozJrKLK4VZAr4YdorHUWZ2oP_74CBUmgxVPb7ceUlXe8S85M8IfwvdvklPLCmbM6dAZm9OF6Qx4wU_SApIXvYifJbXDqdpVJEQD7"
                />
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-component-bg-light dark:bg-component-bg-dark opacity-50">
                <img
                  alt="Trust Wallet logo"
                  className="h-6 w-6"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnVSCy0Zc40XEYYHaTJFaW2HYSfdhWzffbbBa5GxpSzplX8FOVwGlY8XCinbtSokgsrS-AJRUxxcDX56ku-X2Pm82Y3dH5Q0Eavm04OlOi6px4EWlsDPkn4ZS9b6wb-XdHTe-C7cMMG65sOlxBkgEq58HxPWwhZrCHxvpyVsjM1yzBkjXt61uF0vNip_EscuY5_fFQN7y6DmjccC3172hP0YFAUu6y6nuZQzlRtUGemv4HNzICO0VOH1bACGzqtH11RGr_Op69bvD_"
                />
              </div>
            </div>
            <p className="text-subtle-light dark:text-subtle-dark text-sm font-medium">綁定已有錢包</p>
          </div>

        </div>
      </main>
      <footer className="sticky bottom-0 w-full bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm pt-4 pb-6 px-4">
        <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3">
          {/* --- "開始使用" 按鈕 (Flow A) --- */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-4 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="truncate">開始使用 Invoice Pool 🌱</span>
          </button>
          <p className="text-subtle-light dark:text-subtle-dark text-xs font-normal leading-normal">
            上鏈手續費由平台吸收
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Onboarding;