'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PersonDetailResponse } from '@/lib/types';
import { formatCAD } from '@/lib/format';
import { getPerson } from '@/lib/api';
import ProvenanceChip from '@/components/ProvenanceChip';
import PersonDetailClient from './client';

export default function PersonPageClient({ id }: { id: string }) {
  const [data, setData] = useState<PersonDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPerson(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen bg-white">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800">← Back to Top 20</Link>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Person data unavailable</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-white">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800">← Back to Top 20</Link>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mb-8" />
          <div className="h-[500px] bg-gray-50 border border-gray-200 rounded-lg animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
            ← Back to Top 20
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{data.person.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            {data.person.province && <span>{data.person.province}</span>}
            <span>{data.person.boards} boards</span>
            <span>{formatCAD(data.person.totalFunding)} total funding</span>
          </div>
        </div>

        {data.narrative && (
          <div className="mb-6 rounded-lg bg-indigo-50 border border-indigo-100 p-4">
            <h2 className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-2">AI Summary</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{data.narrative}</p>
          </div>
        )}

        <PersonDetailClient nodes={data.graph.nodes} edges={data.graph.edges} />

        <section className="mt-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Source Filings</h2>
          <div className="flex flex-wrap gap-2">
            {data.provenance.map((p) => (
              <ProvenanceChip key={p.id} record={p} />
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-gray-200 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-xs text-gray-400">
          Data: CRA T3010, Government of Canada Open Data, Government of Alberta Open Data.
        </div>
      </footer>
    </main>
  );
}
