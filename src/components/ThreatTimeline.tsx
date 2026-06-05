import React from 'react';
import { hazardConfig } from '@/lib/hazardConfig';

type Hazard = { title: string; probability: number; type?: string };

export default function ThreatTimeline({
  hazards,
  weather = { windSpeed: 8, precipitation: 0 },
  terrain = { slope: 0.1 },
}: {
  hazards: Hazard[];
  weather?: { windSpeed?: number; precipitation?: number };
  terrain?: { slope?: number };
}) {
  // Simple projection model:
  // - Fire hazards grow faster with wind and slope, reduced by precipitation.
  // - Other hazards have milder multipliers.
  const { windSpeed = 8, precipitation = 0 } = weather;
  const { slope = 0.1 } = terrain;
  const cfg = hazardConfig; // use configured multipliers

  const projections = hazards.slice(0, 6).map((h) => {
    const base = h.probability;
    const windFactor = Math.max(0, windSpeed / 10); // 0..?
    const precipFactor = Math.max(0, Math.min(1, precipitation / 20)); // normalized
    const slopeFactor = Math.max(0, Math.min(1, slope));

    let p1 = base;
    let p6 = base;
    let p24 = base;

    if ((h.type || '').toLowerCase() === 'fire') {
      p1 = base * (1 + windFactor * cfg.timeline.fire.p1 - precipFactor * cfg.timeline.fireReduceByPrecip.p1 + slopeFactor * cfg.timeline.fireSlopeFactor.p1);
      p6 = base * (1 + windFactor * cfg.timeline.fire.p6 - precipFactor * cfg.timeline.fireReduceByPrecip.p6 + slopeFactor * cfg.timeline.fireSlopeFactor.p6);
      p24 = base * (1 + windFactor * cfg.timeline.fire.p24 - precipFactor * cfg.timeline.fireReduceByPrecip.p24 + slopeFactor * cfg.timeline.fireSlopeFactor.p24);
    } else if ((h.type || '').toLowerCase() === 'flood' || (h.title || '').toLowerCase().includes('flood')) {
      // flood influenced by precipitation and terrain slope
      p1 = base * (1 + precipFactor * cfg.timeline.flood.p1 + slopeFactor * 0.05);
      p6 = base * (1 + precipFactor * cfg.timeline.flood.p6 + slopeFactor * 0.15);
      p24 = base * (1 + precipFactor * cfg.timeline.flood.p24 + slopeFactor * 0.3);
    } else {
      // generic hazard projection
      p1 = base * (1 + windFactor * cfg.timeline.generic.p1 - precipFactor * cfg.timeline.generic.p1);
      p6 = base * (1 + windFactor * cfg.timeline.generic.p6 - precipFactor * cfg.timeline.generic.p6);
      p24 = base * (1 + windFactor * cfg.timeline.generic.p24 - precipFactor * cfg.timeline.generic.p24);
    }

    const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

    return {
      title: h.title,
      p1: clamp(p1),
      p6: clamp(p6),
      p24: clamp(p24),
    };
  });

  return (
    <div className="h-full w-full rounded-t border-t border-slate-800 bg-slate-900/60 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Threat Propagation Timeline</div>
        <div className="text-[11px] text-slate-400">Projections: 1h / 6h / 24h • Wind {windSpeed} km/h • Precip {precipitation} mm</div>
      </div>
      <div className="mt-2 overflow-x-auto overflow-y-hidden">
        <div className="flex w-max gap-3" style={{ maxWidth: '100%' }}>
          {projections.slice(0, 6).map((p) => (
            <div key={p.title} className="w-64 flex-shrink-0 rounded border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
              <div className="flex items-center justify-between">
                <div className="max-w-[74%] truncate text-[10px] font-semibold">{p.title}</div>
                <div className="text-[10px] text-slate-300">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="mt-1.5 grid grid-cols-3 items-center gap-2">
                {[
                  { label: '1h', value: p.p1 },
                  { label: '6h', value: p.p6 },
                  { label: '24h', value: p.p24 },
                ].map((b) => {
                  const val = b.value;
                  const color = val >= 75 ? 'bg-rose-500' : val >= 50 ? 'bg-amber-400' : 'bg-emerald-400';
                  return (
                    <div key={b.label} className="flex flex-col items-start w-full">
                      <div className="mb-0.5 text-[8px] text-slate-400">{b.label}</div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded bg-slate-800">
                        <div className={`${color} h-full`} style={{ width: `${val}%` }} />
                        <div className="absolute right-1 top-0 text-[8px] font-medium leading-[10px] text-white/90">{val}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
