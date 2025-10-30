import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { charities } from '../lib/charities';
import Toast from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';


const BindPool: React.FC = () => {
    const navigate = useNavigate();
    const { charityId } = useParams<{ charityId: string }>();
    const charity = charities.find(c => c.id === charityId);
    
    const [donationRatio, setDonationRatio] = useState<number>(100);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const fullWalletAddress = '0xAbCdEf123456789012345678901234567890dEaF';
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

    const handleConfirmBinding = () => {
        if (charityId) {
            localStorage.setItem('boundCharityId', charityId);
        }
        setShowSuccessModal(true);
    };

    const handleViewWallet = () => {
        navigate('/wallet');
    };

    if (!charity) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h2 className="text-2xl font-bold mb-4 text-text-light dark:text-text-dark">找不到公益池</h2>
                <p className="text-subtle-light dark:text-subtle-dark mb-6">您要找的公益池不存在。</p>
                <Link to="/charities" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-primary text-text-light dark:text-black text-base font-bold leading-normal tracking-[0.015em] w-48 transition-transform active:scale-95">
                    返回首頁
                </Link>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col">
            <header className="flex sticky top-0 items-center bg-background-light dark:bg-background-dark bg-opacity-80 backdrop-blur-sm p-4 pb-2 z-10 justify-between border-b border-border-light dark:border-border-dark">
                <button
                    onClick={() => navigate(-1)}
                    className="flex size-10 shrink-0 items-center justify-center text-text-light dark:text-text-dark"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 className="flex-1 text-center text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em]">
                    綁定此公益池捐入發票 🌱
                </h2>
                <div className="size-10 shrink-0"></div>
            </header>

            <main className="flex-1 pb-32">
                <div className="p-4 @container">
                    <div className="flex flex-col items-stretch justify-start rounded-xl @xl:flex-row @xl:items-start shadow-[0_4px_12px_rgba(0,0,0,0.05)] bg-component-bg-light dark:bg-component-bg-dark/50 dark:border dark:border-border-dark">
                        <div
                            className="w-full bg-center bg-no-repeat aspect-[2/1] @xl:aspect-square @xl:w-40 bg-cover rounded-t-xl @xl:rounded-l-xl @xl:rounded-r-none"
                            style={{ backgroundImage: `url("${charity.image}")` }}
                        ></div>
                        <div className="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-2 p-4">
                            <div className="flex items-center gap-2">
                                <p className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em]">{charity.name}</p>
                                <span className="material-symbols-outlined text-primary text-base material-symbols-filled">verified</span>
                            </div>
                            <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">{charity.englishName}</p>
                            <p className="text-text-light dark:text-text-dark/80 text-base font-normal leading-normal mt-1">愛心碼:{charity.loveCode}</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col px-4 py-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-subtle-light dark:text-subtle-dark text-sm font-medium">捐贈比例</span>
                        <span className="text-text-light dark:text-text-dark text-lg font-bold">{donationRatio}%</span>
                    </div>
                    <input
                        type="range"
                        min="25"
                        max="100"
                        value={donationRatio}
                        onChange={(e) => setDonationRatio(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
                    />
                     <div className="flex justify-between text-xs text-subtle-light dark:text-subtle-dark mt-1">
                        <span>25%</span>
                        <span>100%</span>
                    </div>
                </div>
                <p className="text-text-light dark:text-text-dark text-base font-medium leading-normal pb-3 pt-1 px-4">💚 謝謝你的公益捐贈</p>
                <div className="flex flex-wrap gap-4 p-4 pt-0">
                    <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-4 bg-component-bg-light dark:bg-component-bg-dark/50 border border-border-light dark:border-border-dark">
                        <p className="text-subtle-light dark:text-subtle-dark text-sm font-medium leading-normal">位捐贈者</p>
                        <p className="text-text-light dark:text-text-dark tracking-tight text-2xl font-bold leading-tight">12,483</p>
                    </div>
                    <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-4 bg-component-bg-light dark:bg-component-bg-dark/50 border border-border-light dark:border-border-dark">
                        <p className="text-subtle-light dark:text-subtle-dark text-sm font-medium leading-normal">張發票</p>
                        <p className="text-text-light dark:text-text-dark tracking-tight text-2xl font-bold leading-tight">84,201</p>
                    </div>
                </div>
                <div className="px-4">
                    <div className="flex flex-col gap-4 rounded-xl border border-border-light dark:border-border-dark bg-component-bg-light dark:bg-component-bg-dark/50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-primary/20">
                                <span className="material-symbols-outlined text-primary">security</span>
                            </div>
                            <p className="flex-1 text-text-light dark:text-text-dark text-base font-medium leading-normal">正在建立你的公益錢包，由 imToken 安全託管。</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-slate-800 p-3">
                            <span className="text-subtle-light dark:text-subtle-dark/80 text-sm font-mono truncate">{truncatedAddress}</span>
                            <button onClick={handleCopyAddress} className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-subtle-light dark:text-subtle-dark hover:bg-gray-200 dark:hover:bg-slate-700">
                                <span className="material-symbols-outlined text-base">content_copy</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background-light dark:bg-background-dark bg-opacity-80 backdrop-blur-sm border-t border-border-light dark:border-border-dark">
                <p className="text-center text-xs text-subtle-light dark:text-subtle-dark mb-4 px-2">平台將於七天後自動將發票上鏈，由 imToken 安全託管，以 USDT 結算。</p>
                <button
                  onClick={handleConfirmBinding}
                  className="w-full h-14 text-center rounded-xl bg-primary text-white text-base font-bold shadow-[0_4px_14px_rgba(38,169,92,0.4)] hover:bg-opacity-90 active:scale-95 transition-all"
                >
                    確認綁定此公益池
                </button>
            </footer>

            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="relative mx-auto flex w-[90%] max-w-sm flex-col items-center rounded-xl bg-component-bg-light dark:bg-component-bg-dark p-6 text-center shadow-2xl"
                        >
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                                <span className="material-symbols-outlined text-4xl text-white">volunteer_activism</span>
                            </div>
                            <h3 className="text-text-light dark:text-text-dark tracking-tight text-xl font-bold leading-tight px-4 text-center pb-2 pt-2">謝謝您的愛心 💚</h3>
                            <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal pb-6 pt-1 px-4 text-center">您的發票已成功綁定此公益池，將於七天內自動上鏈。</p>
                            <div className="flex w-full px-2 py-2 justify-center">
                                <button 
                                    onClick={handleViewWallet}
                                    className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 flex-1 bg-primary text-text-light dark:text-black text-base font-bold leading-normal tracking-[0.015em] shadow-[0_4px_14px_0_rgba(38,169,92,0.25)]"
                                >
                                    <span className="truncate">檢視我的錢包</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Toast message={toastMessage} show={showCopyToast} />
        </div>
    );
};

export default BindPool;