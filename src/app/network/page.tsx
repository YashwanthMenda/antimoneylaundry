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

// ── Detection engine findings: 108 accounts, 364 transactions ──────────────
// Round-Trip: Nexus Capital Ltd (INDUS-2850) risk=99, ₹4,78,50,123, 3 hops
// Round-Trip: Sharma Real Estate (KOTAK-3010) risk=99, ₹15,68,92,410, 3 hops
// Layering:   Kapoor Diamonds Pvt Ltd (HDFC-1248) risk=83, ₹4,86,06,321, 6 hops
// Layering:   Rajan Exports Ltd (AXIS-8506) risk=83, ₹5,04,07,615, 5 hops
// Smurfing:   Meera Textiles Corp (BOB-2469) risk=74, ₹30,63,122, 16 senders
// Smurfing:   Ananya Trading Pvt Ltd (CANARA-5685) risk=67, ₹21,29,029, 11 senders

const nodes: GraphNode[] = [
  // Round-Trip cluster — Nexus Capital Ltd
  { id: 'rt1', label: 'INDUS-2850\nNexus Capital Ltd', type: 'account', risk: 'critical', x: 160, y: 100 },
  { id: 'rt2', label: 'CAYMAN-SHELL-1\nCayman Islands', type: 'company', risk: 'critical', x: 310, y: 60 },
  { id: 'rt3', label: 'OFFSHORE-HK-2\nHong Kong', type: 'country', risk: 'high', x: 460, y: 100 },

  // Round-Trip cluster — Sharma Real Estate
  { id: 'rt4', label: 'KOTAK-3010\nSharma Real Estate', type: 'account', risk: 'critical', x: 160, y: 220 },
  { id: 'rt5', label: 'ANTWERP-SHELL-1\nAntwerp, BE', type: 'company', risk: 'critical', x: 310, y: 180 },
  { id: 'rt6', label: 'MAURITIUS-CO-1\nMauritius', type: 'country', risk: 'high', x: 460, y: 220 },

  // Layering cluster — Kapoor Diamonds (6 hops)
  { id: 'ly1', label: 'HDFC-1248\nKapoor Diamonds', type: 'account', risk: 'high', x: 580, y: 80 },
  { id: 'ly2', label: 'SBI-4421\nDelhi, IN', type: 'account', risk: 'medium', x: 660, y: 40 },
  { id: 'ly3', label: 'DXB-SHELL-1\nDubai, AE', type: 'company', risk: 'critical', x: 740, y: 80 },
  { id: 'ly4', label: 'SG-OCBC-3311\nSingapore', type: 'country', risk: 'high', x: 820, y: 120 },
  { id: 'ly5', label: 'ANTWERP-CO-2\nAntwerp, BE', type: 'company', risk: 'high', x: 880, y: 80 },

  // Layering cluster — Rajan Exports (5 hops)
  { id: 'ly6', label: 'AXIS-8506\nRajan Exports Ltd', type: 'account', risk: 'high', x: 580, y: 220 },
  { id: 'ly7', label: 'YES-6612\nPune, IN', type: 'account', risk: 'medium', x: 660, y: 260 },
  { id: 'ly8', label: 'MAURITIUS-CO-2\nMauritius', type: 'country', risk: 'high', x: 740, y: 220 },
  { id: 'ly9', label: 'CAYMAN-CO-3\nCayman Islands', type: 'company', risk: 'critical', x: 820, y: 260 },

  // Smurfing cluster — Meera Textiles (16 senders → BOB-2469)
  { id: 'sm1', label: 'BOB-2469\nMeera Textiles Corp', type: 'account', risk: 'high', x: 310, y: 360 },
  { id: 'sm2', label: 'HDFC-1101', type: 'account', risk: 'medium', x: 160, y: 310 },
  { id: 'sm3', label: 'SBI-2202', type: 'account', risk: 'medium', x: 160, y: 360 },
  { id: 'sm4', label: 'ICICI-3303', type: 'account', risk: 'medium', x: 160, y: 410 },
  { id: 'sm5', label: '+13 more\nsenders', type: 'account', risk: 'low', x: 160, y: 460 },

  // Smurfing cluster — Ananya Trading (11 senders → CANARA-5685)
  { id: 'sm6', label: 'CANARA-5685\nAnanya Trading', type: 'account', risk: 'medium', x: 580, y: 380 },
  { id: 'sm7', label: 'AXIS-2101', type: 'account', risk: 'medium', x: 460, y: 340 },
  { id: 'sm8', label: 'KOTAK-2202', type: 'account', risk: 'medium', x: 460, y: 390 },
  { id: 'sm9', label: '+9 more\nsenders', type: 'account', risk: 'low', x: 460, y: 440 },
];

const edges: GraphEdge[] = [
  // Round-Trip: Nexus Capital Ltd cycle
  { id: 'e-rt1', from: 'rt1', to: 'rt2', amount: '₹4,78,50,123', type: 'SWIFT', suspicious: true },
  { id: 'e-rt2', from: 'rt2', to: 'rt3', amount: '₹4,76,11,972', type: 'SWIFT', suspicious: true },
  { id: 'e-rt3', from: 'rt3', to: 'rt1', amount: '₹4,73,73,821', type: 'SWIFT', suspicious: true },

  // Round-Trip: Sharma Real Estate cycle
  { id: 'e-rt4', from: 'rt4', to: 'rt5', amount: '₹15,68,92,410', type: 'SWIFT', suspicious: true },
  { id: 'e-rt5', from: 'rt5', to: 'rt6', amount: '₹15,61,07,048', type: 'SWIFT', suspicious: true },
  { id: 'e-rt6', from: 'rt6', to: 'rt4', amount: '₹15,53,21,686', type: 'SWIFT', suspicious: true },

  // Layering: Kapoor Diamonds 6-hop chain
  { id: 'e-ly1', from: 'ly1', to: 'ly2', amount: '₹4,86,06,321', type: 'RTGS', suspicious: true },
  { id: 'e-ly2', from: 'ly2', to: 'ly3', amount: '₹4,57,33,105', type: 'SWIFT', suspicious: true },
  { id: 'e-ly3', from: 'ly3', to: 'ly4', amount: '₹4,43,61,112', type: 'SWIFT', suspicious: true },
  { id: 'e-ly4', from: 'ly4', to: 'ly5', amount: '₹4,30,30,278', type: 'SWIFT', suspicious: true },

  // Layering: Rajan Exports 5-hop chain
  { id: 'e-ly5', from: 'ly6', to: 'ly7', amount: '₹5,04,07,615', type: 'RTGS', suspicious: true },
  { id: 'e-ly6', from: 'ly7', to: 'ly8', amount: '₹4,74,28,525', type: 'SWIFT', suspicious: true },
  { id: 'e-ly7', from: 'ly8', to: 'ly9', amount: '₹4,60,05,669', type: 'SWIFT', suspicious: true },

  // Smurfing: Meera Textiles fan-in
  { id: 'e-sm1', from: 'sm2', to: 'sm1', amount: '₹1,85,000', type: 'NEFT', suspicious: true },
  { id: 'e-sm2', from: 'sm3', to: 'sm1', amount: '₹1,92,000', type: 'NEFT', suspicious: true },
  { id: 'e-sm3', from: 'sm4', to: 'sm1', amount: '₹1,88,000', type: 'NEFT', suspicious: true },
  { id: 'e-sm4', from: 'sm5', to: 'sm1', amount: '×13 NEFT', type: 'NEFT', suspicious: true },

  // Smurfing: Ananya Trading fan-in
  { id: 'e-sm5', from: 'sm7', to: 'sm6', amount: '₹1,82,000', type: 'NEFT', suspicious: true },
  { id: 'e-sm6', from: 'sm8', to: 'sm6', amount: '₹1,91,000', type: 'NEFT', suspicious: true },
  { id: 'e-sm7', from: 'sm9', to: 'sm6', amount: '×9 NEFT', type: 'NEFT', suspicious: true },
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

// Derived from detection engine findings_report.txt
const patternSummary = [
  { id: 'ps-1', label: 'Round-Trip', count: 2, desc: 'Nexus Capital & Sharma Real Estate — funds return via offshore shells (risk 99/100)' },
  { id: 'ps-2', label: 'Layering', count: 2, desc: 'Kapoor Diamonds (6 hops) & Rajan Exports (5 hops) — cross-border jurisdiction chain (risk 83/100)' },
  { id: 'ps-3', label: 'Smurfing', count: 2, desc: 'Meera Textiles (16 senders) & Ananya Trading (11 senders) — sub-₹2L deposits (risk 74/67)' },
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
              108 accounts · 364 txns
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            AML detection engine graph — 6 suspicious patterns across 3 typologies (Round-Trip, Layering, Smurfing)
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
          <div className="relative overflow-hidden rounded-lg bg-background/50 border border-border" style={{ height: 520 }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 960 520"
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

              {/* Pattern group labels */}
              <text x="300" y="22" textAnchor="middle" fontSize="9" fill="#ef4444" fontFamily="monospace" fontWeight="bold" opacity="0.7">ROUND-TRIP (×2)</text>
              <text x="730" y="22" textAnchor="middle" fontSize="9" fill="#f97316" fontFamily="monospace" fontWeight="bold" opacity="0.7">LAYERING (×2)</text>
              <text x="380" y="295" textAnchor="middle" fontSize="9" fill="#eab308" fontFamily="monospace" fontWeight="bold" opacity="0.7">SMURFING (×2)</text>

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
                      markerEnd={edge.suspicious ? 'url(#arrow-suspicious)' : 'url(#arrow-normal)'}
                      opacity={edge.suspicious ? 0.8 : 0.4}
                    />
                    {edge.amount && (
                      <text
                        x={mx}
                        y={my - 6}
                        textAnchor="middle"
                        fontSize="8"
                        fill={edge.suspicious ? '#ef4444' : '#9ca3af'}
                        fontFamily="monospace"
                      >
                        {edge.amount}
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
                {selectedNode.label.split('\n')[1] && (
                  <p className="text-[10px] text-muted-foreground">
                    Entity: {selectedNode.label.split('\n')[1]}
                  </p>
                )}
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

          {/* Pattern summary — from detection engine */}
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

          {/* Graph stats — from detection engine */}
          <div className="card-elevated p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">Graph Statistics</h3>
            <div className="space-y-2">
              {[
                { label: 'Total Accounts', value: '108' },
                { label: 'Total Transactions', value: '364' },
                { label: 'Flagged Transactions', value: String(edges.filter((e) => e.suspicious).length) },
                { label: 'Critical Nodes', value: String(nodes.filter((n) => n.risk === 'critical').length) },
                { label: 'Max Hop Depth', value: '6 hops (Layering)' },
                { label: 'Offshore Jurisdictions', value: '6' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                  <span className="text-[10px] font-mono font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SHAP score summary */}
          <div className="card-elevated p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">Top Risk Scores</h3>
            <div className="space-y-2">
              {[
                { label: 'Nexus Capital Ltd', score: 99, pattern: 'Round-Trip' },
                { label: 'Sharma Real Estate', score: 99, pattern: 'Round-Trip' },
                { label: 'Kapoor Diamonds', score: 83, pattern: 'Layering' },
                { label: 'Rajan Exports Ltd', score: 83, pattern: 'Layering' },
                { label: 'Meera Textiles Corp', score: 74, pattern: 'Smurfing' },
                { label: 'Ananya Trading', score: 67, pattern: 'Smurfing' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-foreground font-medium">{item.label}</p>
                    <p className="text-[9px] text-muted-foreground">{item.pattern}</p>
                  </div>
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: item.score >= 86 ? '#ef4444' : item.score >= 71 ? '#f97316' : '#eab308',
                      backgroundColor: item.score >= 86 ? 'rgba(239,68,68,0.1)' : item.score >= 71 ? 'rgba(249,115,22,0.1)' : 'rgba(234,179,8,0.1)',
                    }}
                  >
                    {item.score}/100
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
