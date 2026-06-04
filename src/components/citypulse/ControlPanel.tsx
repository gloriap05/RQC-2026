import { AlertTriangle, Radio } from "lucide-react";

const features = [
  "3D Collapse Geofencing (Turf.js Math)",
  "Passive Civilian Density Heatmap (Network Handshakes)",
  "Dynamic Topology Rerouting (OpenStreetMap)",
  "Automated Structural Tilt Flags (Pre/Post LiDAR)",
  "Focal-Plane Viewport Filter (Active Zone Zoom)",
];

const districts = [
  { name: "Downtown District", value: 34, tone: "critical" as const },
  { name: "Marina District", value: 81, tone: "warning" as const },
  { name: "Industrial Sector", value: 96, tone: "safe" as const },
];

const toneClass = {
  critical: "text-critical",
  warning: "text-warning",
  safe: "text-safe",
};

export function ControlPanel() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-muted-foreground">
          <Radio className="h-3 w-3" />
          <span>SYSTEM ID // CP-04-EQ</span>
        </div>
        <h1 className="mt-2 text-[15px] font-semibold uppercase leading-tight tracking-[0.14em]">
          CityPulse <span className="text-muted-foreground">//</span> Post-Earthquake Command
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-safe animate-pulse-dot" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-safe" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-safe">Live Data Feed</span>
          <span className="ml-auto text-[10px] tracking-widest text-muted-foreground">14:02:47 UTC</span>
        </div>
      </div>

      {/* Critical Alert */}
      <div className="px-5 pt-5">
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

      {/* City Health */}
      <div className="px-5 pt-6">
        <SectionLabel>City Health Index</SectionLabel>
        <div className="mt-3 space-y-2">
          {districts.map((d) => (
            <div
              key={d.name}
              className="flex items-center justify-between rounded-sm border border-border bg-mask/60 px-3 py-2.5"
            >
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {d.name}
                </div>
                <div className={`mt-0.5 text-[18px] font-bold tracking-tight ${toneClass[d.tone]}`}>
                  {d.value}% <span className="text-[10px] font-normal tracking-widest opacity-70">OPERATIONAL</span>
                </div>
              </div>
              <div className="h-10 w-16">
                <Sparkline tone={d.tone} value={d.value} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="px-5 pt-6">
        <SectionLabel>Independent Layer Features</SectionLabel>
        <div className="mt-3 space-y-1.5">
          {features.map((f, i) => (
            <label
              key={f}
              className="group flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-mask/40 px-3 py-2 transition-colors hover:border-cyan-route/60 hover:bg-mask"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-cyan-route bg-cyan-route/15 text-cyan-route">
                <span className="text-[10px] font-bold leading-none">X</span>
              </span>
              <span className="text-[11px] leading-tight tracking-wide text-foreground/90">
                <span className="text-cyan-route/80">[{String(i + 1).padStart(2, "0")}]</span>{" "}
                {f}
              </span>
            </label>
          ))}
        </div>
      </div>

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

function Sparkline({ tone, value }: { tone: "safe" | "warning" | "critical"; value: number }) {
  const stroke =
    tone === "safe" ? "var(--safe)" : tone === "warning" ? "var(--warning)" : "var(--critical)";
  // deterministic-ish points based on value
  const points = Array.from({ length: 12 }, (_, i) => {
    const base = value / 100;
    const jitter = Math.sin(i * 1.3 + value) * 0.18;
    const y = 30 - Math.max(2, Math.min(28, (base + jitter) * 30));
    return `${i * 6},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 66 30" className="h-full w-full">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        points={points}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
