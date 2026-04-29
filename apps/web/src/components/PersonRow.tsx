import Link from 'next/link';
import type { RankedPerson } from '@/lib/types';
import { formatCAD, formatScore } from '@/lib/format';

export default function PersonRow({ person, rank }: { person: RankedPerson; rank: number }) {
  return (
    <Link
      href={`/person/${person.id}`}
      className="grid grid-cols-[3rem_1fr_4rem_8rem_5rem] gap-4 items-center px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
    >
      <span className="text-gray-400 tabular-nums text-right">{rank}</span>
      <span className="font-medium text-gray-900">
        {person.name}
        {person.province && (
          <span className="ml-2 text-xs text-gray-400 font-normal">{person.province}</span>
        )}
      </span>
      <span className="tabular-nums text-right text-gray-600">{person.boards}</span>
      <span className="tabular-nums text-right text-gray-600">{formatCAD(person.totalFunding)}</span>
      <span className="tabular-nums text-right font-medium text-indigo-600">{formatScore(person.compositeScore)}</span>
    </Link>
  );
}
