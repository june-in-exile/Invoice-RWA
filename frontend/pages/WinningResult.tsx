import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const WinningResult: React.FC = () => {
    const navigate = useNavigate();

    // In a real app, the winning NFT ID would be passed dynamically
    const winningNftId = '00452';

    return (
        <div className="relative flex h-screen w-full flex-col bg-yellow-50 dark:bg-zinc-900 group/design-root overflow-hidden">
            {/* Spotlight effect */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent"></div>
            
            {/* Main Content */}
            <div className="flex flex-1 flex-col z-10">
                {/* Top App Bar with a close button */}
                <header className="flex items-center p-4 justify-end">
                    <button onClick={() => navigate('/wallet')} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-text-light dark:text-text-dark hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                <main className="flex-grow px-4 flex flex-col items-center justify-center text-center">
                    <div className="w-full max-w-md">
                        <span className="material-symbols-outlined text-7xl text-amber-500 dark:text-amber-400">emoji_events</span>
                        <h1 className="text-text-light dark:text-text-dark text-3xl font-bold leading-tight tracking-tight mt-2">恭喜中獎！</h1>
                        <p className="text-subtle-light dark:text-subtle-dark text-base font-normal leading-normal mt-1">您的中獎獎金已全數捐出</p>

                        <div className="my-6">
                            <p className="text-5xl font-bold leading-tight tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-600">20.000 USDT</p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-3 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-black/5 dark:border-white/10 p-4">
                             <p className="text-subtle-light dark:text-subtle-dark text-sm font-medium leading-normal">捐贈至：兒童教育基金會</p>
                             <div className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/50 px-3 py-1 text-xs font-semibold text-green-800 dark:text-green-300">
                                <span className="material-symbols-outlined !text-sm">verified</span>
                                <span>交易已上鏈</span>
                            </div>
                            <Link to="/transaction-details" className="text-amber-600 dark:text-amber-400 text-sm font-bold leading-normal underline mt-1">
                                查看捐贈交易
                            </Link>
                        </div>
                    </div>
                </main>

                {/* Button Group */}
                <footer className="w-full max-w-md mx-auto flex flex-col items-stretch gap-3 px-4 py-6">
                    <Link 
                        to={`/certificate/${winningNftId}`} 
                        className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-amber-500 text-black text-base font-bold leading-normal tracking-[0.015em] w-full transition-transform hover:bg-amber-600 active:scale-95 shadow-lg shadow-amber-500/20"
                    >
                        <span className="truncate">查看我的憑證</span>
                    </Link>
                    <Link 
                        to="/charities" 
                        className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-transparent text-subtle-light dark:text-subtle-dark text-base font-bold leading-normal tracking-[0.015em] w-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <span className="truncate">返回首頁</span>
                    </Link>
                </footer>
            </div>
        </div>
    );
};

export default WinningResult;