'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/rules', label: 'Rules' },
  { href: '/history', label: 'Protection History' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-emerald-400"
              >
                <path
                  d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z"
                  fill="currentColor"
                  fillOpacity="0.2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 12L11 14L15 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">
              Shield<span className="text-emerald-400">Fi</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connect */}
          <div className="flex items-center gap-3">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
