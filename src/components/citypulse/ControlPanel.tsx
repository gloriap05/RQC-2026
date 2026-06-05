import React, { useState } from "react";
import { AlertTriangle, Radio, Moon, Sun } from "lucide-react";
import EscalationPanel from "../EscalationPanel";
import AftershockPanel from "../AftershockPanel";
import TripleThreatPanel from "../TripleThreatPanel";
import GoldenHourClock from "../GoldenHourClock";
import { CascadingHazardsPanel } from "../CascadingHazards";

type Theme = "dark" | "light";

interface ControlPanelProps {
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  eventTimestamp?: number;
}



export function ControlPanel({ theme, onThemeChange, eventTimestamp }: ControlPanelProps) {
  const [showCascade, setShowCascade] = useState(false);

  function CompactCard({ children }: { children: React.ReactNode }) {
    return (
      <div className="p-2 rounded-md border bg-slate-950/50 border-slate-800 text-slate-100 text-sm">
        {children}
      </div>
    );
  }
  const hazards = [
    { id: 'h1', timeOffset: 'T-0m', title: 'Seismic Shockwave', description: 'Initial tremor impact recorded.', type: 'seismic', status: 'critical', probability: 100, lat: 42, lng: 48 },
    { id: 'h2', timeOffset: '+12m', title: 'Substation Alpha Failure', description: 'Structural compromise of power towers.', type: 'power', status: 'predicted', probability: 95, lat: 35, lng: 60 },
    { id: 'h3', timeOffset: '+25m', title: 'Water Pump Station B Overload', description: 'Pressure loss expected.', type: 'water', status: 'predicted', probability: 92, lat: 65, lng: 35 },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-muted-foreground">
          <Radio className="h-3 w-3" />
          <span>SYSTEM ID // CP-04-EQ</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-[15px] font-semibold uppercase leading-tight tracking-[0.14em]">
            CityPulse <span className="text-muted-foreground">//</span> Post-Earthquake Command
          </h1>
          <div className="ml-4">
            <GoldenHourClock compact eventTimestamp={eventTimestamp ?? Date.now() - 1000 * 60 * 20} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-safe animate-pulse-dot" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-safe" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-safe">Live Data Feed</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-[10px] tracking-widest text-muted-foreground">14:02:47 UTC</div>
            <div className="flex items-center gap-1">
              <button
                aria-label="Set dark mode"
                title="Dark"
                onClick={() => onThemeChange('dark')}
                className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'bg-cyan-route/15 border border-cyan-route text-cyan-route' : 'text-muted-foreground hover:bg-mask/30'}`}
              >
                <Moon className="h-4 w-4" />
              </button>
              <button
                aria-label="Set light mode"
                title="Light"
                onClick={() => onThemeChange('light')}
                className={`p-1 rounded-md transition-colors ${theme === 'light' ? 'bg-cyan-route/15 border border-cyan-route text-cyan-route' : 'text-muted-foreground hover:bg-mask/30'}`}
              >
                <Sun className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alert */}
      <div className="px-4 pt-4">
        <div
          className="relative overflow-hidden rounded-sm border border-critical bg-critical/10 px-4 py-3 animate-critical"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-critical" />
            <div className="flex-1">
              <div className="text-[9px] uppercase tracking-[0.25em] text-critical/80">
                Master Incident Status
              </div>
              <div className="mt-0.5 text-[13px] font-bold uppercase tracking-wide text-critical">
                [!] Critical Alert Active: Sector 4 Downtown
              </div>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 w-px bg-critical" />
        </div>
      </div>

      {/* New Hazard Panels (compact) */}
      <div className="px-4 pt-5 space-y-3 overflow-y-auto">
        <CompactCard>
          <EscalationPanel timeline={[{ id: 't1', probability: 100, timeOffset: 'T-0' }, { id: 't2', probability: 95, timeOffset: '+12m' }, { id: 't3', probability: 92, timeOffset: '+25m' }]} />
        </CompactCard>

        <CompactCard>
          <AftershockPanel center={{ lat: 42, lng: 48 }} />
        </CompactCard>

        <CompactCard>
          <TripleThreatPanel incident={{ lat: 42, lng: 48, debrisRadiusKm: 2 }} heatmapCells={[{x:1,y:1},{x:2,y:2},{x:3,y:3},{x:4,y:4},{x:5,y:5}]} blockedRoutes={[{id:'r1'}]} />
        </CompactCard>

        <div className="pt-1">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase text-slate-300">Cascading Hazards</div>
            <button onClick={() => setShowCascade((s) => !s)} className="text-xs text-slate-400 underline">
              {showCascade ? 'Hide' : 'Show'}
            </button>
          </div>
          {showCascade ? (
            <div className="mt-2">
              <CascadingHazardsPanel hazards={hazards} onSelectEvent={() => {}} activeId={null} />
            </div>
          ) : (
            <div className="mt-2 text-[12px] text-slate-300">
              {hazards.slice(0, 3).map((h) => (
                <div key={h.id} className="py-1">• {h.title}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      

      {/* Map Mode Toggle removed (compact controls moved to header) */}

      {/* Footer telemetry */}
      <div className="mt-auto border-t border-border px-5 py-3">
        <div className="grid grid-cols-3 gap-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          <Telemetry label="UPLINK" value="OK" tone="safe" />
          <Telemetry label="LATENCY" value="42ms" tone="safe" />
          <Telemetry label="NODES" value="287/312" tone="warning" />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Telemetry({ label, value, tone }: { label: string; value: string; tone: "safe" | "warning" | "critical" }) {
  const t = tone === "safe" ? "text-safe" : tone === "warning" ? "text-warning" : "text-critical";
  return (
    <div className="flex flex-col">
      <span>{label}</span>
      <span className={`mt-0.5 text-[11px] font-bold tracking-wider ${t}`}>{value}</span>
    </div>
  );
}

