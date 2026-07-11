'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Network, ZoomIn, ZoomOut, RefreshCw, Filter, Info, AlertTriangle } from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: 'account' | 'person' | 'company' | 'country';
  risk: 'critical' | 'high' | 'medium' | 'low' | 'clean';
  x: number;
  y: number;
  amount?: string;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  amount: string;
  type: string;
  suspicious: boolean;
}

const nodes: GraphNode[] = [
  { id: 'n1', label: 'HDFC-4521\nAnanya Trading', type: 'account', risk: 'critical', x: 400, y: 200 },
  { id: 'n2', label: 'AXIS-3301', type: 'account', risk: 'high', x: 180, y: 100 },
  { id: 'n3', label: 'PNB-7712', type: 'account', risk: 'high', x: 180, y: 200 },
  { id: 'n4', label: 'KOTAK-8812', type: 'account', risk: 'medium', x: 180, y: 300 },
  { id: 'n5', label: 'YES-4490\nShell Co X', type: 'company', risk: 'critical', x: 580, y: 120 },
  { id: 'n6', label: 'SG-OCBC-9901\nSingapore', type: 'country', risk: 'high', x: 760, y: 200 },
  { id: 'n7', label: 'HDFC-4521\nReturn Leg', type: 'account', risk: 'critical', x: 580, y: 300 },
  { id: 'n8', label: 'Suresh Ananya\nDirector', type: 'person', risk: 'high', x: 400, y: 380 },
  { id: 'n9', label: 'Shell Co Y\nMauritius', type: 'company', risk: 'critical', x: 760, y: 350 },
];

const edges: GraphEdge[] = [
  { id: 'e1', from: 'n2', to: 'n1', amount: '₹1,99,000', type: 'NEFT', suspicious: true },
  { id: 'e2', from: 'n3', to: 'n1', amount: '₹1,98,500', type: 'NEFT', suspicious: true },
  { id: 'e3', from: 'n4', to: 'n1', amount: '₹1,97,000', type: 'NEFT', suspicious: true },
  { id: 'e4', from: 'n1', to: 'n5', amount: '₹3,97,500', type: 'Wire', suspicious: true },
  { id: 'e5', from: 'n5', to: 'n6', amount: '₹3,97,500', type: 'SWIFT', suspicious: true },
  { id: 'e6', from: 'n6', to: 'n7', amount: '₹7,95,000', type: 'SWIFT', suspicious: true },
  { id: 'e7', from: 'n8', to: 'n1', amount: '', type: 'OWNS', suspicious: false },
  { id: 'e8', from: 'n8', to: 'n5', amount: '', type: 'DIRECTOR', suspicious: true },
  { id: 'e9', from: 'n6', to: 'n9', amount: '₹2,10,000', type: 'Wire', suspicious: true },
];

const nodeColors: Record<GraphNode['risk'], string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  clean: '#22c55e',
};

const nodeTypeIcons: Record<GraphNode['type'], string> = {
  account: '🏦',
  person: '👤',
  company: '🏢',
  country: '🌐',
};

const legendItems = [
  { color: '#ef4444', label: 'Critical Risk (≥86)' },
  { color: '#f97316', label: 'High Risk (71–85)' },
  { color: '#eab308', label: 'Medium Risk (41–70)' },
  { color: '#3b82f6', label: 'Low Risk (≤40)' },
  { color: '#22c55e', label: 'Clean / Verified' },
];

const patternSummary = [
  { id: 'ps-1', label: 'Smurfing', count: 47, desc: '47 sub-threshold deposits detected' },
  { id: 'ps-2', label: 'Round-Trip', count: 3, desc: 'Money returned via Singapore → HDFC-4521' },
  { id: 'ps-3', label: 'Shell Co.', count: 2, desc: 'YES-4490 and Shell Co Y confirmed shells' },
  { id: 'ps-4', label: 'Layering', count: 5, desc: '5-hop cross-border transfer chain' },
];

export default function NetworkGraphPage() {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(false);

  const visibleEdges = showSuspiciousOnly ? edges.filter((e) => e.suspicious) : edges;

  const getNodeById = (id: string) => nodes.find((n) => n.id === id);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Network size={18} className="text-primary" />
            <h1 className="text-lg font-bold text-foreground tracking-tight">Transaction Network Graph</h1>
            <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              CASE-0847
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Neo4j knowledge graph — nodes represent accounts, persons, companies; edges represent transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSuspiciousOnly(!showSuspiciousOnly)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
              showSuspiciousOnly
                ? 'bg-risk-critical/10 text-risk-critical border border-risk-critical/20' :'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Filter size={12} />
            {showSuspiciousOnly ? 'Suspicious Only' : 'All Connections'}
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
            className="p-2 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="p-2 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => { setZoom(1); setSelectedNode(null); }}
            className="p-2 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Graph canvas */}
        <div className="xl:col-span-3 card-elevated p-4">
          <div className="relative overflow-hidden rounded-lg bg-background/50 border border-border" style={{ height: 480 }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 960 480"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}
            >
              {/* Defs for arrowhead */}
              <defs>
                <marker id="arrow-suspicious" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
                </marker>
                <marker id="arrow-normal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#6b7280" />
                </marker>
              </defs>

              {/* Edges */}
              {visibleEdges.map((edge) => {
                const fromNode = getNodeById(edge.from);
                const toNode = getNodeById(edge.to);
                if (!fromNode || !toNode) return null;
                const mx = (fromNode.x + toNode.x) / 2;
                const my = (fromNode.y + toNode.y) / 2;
                return (
                  <g key={edge.id}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={edge.suspicious ? '#ef4444' : '#374151'}
                      strokeWidth={edge.suspicious ? 2 : 1}
                      strokeDasharray={edge.type === 'OWNS' || edge.type === 'DIRECTOR' ? '4,4' : undefined}
                      markerEnd={edge.suspicious ? 'url(#arrow-suspicious)' : 'url(#arrow-normal)'}
                      opacity={edge.suspicious ? 0.8 : 0.4}
                    />
                    {edge.amount && (
                      <text
                        x={mx}
                        y={my - 6}
                        textAnchor="middle"
                        fontSize="9"
                        fill={edge.suspicious ? '#ef4444' : '#9ca3af'}
                        fontFamily="monospace"
                      >
                        {edge.amount}
                      </text>
                    )}
                    {!edge.amount && (
                      <text
                        x={mx}
                        y={my - 6}
                        textAnchor="middle"
                        fontSize="8"
                        fill="#6b7280"
                        fontFamily="monospace"
                      >
                        {edge.type}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const color = nodeColors[node.risk];
                const lines = node.label.split('\n');
                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(isSelected ? null : node)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Glow for critical */}
                    {node.risk === 'critical' && (
                      <circle cx={node.x} cy={node.y} r={28} fill={color} opacity={0.15} />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={22}
                      fill={color}
                      fillOpacity={0.15}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                    <text x={node.x} y={node.y - 2} textAnchor="middle" fontSize="13" fill={color}>
                      {nodeTypeIcons[node.type]}
                    </text>
                    {lines.map((line, i) => (
                      <text
                        key={`${node.id}-line-${i}`}
                        x={node.x}
                        y={node.y + 32 + i * 12}
                        textAnchor="middle"
                        fontSize="9"
                        fill={color}
                        fontFamily="monospace"
                        fontWeight={i === 0 ? 'bold' : 'normal'}
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>

            {/* Zoom indicator */}
            <div className="absolute bottom-3 right-3 text-[10px] font-mono text-muted-foreground bg-card/80 px-2 py-1 rounded border border-border">
              {Math.round(zoom * 100)}%
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
            {legendItems.map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-3">
              <div className="w-6 border-t-2 border-dashed border-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Ownership / Director</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 border-t-2 border-red-500" />
              <span className="text-[10px] text-muted-foreground">Suspicious Transaction</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Selected node info */}
          {selectedNode ? (
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{nodeTypeIcons[selectedNode.type]}</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{selectedNode.label.split('\n')[0]}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{selectedNode.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: nodeColors[selectedNode.risk] }}
                />
                <span
                  className="text-[10px] font-semibold capitalize"
                  style={{ color: nodeColors[selectedNode.risk] }}
                >
                  {selectedNode.risk} risk
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Connections: {edges.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id).length}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Suspicious links: {edges.filter((e) => (e.from === selectedNode.id || e.to === selectedNode.id) && e.suspicious).length}
                </p>
              </div>
            </div>
          ) : (
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info size={13} className="text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">Node Inspector</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Click any node in the graph to inspect its details, connections, and risk factors.
              </p>
            </div>
          )}

          {/* Pattern summary */}
          <div className="card-elevated">
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-risk-critical" />
                <h3 className="text-xs font-semibold text-foreground">Detected Patterns</h3>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {patternSummary.map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">{p.label}</span>
                    <span className="text-[10px] font-mono bg-risk-critical/10 text-risk-critical px-1.5 py-0.5 rounded">
                      {p.count}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Graph stats */}
          <div className="card-elevated p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">Graph Statistics</h3>
            <div className="space-y-2">
              {[
                { label: 'Total Nodes', value: nodes.length },
                { label: 'Total Edges', value: edges.length },
                { label: 'Suspicious Edges', value: edges.filter((e) => e.suspicious).length },
                { label: 'Critical Nodes', value: nodes.filter((n) => n.risk === 'critical').length },
                { label: 'Max Hop Depth', value: '5 hops' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                  <span className="text-[10px] font-mono font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
