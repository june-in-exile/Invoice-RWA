import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { nfts } from '../lib/nfts';
import BottomNav from '../components/BottomNav';
import TransferNft from './TransferNft';

const Certificate: React.FC = () => {
    const navigate = useNavigate();
    const { nftId } = useParams<{ nftId: string }>();
    const nft = nfts.find(n => n.id === nftId);
    
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    const [transferredNfts, setTransferredNfts] = useState<string[]>(() => {
        const saved = localStorage.getItem('transferredNfts');
        return saved ? JSON.parse(saved) : [];
    });

    const handleTransferSuccess = () => {
        if (!nftId) return;
        const newTransferred = [...transferredNfts, nftId];
        setTransferredNfts(newTransferred);
        localStorage.setItem('transferredNfts', JSON.stringify(newTransferred));
        setIsTransferModalOpen(false);
    };

    if (!nft) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-text-light dark:text-text-dark">
                <h2 className="text-2xl font-bold mb-4">找不到憑證</h2>
                <p className="text-subtle-light dark:text-subtle-dark mb-6">您要找的公益憑證不存在。</p>
                <Link to="/wallet" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-primary text-text-light dark:text-black text-base font-bold leading-normal tracking-[0.015em] w-48 transition-transform active:scale-95">
                    返回錢包
                </Link>
            </div>
        );
    }

    const isTransferred = transferredNfts.includes(nft.id);
    const isTransferDisabled = !nft.transferable || isTransferred;

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="flex-grow pb-28">
                <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm">
                    <div className="flex items-center p-4 pb-2 justify-between">
                        <button onClick={() => navigate(-1)} className="text-text-light dark:text-text-dark flex size-12 shrink-0 items-center justify-center rounded-full">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <h2 className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">你的公益憑證已生成 🌿</h2>
                        <div className="size-12 shrink-0"></div>
                    </div>
                </header>
                <main className="flex flex-col items-center">
                    <div className="w-full max-w-md px-4 pt-4">
                        <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] bg-component-bg-light dark:bg-component-bg-dark/50">
                            <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-t-xl" style={{ backgroundImage: `url("${nft.image}")` }}></div>
                            <div className="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-1 py-4 px-4">
                                <p className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em]">NFT ID #{nft.id}</p>
                                <div className="flex items-end gap-3 justify-between">
                                    <p className="text-green-600 dark:text-green-400 text-base font-normal leading-normal">{nft.status}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 mt-4 bg-component-bg-light dark:bg-component-bg-dark/50 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between gap-x-6 py-3 border-b border-border-light dark:border-border-dark">
                                <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">公益名稱</p>
                                <p className="text-text-light dark:text-text-dark text-sm font-normal leading-normal text-right">{nft.name}</p>
                            </div>
                            <div className="flex justify-between gap-x-6 py-3 border-b border-border-light dark:border-border-dark">
                                <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">捐贈比例</p>
                                <p className="text-text-light dark:text-text-dark text-sm font-normal leading-normal text-right">{nft.donationRatio}%</p>
                            </div>
                            <div className="flex justify-between gap-x-6 py-3 border-b border-border-light dark:border-border-dark">
                                <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">發票數量</p>
                                <p className="text-text-light dark:text-text-dark text-sm font-normal leading-normal text-right">{nft.invoiceCount}</p>
                            </div>
                            <div className="flex justify-between gap-x-6 py-3">
                                <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">開獎日期</p>
                                <p className="text-text-light dark:text-text-dark text-sm font-normal leading-normal text-right">{nft.issueDate}</p>
                            </div>
                        </div>
                        <div className="flex flex-1 gap-3 w-full flex-col items-stretch py-6">
                             <button 
                                onClick={() => setIsTransferModalOpen(true)}
                                disabled={isTransferDisabled}
                                title={!nft.transferable ? "中獎捐贈後無法轉移" : isTransferred ? "此憑證已轉移" : "轉移此 NFT"}
                                className="flex min-w-[84px] items-center justify-center overflow-hidden rounded-xl h-12 px-5 text-base font-bold leading-normal tracking-[0.015em] w-full transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 enabled:bg-primary enabled:text-text-light dark:enabled:text-black"
                            >
                                <span className="truncate">轉移此 NFT</span>
                            </button>
                            <Link to="/wallet" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 text-primary text-base font-bold leading-normal tracking-[0.015em] w-full transition-transform active:scale-95">
                                <span className="truncate">回到錢包</span>
                            </Link>
                        </div>
                        <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal pb-3 pt-1 px-4 text-center">憑證將於開獎日自動更新分潤狀態。</p>
                    </div>
                </main>
            </div>
             {isTransferModalOpen && (
                <TransferNft
                    nftId={nft.id}
                    onClose={() => setIsTransferModalOpen(false)}
                    onTransferSuccess={handleTransferSuccess}
                />
            )}
            <BottomNav />
        </div>
    );
};
export default Certificate;