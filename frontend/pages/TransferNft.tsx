import React, { useState, useEffect } from 'react';
import { nfts } from '../lib/nfts';

interface TransferNftProps {
    nftId: string;
    onClose: () => void;
    onTransferSuccess: () => void;
}

const TransferNft: React.FC<TransferNftProps> = ({ nftId, onClose, onTransferSuccess }) => {
    const [recipientAddress, setRecipientAddress] = useState('');
    const [isAddressValid, setIsAddressValid] = useState(false);
    const [isKeepCertificate, setIsKeepCertificate] = useState(true);
    const [status, setStatus] = useState<'input' | 'transferring' | 'success'>('input');

    const nft = nfts.find(n => n.id === nftId);

    useEffect(() => {
        // Allow any non-empty address format, per user request.
        setIsAddressValid(recipientAddress.trim().length > 0);
    }, [recipientAddress]);

    const handleTransfer = () => {
        if (!isAddressValid) return;
        setStatus('transferring');
        // Simulate network delay for the transfer process
        setTimeout(() => {
            setStatus('success');
        }, 2500);
    };
    
    // Fallback if NFT data is somehow not found
    if (!nft) {
        return null; 
    }

    const renderContent = () => {
        switch (status) {
            case 'input':
                return (
                    <div className="flex w-full max-w-sm flex-col rounded-xl bg-component-bg-light dark:bg-component-bg-dark shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                        <div className="flex h-5 w-full items-center justify-center pt-3">
                            <div className="h-1 w-9 rounded-full bg-gray-200 dark:bg-zinc-700"></div>
                        </div>
                        <div className="flex items-center p-4 pb-2 justify-between">
                            <button onClick={onClose} className="text-text-light dark:text-text-dark flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                            <h2 className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-8">轉移 NFT</h2>
                        </div>
                        <div className="flex flex-col gap-4 p-4 pt-2">
                            <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                                <div className="text-green-600 dark:text-primary flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                    <span className="material-symbols-outlined">shield</span>
                                </div>
                                <p className="text-green-800 dark:text-green-300 text-sm font-medium leading-normal flex-1">安全檢查 • imToken 託管提示</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="flex flex-col min-w-40 flex-1">
                                    <div className="flex w-full flex-1 items-stretch rounded-xl">
                                        <input
                                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 text-text-light dark:text-text-dark h-14 placeholder:text-gray-400 dark:placeholder:text-zinc-500 p-[15px] pr-2 text-base font-normal leading-normal focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:border-primary"
                                            placeholder="輸入或貼上收件者錢包地址"
                                            value={recipientAddress}
                                            onChange={(e) => setRecipientAddress(e.target.value)}
                                        />
                                    </div>
                                </label>
                                <p className="text-subtle-light dark:text-subtle-dark text-xs font-normal leading-normal px-1">支援 paste / scan / ENS（若適用）</p>
                            </div>
                            <div className="flex items-center justify-between gap-4 py-2">
                                <p className="text-text-light dark:text-text-dark text-sm font-medium leading-normal flex-1">同時保留原憑證 NFT (不燒毀)</p>
                                <button
                                    onClick={() => setIsKeepCertificate(!isKeepCertificate)}
                                    aria-checked={isKeepCertificate}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-component-bg-dark ${isKeepCertificate ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'}`}
                                    role="switch"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isKeepCertificate ? 'translate-x-5' : 'translate-x-0'}`}
                                    ></span>
                                </button>
                            </div>
                            <p className="text-subtle-light dark:text-subtle-dark text-xs font-normal leading-normal text-center bg-gray-50 dark:bg-zinc-800 rounded-lg p-3">此操作會產生鏈上手續費，按下確認後需在錢包中簽名。</p>
                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    onClick={handleTransfer}
                                    disabled={!isAddressValid}
                                    className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-black font-bold text-base leading-normal transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    確認轉移 NFT
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex h-12 w-full items-center justify-center rounded-xl bg-transparent text-gray-700 dark:text-gray-200 font-bold text-base leading-normal hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'transferring':
                return (
                    <div className="flex w-full max-w-sm flex-col items-center rounded-xl bg-component-bg-light dark:bg-component-bg-dark p-8 text-center shadow-2xl">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <h3 className="text-text-light dark:text-text-dark tracking-tight text-xl font-bold leading-tight pt-6 pb-2">
                            正在轉移憑證...
                        </h3>
                        <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">
                            交易正在區塊鏈上確認中，請稍候。
                        </p>
                    </div>
                );
            case 'success':
                return (
                     <div className="relative mx-auto flex w-[90%] max-w-sm flex-col items-center rounded-xl bg-component-bg-light dark:bg-component-bg-dark p-6 text-center shadow-2xl">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                            <span className="material-symbols-outlined text-4xl text-white">task_alt</span>
                        </div>
                        <h3 className="text-text-light dark:text-text-dark tracking-tight text-xl font-bold leading-tight px-4 text-center pb-2 pt-2">轉移成功！</h3>
                        <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal pb-6 pt-1 px-4 text-center">您的公益憑證 NFT 已成功送出，交易正在區塊鏈上確認中。</p>
                        <div className="flex w-full px-2 py-2 justify-center">
                            <button 
                                onClick={onTransferSuccess}
                                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 flex-1 bg-primary text-text-light dark:text-black text-base font-bold leading-normal tracking-[0.015em] shadow-[0_4px_14px_0_rgba(38,169,92,0.25)]"
                            >
                                <span className="truncate">完成</span>
                            </button>
                        </div>
                    </div>
                );
        }
    };

    // The outer div is the backdrop, clicking it closes the modal only during the 'input' state.
    return (
        <div className="fixed inset-0 z-50 flex h-full w-full flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4"
             onClick={status === 'input' ? onClose : undefined}
        >
            {/* This inner div stops click propagation so clicking the modal content doesn't close it */}
            <div onClick={(e) => e.stopPropagation()}>
                {renderContent()}
            </div>
        </div>
    );
};

export default TransferNft;