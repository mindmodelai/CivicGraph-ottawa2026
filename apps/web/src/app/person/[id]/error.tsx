'use client';

import Link from 'next/link';

export default function PersonError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800">
            ← Back to Top 20
          </Link>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Person data unavailable</h1>
        <p className="text-sm text-gray-500 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
