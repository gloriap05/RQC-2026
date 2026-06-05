import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ControlPanel } from "@/components/citypulse/ControlPanel";
import { IncidentMap } from "@/components/citypulse/IncidentMap";
import ThreatTimeline from "@/components/ThreatTimeline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CityPulse // Post-Earthquake Command" },
      { name: "description", content: "Tactical urban earthquake emergency response command interface." },
    ],
  }),
  component: Index,
});

function Index() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [timelineHazards, setTimelineHazards] = useState<Array<{ title: string; probability: number; type?: string; time?: number }>>([]);

  useEffect(() => {
    let mounted = true;
    const fetchUSGS = async () => {
      try {
        const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
        const j = await res.json();
        const feats = j.features || [];
        const mapped = feats.slice(0, 12).map((f: any) => {
          const mag = f.properties?.mag || 0;
          const place = f.properties?.place || 'Unknown location';
          const time = f.properties?.time || Date.now();
          const title = `${place} M${mag}`;
          // crude mapping: magnitude -> probability (normalized)
          const probability = Math.min(98, Math.max(1, Math.round((mag / 8) * 100)));
          return { title, probability, type: 'seismic', time };
        });
        if (mounted) {
          setTimelineHazards(mapped);
        }
      } catch (e) {
        console.warn('USGS fetch failed', e);
      }
    };
    fetchUSGS();
    const iv = setInterval(fetchUSGS, 60_000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  // choose most significant recent seismic event timestamp for Golden Hour (largest magnitude mapped to first)
  const eventTimestamp = (() => {
    if (!timelineHazards || timelineHazards.length === 0) return Date.now() - 1000 * 60 * 20;
    // pick the most recent (max time)
    const sorted = [...timelineHazards].sort((a, b) => (b.time || 0) - (a.time || 0));
    return sorted[0].time || Date.now() - 1000 * 60 * 20;
  })();
  return (
    <div className="flex h-screen w-screen bg-background text-foreground flex-col">
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[450px] shrink-0 border-r border-border bg-panel overflow-auto">
          <ControlPanel theme={theme} onThemeChange={setTheme} eventTimestamp={eventTimestamp} />
        </aside>
        <main className="relative flex-1 overflow-auto">
          <IncidentMap theme={theme} />
        </main>
      </div>
      <div className="w-full">
        <ThreatTimeline
          hazards={timelineHazards}
          weather={{ windSpeed: 15, precipitation: 2 }}
          terrain={{ slope: 0.12 }}
        />
      </div>
    </div>
  );
}
