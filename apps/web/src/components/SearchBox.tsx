'use client';

export default function SearchBox() {
  return (
    <div className="relative w-full max-w-md">
      <input
        type="search"
        placeholder="Search a director's name…"
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        aria-label="Search directors"
      />
    </div>
  );
}
