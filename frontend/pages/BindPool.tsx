import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { charities } from '../lib/charities';
import Toast from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { hooks } from '../lib/connectors';

const { useAccount } = hooks;

const BindPool: React.FC = () => {
    const navigate = useNavigate();
    const { charityId } = useParams<{ charityId: string }>();
    const charity = charities.find(c => c.id === charityId);
    const connectedAccount = useAccount();
    
    const [donationRatio, setDonationRatio] = useState<number>(100);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isBinding, setIsBinding] = useState(false);

    const fullWalletAddress = connectedAccount ?? localStorage.getItem('userWalletAddress') ?? '0xAbCdEf123456789012345678901234567890dEaF';
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

    const handleConfirmBinding = async () => {
        if (!charityId || !fullWalletAddress) {
            setToastMessage('請先連接錢包');
            setShowCopyToast(true);
            setTimeout(() => setShowCopyToast(false), 2000);
            return;
        }

        try {
            setIsBinding(true);

            // Find charity index (poolId) - charities array index maps to poolId
            const poolIdMap: { [key: string]: number } = {
                'sunshine': 1,
                'stray-animal': 2,
                'rare-disorders': 3,
                'child-welfare': 4,
            };
            const poolId = poolIdMap[charityId];

            if (!poolId) {
                throw new Error('Invalid charity ID');
            }

            // Send PUT request to update pool binding
            const response = await fetch(`/api/users/${fullWalletAddress}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    poolId: poolId,
                    donationPercent: donationRatio,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to bind pool');
            }

            const data = await response.json();
            console.log('✅ Pool binding successful:', data);

            // Save to localStorage for quick access
            localStorage.setItem('boundCharityId', charityId);
            localStorage.setItem('boundPoolId', poolId.toString());
            localStorage.setItem('donationPercent', donationRatio.toString());

            setShowSuccessModal(true);

        } catch (error: any) {
            console.error('❌ Failed to bind pool:', error);
            setToastMessage(error.message || '綁定失敗，請稍後再試');
            setShowCopyToast(true);
            setTimeout(() => setShowCopyToast(false), 3000);
        } finally {
            setIsBinding(false);
        }
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
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background-light dark:bg-background-dark bg-opacity-80 backdrop-blur-sm border-t border-border-light dark:border-border-dark">
                <button
                  onClick={handleConfirmBinding}
                  disabled={isBinding}
                  className="w-full h-14 text-center rounded-xl bg-primary text-white text-base font-bold shadow-[0_4px_14px_rgba(38,169,92,0.4)] hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                    {isBinding ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            綁定中...
                        </span>
                    ) : (
                        '確認綁定此公益池'
                    )}
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