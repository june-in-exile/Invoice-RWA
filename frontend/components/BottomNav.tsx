import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    { to: '/charities', icon: 'home', label: '首頁', id: 'pools' },
    { to: '/wallet', icon: 'account_balance_wallet', label: '錢包', id: 'wallet' },
];

const BottomNav: React.FC = () => {
    const location = useLocation();

    const getIsActive = (id: string) => {
        const { pathname } = location;
        switch (id) {
            case 'pools':
                return pathname === '/charities' || pathname === '/bind-pool';
            case 'wallet':
                return pathname.startsWith('/wallet') || pathname.startsWith('/certificate') || pathname.startsWith('/transaction-details') || pathname.startsWith('/winning-result');
            default:
                return false;
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-light dark:border-border-dark bg-white/90 dark:bg-component-bg-dark/90 backdrop-blur-lg rounded-t-2xl pb-[calc(env(safe-area-inset-bottom,0))]">
            <div className="mx-auto max-w-md h-18 sm:h-20 px-6 flex items-center justify-around">
                {navItems.map((item) => {
                    const isActive = getIsActive(item.id);
                    const iconStyle = {
                        fontVariationSettings: `'FILL' ${isActive ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
                    };
                    return (
                        <Link
                            key={item.id}
                            to={item.to}
                            className={`flex flex-col items-center gap-1 py-3 transition-colors ${isActive ? 'text-primary' : 'text-subtle-light dark:text-subtle-dark hover:text-primary dark:hover:text-primary'}`}
                        >
                            <span className="material-symbols-outlined" style={iconStyle}>{item.icon}</span>
                            <span className={`text-xs ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;