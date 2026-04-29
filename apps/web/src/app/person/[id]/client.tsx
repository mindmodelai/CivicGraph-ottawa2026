'use client';

import dynamic from 'next/dynamic';
import type { GraphNode, GraphEdge } from '@/lib/types';

const GraphView = dynamic(() => import('@/components/GraphView'), { ssr: false });

export default function PersonDetailClient({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  return <GraphView nodes={nodes} edges={edges} />;
}
