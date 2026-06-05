import React, { useEffect, useState } from 'react';
import { hazardConfig } from '@/lib/hazardConfig';

type Feature = {
  id: string;
  properties: any;
  geometry: { coordinates: [number, number, number] };
};

export default function AftershockPanel({ center }: { center?: { lat: number; lng: number } }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchFeed = async () => {
      setLoading(true);
      try {
        const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
        const j = await res.json();
        if (!mounted) return;
        const feats: Feature[] = (j.features || []).map((f: any) => ({ id: f.id, properties: f.properties, geometry: f.geometry }));
        // optional proximity filter
        const proximityKm = hazardConfig.aftershock.proximityKm;
        const filtered = center
          ? feats.filter((f) => {
              const [lng, lat] = f.geometry.coordinates;
              const R = 6371; // km
              const dLat = ((lat - center.lat) * Math.PI) / 180;
              const dLon = ((lng - center.lng) * Math.PI) / 180;
              const a = Math.sin(dLat / 2) ** 2 + Math.cos((center.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const d = R * c;
              return d <= proximityKm;
            })
          : feats;
        setFeatures(filtered);
      } catch (e) {
        console.warn('USGS fetch failed', e);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
    const iv = setInterval(fetchFeed, 60_000); // refresh every minute
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [center]);

  // simple Omori-like predicted probability: based on count and mean time
  const predictedNextHour = (() => {
    if (!features.length) return 2;
    const cfg = hazardConfig.aftershock;
    const count = Math.min(cfg.maxEvents, features.length);
    const meanAgeHours = features.reduce((s, f) => s + (Date.now() - (f.properties.time || 0)) / 3600000, 0) / features.length || 1;
    const predicted = Math.min(99, Math.round((count * (1 / Math.max(0.5, meanAgeHours))) * cfg.omoriMultiplier));
    return predicted;
  })();

  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 p-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">USGS Aftershocks</div>
          <div className="mt-0.5 text-base font-bold">{features.length} events</div>
        </div>
        <div className="text-xs font-mono bg-slate-800 px-1 py-0.5 rounded">1h {Math.round(predictedNextHour)}%</div>
      </div>
      <div className="mt-1.5 text-[10px] text-slate-400">Feed: earthquake.usgs.gov — proximity filtered {center ? 'to incident' : ''}.</div>
      <div className="mt-1.5">
        <div className="text-[10px] text-slate-500 italic">Top recent:</div>
        <ul className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 overflow-hidden">
          {features.slice(0, 4).map((f) => (
            <li key={f.id} className="truncate text-[10px] text-slate-300">M{Math.round((f.properties.mag || 0) * 10) / 10} • {f.properties.place}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
