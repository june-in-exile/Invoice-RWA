

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const TransactionDetails: React.FC = () => {
    const navigate = useNavigate();

    const fromAddress = '0xAbCdEf123456789012345678901234567890dEaF';
    const toAddress = '0x1234567890abcdef1234567890abcdef12345678';
    const truncatedFrom = `${fromAddress.substring(0, 6)}...${fromAddress.substring(fromAddress.length - 4)}`;
    const truncatedTo = `${toAddress.substring(0, 6)}...${toAddress.substring(toAddress.length - 4)}`;

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
            <header className="sticky top-0 z-10 flex items-center bg-component-bg-light/80 dark:bg-component-bg-dark/80 backdrop-blur-sm p-4 pb-3 shadow-sm shadow-black/[0.05]">
                <button onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center">
                    <span className="material-symbols-outlined text-text-light dark:text-text-dark">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center text-lg font-bold leading-tight tracking-tight text-text-light dark:text-text-dark">捐贈交易詳情</h1>
                <div className="size-10 shrink-0"></div>
            </header>
            <main className="flex flex-1 flex-col items-center px-4 py-6 pb-24">
                <div className="w-full max-w-md rounded-xl bg-component-bg-light dark:bg-component-bg-dark p-6 shadow-lg shadow-black/[0.08] flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                        <span className="material-symbols-outlined text-4xl text-primary">verified_user</span>
                    </div>
                    <h2 className="text-text-light dark:text-text-dark tracking-tight text-[24px] font-bold leading-tight text-center">交易已上鏈 ✅</h2>
                    <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal text-center mt-1">您的中獎金額已成功捐贈至 兒童教育基金會</p>
                    <h3 className="text-yellow-500 tracking-tight text-[32px] font-bold leading-tight text-center mt-4">20.000 USDT</h3>
                    <hr className="w-full border-t border-border-light dark:border-border-dark my-6" />
                    <div className="w-full space-y-4 text-sm">
                        <div className="flex justify-between items-start">
                            <span className="text-subtle-light dark:text-subtle-dark">錢包地址 (From)</span>
                            <span className="font-mono text-text-light dark:text-text-dark text-right">{truncatedFrom}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-subtle-light dark:text-subtle-dark">收款地址 (To)</span>
                            <span className="font-mono text-text-light dark:text-text-dark text-right">{truncatedTo}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-subtle-light dark:text-subtle-dark">Gas 費用 (Fee)</span>
                            <div className="text-right">
                                <span className="font-mono text-text-light dark:text-text-dark">0.00042 USDT</span>
                                <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">由平台自行吸收</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-subtle-light dark:text-subtle-dark">交易時間</span>
                            <span className="font-mono text-text-light dark:text-text-dark text-right">2025/11/26 16:42 UTC+8</span>
                        </div>
                    </div>
                </div>
                <p className="mt-4 px-4 text-center text-xs text-subtle-light dark:text-subtle-dark">
                    此交易由 imToken 安全託管，所有資料皆可鏈上驗證。
                </p>
                <div className="w-full max-w-md mt-auto pt-6 space-y-3">
                    <button onClick={() => navigate(-1)} className="w-full rounded-full bg-yellow-500 py-3.5 text-base font-bold text-text-light transition-opacity hover:opacity-90">
                        返回上頁
                    </button>
                </div>
            </main>
            <BottomNav />
        </div>
    );
};
export default TransactionDetails;