import React from 'react';

export default function EscalationPanel({ timeline }: { timeline: Array<{ id: string; probability: number; timeOffset: string }> }) {
  // Simple trend-based classifier: look at last 3 probabilities
  const last = timeline.slice(-4).map((t) => t.probability);
  const trend = last.length >= 2 ? (last[last.length - 1] - last[0]) / last.length : 0;
  let label = 'Stable';
  let confidence = 55;
  if (trend > 3) {
    label = "Getting Worse";
    confidence = Math.min(98, 60 + Math.round(trend * 2));
  } else if (trend < -3) {
    label = "De-escalating";
    confidence = Math.min(98, 60 + Math.round(-trend * 2));
  }

  const recentStr = last.map((p) => `${Math.round(p)}`).join(' · ');
  const reasoning = `Recent: ${recentStr}% — trend ${trend.toFixed(1)}`;

  return (
    <div className="p-3 rounded-lg border bg-slate-950/60 border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Escalation Classifier</div>
          <div className="mt-1 text-lg font-bold">{label}</div>
        </div>
        <div className="text-xs font-mono bg-slate-800 px-1 py-0.5 rounded">{Math.round(confidence)}%</div>
      </div>
      <div className="mt-2 text-xs text-slate-400">{reasoning}</div>
      <div className="mt-3 text-[11px] text-slate-500 italic">Reasoning trace available on request.</div>
    </div>
  );
}
