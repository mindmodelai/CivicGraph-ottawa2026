import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'CivicGraph — The Governance Network Behind Canada\'s Public Funding',
  description: 'Search 23 million rows of open Canadian government data to see who controls the boards that receive public money. Built on CRA T3010 filings, federal grants, and Alberta grant records.',
  keywords: ['CivicGraph', 'Canadian governance', 'charity boards', 'public funding', 'CRA T3010', 'open data', 'transparency'],
  authors: [{ name: 'Samuel Hebeisen' }],
  openGraph: {
    title: 'CivicGraph — The Governance Network Behind Canada\'s Public Funding',
    description: 'Search 23 million rows of open Canadian government data to see who controls the boards that receive public money.',
    type: 'website',
    locale: 'en_CA',
    images: [
      {
        url: 'https://main.dtb5pniv8a3tl.amplifyapp.com/cover.png',
        width: 1200,
        height: 630,
        alt: 'CivicGraph — The governance network behind Canada\'s public funding',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CivicGraph — Governance Network',
    description: 'Who controls the boards that receive public money? Search 23M rows of open Canadian government data.',
    images: ['https://main.dtb5pniv8a3tl.amplifyapp.com/cover.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
