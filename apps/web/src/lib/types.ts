export type EntityType = 'person' | 'org' | 'gov';

export interface PersonSummary {
  id: string;
  name: string;
  province?: string;
  boards: number;
  totalFunding: number;
  confidence?: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  size?: number;
  province?: string;
  jurisdiction?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  amount?: number;
  fiscalYear?: number;
  program?: string;
  role?: string;
  yearStart?: number;
  yearEnd?: number;
  edgeType: 'SITS_ON' | 'FUNDED' | 'GIFTS_TO';
  sourceFilingId?: string;
  sourceUrl?: string;
}

export interface ProvenanceRecord {
  id: string;
  type: 'cra_t3010' | 'fed_grant' | 'ab_grant';
  description: string;
  url: string;
  fiscalYear?: number;
  amount?: number;
}

export interface RankedPerson extends PersonSummary {
  compositeScore: number;
}

export interface TopResponse {
  results: RankedPerson[];
  generatedAt: string;
}

export interface SearchResponse {
  query: string;
  results: PersonSummary[];
}

export interface PersonDetailResponse {
  person: PersonSummary;
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  provenance: ProvenanceRecord[];
  narrative: string;
}
