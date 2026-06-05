import React, { useMemo } from 'react';

export default function TripleThreatPanel({
  incident = { lat: 0, lng: 0, debrisRadiusKm: 2 },
  heatmapCells = [] as Array<{ x: number; y: number }>,
  blockedRoutes = [] as Array<any>,
}: {
  incident?: { lat: number; lng: number; debrisRadiusKm: number };
  heatmapCells?: Array<{ x: number; y: number }>;
  blockedRoutes?: Array<any>;
}) {
  // simple heuristic intersection: if debris radius > threshold and there are heatmapCells and blockedRoutes count > 0
  const zone = useMemo(() => {
    const debris = incident.debrisRadiusKm;
    const populous = heatmapCells.length > 4;
    const routesBlocked = blockedRoutes.length > 0;
    const isTriple = debris >= 1.5 && populous && routesBlocked;
    return {
      isTriple,
      debris,
      populousCount: heatmapCells.length,
      blockedRoutes: blockedRoutes.length,
    };
  }, [incident, heatmapCells, blockedRoutes]);

  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 p-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Triple-Threat Zone</div>
          <div className="mt-0.5 text-base font-bold">{zone.isTriple ? 'Priority Rescue Zone' : 'None'}</div>
        </div>
        <div className={`px-2 py-1 rounded font-mono ${zone.isTriple ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
          {zone.isTriple ? 'FLAGGED' : 'OK'}
        </div>
      </div>
      <div className="mt-1.5 text-[10px] text-slate-400">
        Debris radius: {zone.debris} km • Populous cells: {zone.populousCount} • Routes blocked: {zone.blockedRoutes}
      </div>
      {zone.isTriple && (
        <div className="mt-1.5 text-[10px] text-amber-400 font-semibold">Recommend: Prioritize rescue & clear ingress routes.</div>
      )}
    </div>
  );
}
