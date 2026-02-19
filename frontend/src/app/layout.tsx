import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import NavBar from '@/components/NavBar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ShieldFi - DeFi Risk Intelligence',
  description:
    'AI-powered risk monitoring and automated protection for DeFi positions on BNB Chain.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
        style={{ background: '#06080f', color: '#e2e8f0' }}
      >
        <Providers>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
            {children}
          </main>
          <footer className="mt-auto border-t" style={{ borderColor: 'rgba(148,163,184,0.06)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600">ShieldFi v1.0</span>
                  <span className="text-slate-800">|</span>
                  <span className="text-xs text-slate-600">DeFi Risk Intelligence</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(240,185,11,0.06)', border: '1px solid rgba(240,185,11,0.12)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#f0b90b" fillOpacity="0.2" stroke="#f0b90b" strokeWidth="1.5" />
                    <path d="M12 6L8.5 9.5L10.5 11.5L12 10L13.5 11.5L15.5 9.5L12 6ZM6 12L8 10L10 12L8 14L6 12ZM14 12L16 10L18 12L16 14L14 12ZM12 14L10.5 12.5L8.5 14.5L12 18L15.5 14.5L13.5 12.5L12 14Z" fill="#f0b90b" />
                  </svg>
                  <span className="text-[11px] font-medium" style={{ color: '#f0b90b' }}>Powered by BNB Chain</span>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
