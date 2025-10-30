import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import { Link } from 'react-router-dom';
import { charities } from '../lib/charities';

const industries = ['全部', '動物救援', '兒童福利', '醫療援助', '社會福利'];

const Charities: React.FC = () => {
  const [activeIndustry, setActiveIndustry] = useState('全部');
  const [boundCharityId, setBoundCharityId] = useState<string | null>(null);

  useEffect(() => {
    // Component mounts, read from localStorage
    setBoundCharityId(localStorage.getItem('boundCharityId'));

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = () => {
      setBoundCharityId(localStorage.getItem('boundCharityId'));
    };
    window.addEventListener('storage', handleStorageChange);

    // Clean up listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  const filteredCharities = activeIndustry === '全部'
    ? charities
    : charities.filter(c => c.industry === activeIndustry);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-10 flex items-center bg-component-bg-light/80 dark:bg-component-bg-dark/80 backdrop-blur-sm p-4 pb-3 justify-center shadow-sm">
        <h1 className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em]">探索公益池 🌊</h1>
      </header>
      <main className="flex-1 pb-24 pt-4">
        <div className="flex flex-wrap gap-4 p-4">
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-4 border border-border-light dark:border-border-dark bg-component-bg-light dark:bg-component-bg-dark">
            <p className="text-subtle-light dark:text-subtle-dark text-sm font-medium leading-normal">累計發票數</p>
            <p className="text-text-light dark:text-text-dark tracking-tight text-2xl font-bold leading-tight">1,204</p>
          </div>
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-4 border border-border-light dark:border-border-dark bg-component-bg-light dark:bg-component-bg-dark">
            <p className="text-subtle-light dark:text-subtle-dark text-sm font-medium leading-normal">累計捐贈金額</p>
            <p className="text-text-light dark:text-text-dark tracking-tight text-2xl font-bold leading-tight">USDT 8,500</p>
          </div>
          <div className="flex min-w-full sm:min-w-[158px] sm:flex-1 flex-col gap-2 rounded-xl p-4 border border-border-light dark:border-border-dark bg-component-bg-light dark:bg-component-bg-dark">
            <p className="text-subtle-light dark:text-subtle-dark text-sm font-medium leading-normal">累計中獎次數</p>
            <p className="text-text-light dark:text-text-dark tracking-tight text-2xl font-bold leading-tight">5</p>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="flex flex-wrap gap-2">
            {industries.map(industry => (
              <button
                key={industry}
                onClick={() => setActiveIndustry(industry)}
                className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-9 px-4 text-sm font-bold leading-normal transition-colors ${
                  activeIndustry === industry
                    ? 'bg-primary text-white'
                    : 'bg-component-bg-light dark:bg-component-bg-dark text-subtle-light dark:text-subtle-dark hover:bg-gray-200 dark:hover:bg-border-dark'
                }`}
              >
                {industry}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {filteredCharities.map(charity => {
            const isParticipating = charity.id === boundCharityId;
            return (
              <div key={charity.id} className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)] bg-component-bg-light dark:bg-component-bg-dark overflow-hidden">
                <div
                  className="w-full bg-center bg-no-repeat aspect-[2/1] bg-cover"
                  style={{ backgroundImage: `url("${charity.image}")` }}
                ></div>
                <div className="flex w-full grow flex-col items-stretch justify-center gap-2 p-4">
                  {isParticipating ? (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary dark:text-primary/90 text-xl material-symbols-filled">
                        check_circle
                      </span>
                      <p className="text-primary dark:text-primary/90 text-sm font-bold leading-normal">已參與</p>
                    </div>
                  ) : (
                    <p className={`${charity.status === '已結束' ? 'text-subtle-light dark:text-subtle-dark' : 'text-primary dark:text-primary/90'} text-sm font-bold leading-normal`}>
                      {charity.status}
                    </p>
                  )}
                  <p className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em]">
                    {charity.name}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between pt-2">
                    <div className="flex flex-col gap-1">
                      <p className="text-subtle-light dark:text-subtle-dark text-base font-normal leading-normal">
                        已募集 USDT {charity.raised.toLocaleString()} • {charity.supporters.toLocaleString()} 位支持者
                      </p>
                      <p className="text-subtle-light dark:text-subtle-dark text-sm font-normal leading-normal">
                        {charity.status === '已結束' ? charity.nextDraw : `下次開獎: ${charity.nextDraw}`}
                      </p>
                    </div>
                    
                    {(() => {
                        if (isParticipating) {
                            return (
                                <Link
                                    to={`/bind-pool/${charity.id}`}
                                    className="flex min-w-[120px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary/90 text-base font-bold leading-normal mt-2 sm:mt-0 self-end sm:self-auto"
                                >
                                    <span className="truncate">查看詳情</span>
                                </Link>
                            );
                        }
                        if (charity.status === '進行中') {
                            return (
                                <Link
                                    to={`/bind-pool/${charity.id}`}
                                    className="flex min-w-[120px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-text-light dark:text-black text-base font-bold leading-normal mt-2 sm:mt-0 self-end sm:self-auto"
                                >
                                    <span className="truncate">我要支持</span>
                                </Link>
                            );
                        }
                        if (charity.status === '已結束') {
                            return (
                                <button
                                    disabled
                                    className="flex min-w-[120px] max-w-[480px] cursor-not-allowed items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-gray-200 dark:bg-border-dark text-subtle-light dark:text-subtle-dark text-base font-bold leading-normal mt-2 sm:mt-0 self-end sm:self-auto"
                                >
                                    <span className="truncate">已結束</span>
                                </button>
                            );
                        }
                        return null;
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Charities;