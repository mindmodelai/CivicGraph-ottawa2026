'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { TopResponse } from '@/lib/types';
import PersonRow from '@/components/PersonRow';
import SearchBox from '@/components/SearchBox';
import Footer from '@/components/Footer';
import { getTop } from '@/lib/api';

export default function HomePage() {
  const [data, setData] = useState<TopResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTop().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="CivicGraph" width={40} height={40} className="rounded" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CivicGraph</h1>
              <p className="text-sm text-gray-500">
                The governance network behind Canada&apos;s public funding
              </p>
            </div>
          </div>
          <div className="mt-4">
            <SearchBox />
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-[2rem_1fr_3rem_6rem] sm:grid-cols-[3rem_1fr_4rem_8rem_5rem] gap-2 sm:gap-4 px-4 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
          <span className="text-right">#</span>
          <span>Name</span>
          <span className="text-right">Boards</span>
          <span className="text-right">Funding</span>
          <span className="text-right hidden sm:block">Score</span>
        </div>
        <div className="border-t border-gray-200">
          {error && (
            <div className="px-4 py-8 text-center text-sm text-red-500">{error}</div>
          )}
          {!data && !error && (
            Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr_3rem_6rem] sm:grid-cols-[3rem_1fr_4rem_8rem_5rem] gap-2 sm:gap-4 items-center px-4 py-3 border-b border-gray-100">
                <div className="h-4 w-6 bg-gray-100 rounded animate-pulse ml-auto" />
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-8 bg-gray-100 rounded animate-pulse ml-auto" />
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse ml-auto" />
              </div>
            ))
          )}
          {data?.results.map((person, i) => (
            <PersonRow key={person.id} person={person} rank={i + 1} />
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
