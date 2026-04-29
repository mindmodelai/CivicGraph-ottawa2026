'use client';

import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';
import type { GraphNode, GraphEdge } from '@/lib/types';

const GraphView = dynamic(() => import('@/components/GraphView'), { ssr: false });

class GraphErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[200px] border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-500">Graph unavailable — see provenance below</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PersonDetailClient({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  return (
    <GraphErrorBoundary>
      <GraphView nodes={nodes} edges={edges} />
    </GraphErrorBoundary>
  );
}
