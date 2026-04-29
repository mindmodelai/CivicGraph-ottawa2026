import type { ProvenanceRecord } from '@/lib/types';
import { formatCAD } from '@/lib/format';

const typeLabels: Record<ProvenanceRecord['type'], string> = {
  cra_t3010: 'CRA T3010',
  fed_grant: 'Federal Grant',
  ab_grant: 'AB Grant',
};

const typeColors: Record<ProvenanceRecord['type'], string> = {
  cra_t3010: 'bg-amber-50 text-amber-700 border-amber-200',
  fed_grant: 'bg-blue-50 text-blue-700 border-blue-200',
  ab_grant: 'bg-green-50 text-green-700 border-green-200',
};

export default function ProvenanceChip({ record }: { record: ProvenanceRecord }) {
  return (
    <a
      href={record.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${typeColors[record.type]}`}
    >
      <span>{typeLabels[record.type]}</span>
      {record.amount != null && <span className="tabular-nums">{formatCAD(record.amount)}</span>}
      {record.fiscalYear && <span>FY{record.fiscalYear}</span>}
      <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
