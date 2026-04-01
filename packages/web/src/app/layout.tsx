import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Echoes of History — Seshat Counterfactual Explorer',
  description:
    'What if the Maya had iron weapons? Explore data-driven counterfactual history powered by the Seshat Global History Databank.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        <nav className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <a href="/" className="flex items-center gap-2 font-semibold">
                <span className="text-lg">Echoes of History</span>
                <span className="text-xs text-stone-500 hidden sm:inline">
                  Seshat Counterfactual Explorer
                </span>
              </a>
              <div className="flex items-center gap-6 text-sm">
                <a
                  href="/explore"
                  className="text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Explore
                </a>
                <a
                  href="/research"
                  className="text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Research
                </a>
                <a
                  href="/about"
                  className="text-stone-600 hover:text-stone-900 transition-colors"
                >
                  About
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-white py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-xs text-stone-500">
            <p>
              Data sourced from the{' '}
              <a
                href="https://seshatdatabank.info"
                className="underline hover:text-stone-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Seshat Global History Databank
              </a>{' '}
              (Turchin et al., 2015). Used under CC BY-NC-SA 4.0. Geospatial
              data from Cliopatria, CC BY 4.0. Counterfactual model based on
              Turchin et al. (2022).
            </p>
            <p className="mt-2">
              This is an independent project, not affiliated with the Seshat
              team.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
