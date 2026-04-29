'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { GraphNode, GraphEdge } from '@/lib/types';
import { formatCAD } from '@/lib/format';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const nodeColors: Record<string, string> = {
  person: '#6366f1',
  org: '#f59e0b',
  gov: '#10b981',
};

export default function GraphView({ nodes, edges }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cyRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const initGraph = useCallback(async () => {
    if (!containerRef.current) return;

    const cytoscape = (await import('cytoscape')).default;
    const coseBilkent = (await import('cytoscape-cose-bilkent')).default;
    cytoscape.use(coseBilkent);

    if (cyRef.current) cyRef.current.destroy();

    const elements = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          nodeSize: n.type === 'person' ? 40 : Math.max(20, Math.min(60, Math.log10((n.size || 1000) + 1) * 8)),
          color: nodeColors[n.type] || '#94a3b8',
        },
      })),
      ...edges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          label: e.edgeType === 'FUNDED' && e.amount ? formatCAD(e.amount) : e.role || e.edgeType,
          edgeType: e.edgeType,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '11px',
            'text-margin-y': 6,
            'text-max-width': '100px',
            'text-wrap': 'ellipsis',
            width: 'data(nodeSize)',
            height: 'data(nodeSize)',
            'background-color': 'data(color)',
            'border-width': 2,
            'border-color': '#fff',
          },
        },
        {
          selector: 'edge',
          style: {
            label: 'data(label)',
            'font-size': '9px',
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            width: 2,
            'line-color': '#d1d5db',
            'target-arrow-color': '#d1d5db',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge[edgeType="FUNDED"]',
          style: { 'line-color': '#10b981', 'target-arrow-color': '#10b981' },
        },
        {
          selector: 'edge[edgeType="SITS_ON"]',
          style: { 'line-color': '#6366f1', 'target-arrow-color': '#6366f1', 'line-style': 'dashed' },
        },
      ] as unknown as cytoscape.StylesheetCSS[],
      layout: {
        name: 'cose-bilkent',
        animate: false,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 120,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    cy.on('mouseover', 'node', (evt: cytoscape.EventObject) => {
      const node = evt.target;
      const pos = node.renderedPosition();
      const type = node.data('type');
      const label = node.data('label');
      let text = `${label} (${type})`;
      const match = nodes.find((n) => n.id === node.id());
      if (match?.size) text += `\nFunding: ${formatCAD(match.size)}`;
      setTooltip({ x: pos.x, y: pos.y - 30, text });
    });

    cy.on('mouseout', 'node', () => setTooltip(null));

    cyRef.current = cy;
  }, [nodes, edges]);

  useEffect(() => {
    initGraph();
    return () => { cyRef.current?.destroy(); };
  }, [initGraph]);

  return (
    <div className="relative w-full h-[500px] border border-gray-200 rounded-lg bg-gray-50">
      <div ref={containerRef} className="w-full h-full" />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-pre-line"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Person</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> Organization</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Government</span>
      </div>
    </div>
  );
}
