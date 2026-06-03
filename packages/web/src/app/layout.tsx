import type { Metadata } from 'next';
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteNav } from '@/components/SiteNav';

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Echoes of History — Seshat Counterfactual Explorer',
  description:
    'What if the Maya had iron weapons? Explore data-driven counterfactual history powered by the Seshat Global History Databank.',
  openGraph: {
    title: 'Echoes of History',
    description:
      'Inject hypothetical changes into real civilisations and watch a data-driven model project how history might have diverged.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${hanken.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brass-400 focus:px-4 focus:py-2 focus:font-medium focus:text-ink-950"
        >
          Skip to content
        </a>

        <SiteNav />

        <main id="main" className="flex-1">
          {children}
        </main>

        <footer className="mt-24 border-t border-rule">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-brass-500">
                ☉
              </span>
              <span className="font-display text-base font-semibold text-parchment">
                Echoes of History
              </span>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-parchment-faint">
              Data sourced from the{' '}
              <a
                href="https://seshat-db.com/"
                className="text-parchment-dim underline decoration-brass-600 underline-offset-2 transition-colors hover:text-brass-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Seshat Global History Databank
              </a>{' '}
              (Turchin et al., 2015), used under CC BY-NC-SA 4.0. Geospatial data
              from Cliopatria, CC BY 4.0. Counterfactual model based on Turchin et
              al. (2022).
            </p>
            <p className="mt-3 text-xs text-parchment-faint">
              An independent project, not affiliated with the Seshat team.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
