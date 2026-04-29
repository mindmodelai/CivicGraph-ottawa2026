export default function Loading() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mt-2" />
          <div className="h-10 w-full max-w-md bg-gray-100 rounded-lg animate-pulse mt-4" />
        </div>
      </header>
      <section className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-[3rem_1fr_4rem_8rem_5rem] gap-4 px-4 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
          <span className="text-right">#</span>
          <span>Name</span>
          <span className="text-right">Boards</span>
          <span className="text-right">Funding</span>
          <span className="text-right">Score</span>
        </div>
        <div className="border-t border-gray-200">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="grid grid-cols-[3rem_1fr_4rem_8rem_5rem] gap-4 items-center px-4 py-3 border-b border-gray-100">
              <div className="h-4 w-6 bg-gray-100 rounded animate-pulse ml-auto" />
              <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-8 bg-gray-100 rounded animate-pulse ml-auto" />
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse ml-auto" />
              <div className="h-4 w-12 bg-gray-100 rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
