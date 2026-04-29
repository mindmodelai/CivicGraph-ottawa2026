import type { TopResponse } from '@/lib/types';
import PersonRow from '@/components/PersonRow';
import SearchBox from '@/components/SearchBox';

async function getTopData(): Promise<TopResponse> {
  // In production, NEXT_PUBLIC_API_URL is set; in dev, read from mock
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const res = await fetch(`${apiUrl}/api/top?n=20`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
  // Static import of mock data for build
  const data = await import('../../public/mocks/top.json');
  return data.default as TopResponse;
}

export default async function HomePage() {
  const data = await getTopData();

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">CivicGraph</h1>
          <p className="text-sm text-gray-500 mt-1">
            The governance network behind Canada&apos;s public funding
          </p>
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
          {data.results.map((person, i) => (
            <PersonRow key={person.id} person={person} rank={i + 1} />
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-xs text-gray-400">
          Data: CRA T3010, Government of Canada Open Data, Government of Alberta Open Data.
          Score = boards × log₁₀(1 + funding).
        </div>
      </footer>
    </main>
  );
}
