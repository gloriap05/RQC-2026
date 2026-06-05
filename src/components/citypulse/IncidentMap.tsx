import { AlertTriangle, Ambulance, BrainCircuit, Check, Compass, Crosshair, Flame, Layers, Maximize2, Send, ShieldAlert, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LatLngExpression, Map as LeafletMap, TileLayer as LeafletTileLayer, Polyline as LeafletPolyline } from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const ACTIVE_CENTER: [number, number] = [-122.4094, 37.7849];
const ACTIVE_LATLNG: LatLngExpression = [ACTIVE_CENTER[1], ACTIVE_CENTER[0]];
const WORLD_CENTER: LatLngExpression = [25, 10];

const GEOFENCE_COORDS: [number, number][] = [
  [37.7858, -122.4118],
  [37.7866, -122.4108],
  [37.7868, -122.409],
  [37.786, -122.4078],
  [37.7848, -122.4074],
  [37.7838, -122.408],
  [37.7832, -122.4094],
  [37.7836, -122.411],
  [37.7846, -122.412],
];

const ORIGIN_POINT: [number, number] = [37.782, -122.416];
const DEST_POINT: [number, number] = [37.7849, -122.4094];
const BLOCKAGE_POINT: [number, number] = [37.7836, -122.413];

const CIVILIAN_HEAT = Array.from({ length: 60 }).map(() => {
  const radius = Math.random() * 0.0012;
  const angle = Math.random() * Math.PI * 2;
  const weight = 0.5 + Math.random() * 0.5;
  return {
    lat: ACTIVE_CENTER[1] + Math.sin(angle) * radius * 0.7,
    lng: ACTIVE_CENTER[0] + Math.cos(angle) * radius,
    weight,
  };
});

type Hotspot = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  severity: "critical" | "warning" | "watch";
  magnitude: number;
};

const GLOBAL_HOTSPOTS: Hotspot[] = [
  { id: "sf", name: "San Francisco · Sector 4", lng: -122.4094, lat: 37.7849, severity: "critical", magnitude: 6.8 },
  { id: "la", name: "Los Angeles · Aftershock Watch", lng: -118.2437, lat: 34.0522, severity: "warning", magnitude: 4.2 },
  { id: "mex", name: "Mexico City · Centro", lng: -99.1332, lat: 19.4326, severity: "critical", magnitude: 6.1 },
  { id: "tok", name: "Tokyo · Shinjuku Grid", lng: 139.6917, lat: 35.6895, severity: "warning", magnitude: 5.3 },
  { id: "ist", name: "Istanbul · Marmara Fault", lng: 28.9784, lat: 41.0082, severity: "watch", magnitude: 3.9 },
  { id: "kat", name: "Kathmandu · Valley", lng: 85.324, lat: 27.7172, severity: "critical", magnitude: 6.5 },
  { id: "jak", name: "Jakarta · Sunda Strait", lng: 106.8456, lat: -6.2088, severity: "warning", magnitude: 4.8 },
  { id: "lim", name: "Lima · Coastal Shelf", lng: -77.0428, lat: -12.0464, severity: "watch", magnitude: 3.6 },
  { id: "ank", name: "Ankara · Anatolian Plate", lng: 32.8597, lat: 39.9334, severity: "watch", magnitude: 3.2 },
  { id: "wel", name: "Wellington · Rift Zone", lng: 174.7762, lat: -41.2865, severity: "warning", magnitude: 4.6 },
];

const SEVERITY_COLOR: Record<Hotspot["severity"], string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  watch: "#06b6d4",
};

const AI_ACTIONS = [
  {
    action: "Move ambulatory civilians east of the geofence for triage.",
    priority: "P1",
    risk: "High",
    reason: "Highest lives-saved impact with lower responder exposure.",
  },
  {
    action: "Dispatch Fire HazMat to isolate gas and power before deep entry.",
    priority: "P2",
    risk: "Critical",
    reason: "Reduces ignition and electrocution risk for rescue teams.",
  },
  {
    action: "Set a 150 m exclusion perimeter around the collapse zone.",
    priority: "P3",
    risk: "High",
    reason: "Prevents secondary casualties while specialists move in.",
  },
  {
    action: "Route EMS Unit-07 through the cyan path and stage at Mission / 6th.",
    priority: "P4",
    risk: "Medium",
    reason: "Avoids the blocked approach and keeps extraction moving.",
  },
];

const RESPONSE_TEAMS = [
  { icon: ShieldAlert, label: "Entry Lead", value: "Urban Search & Rescue Alpha", tone: "text-critical" },
  { icon: Ambulance, label: "Medical", value: "EMS Unit-07 + triage lead", tone: "text-safe" },
  { icon: Flame, label: "Utility Risk", value: "Fire HazMat + gas shutoff", tone: "text-warning" },
  { icon: Users, label: "Control", value: "Police perimeter crew", tone: "text-cyan-route" },
];

function hotspotZoom(hotspot: Hotspot) {
  if (hotspot.id === "sf") return 15;
  if (hotspot.severity === "critical") return 8;
  if (hotspot.severity === "warning") return 6;
  return 5;
}

interface IncidentMapProps {
  theme: "dark" | "light";
}

export function IncidentMap({ theme }: IncidentMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const rerouteRef = useRef<LeafletPolyline | null>(null);
  const rerouteGlowRef = useRef<LeafletPolyline | null>(null);
  const [selected, setSelected] = useState<Hotspot | null>(GLOBAL_HOTSPOTS[0]);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const focusHotspot = (hotspot: Hotspot) => {
    setSelected(hotspot);
    mapRef.current?.flyTo([hotspot.lat, hotspot.lng], hotspotZoom(hotspot), {
      animate: true,
      duration: 1.2,
    });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let dashStep = 0;
    let dashTimer: number | null = null;

    void import("leaflet").then(async (L) => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        worldCopyJump: true,
      }).setView(ACTIVE_LATLNG, 15);

      mapRef.current = map;

      L.control.zoom({ position: "topright" }).addTo(map);
      L.control
        .attribution({ position: "bottomleft", prefix: false })
        .addAttribution("CARTO · OpenStreetMap · OSRM")
        .addTo(map);

      tileLayerRef.current = L.tileLayer(theme === "dark" ? TILE_DARK : TILE_LIGHT, {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      L.polygon(GEOFENCE_COORDS, {
        color: "#ef4444",
        weight: 2.5,
        dashArray: "8 6",
        fillColor: "#ef4444",
        fillOpacity: 0.08,
      }).addTo(map);

      L.marker(DEST_POINT, {
        zIndexOffset: 800,
        icon: L.divIcon({
          className: "citypulse-div-icon",
          iconSize: [42, 42],
          iconAnchor: [21, 39],
          html: `
            <div class="citypulse-hazard-marker" aria-label="Critical hazard">
              <div class="citypulse-hazard-triangle">!</div>
            </div>
          `,
        }),
      })
        .bindTooltip("HAZARD: COLLAPSE + UTILITY LEAK RISK", {
          permanent: true,
          direction: "top",
          offset: [0, -34],
          className: "citypulse-tooltip citypulse-tooltip--hazard",
        })
        .addTo(map);

      CIVILIAN_HEAT.forEach((point) => {
        L.circleMarker([point.lat, point.lng], {
          radius: 10 + point.weight * 10,
          stroke: false,
          fillColor: point.weight > 0.72 ? "#ef4444" : "#f59e0b",
          fillOpacity: 0.12 + point.weight * 0.18,
        }).addTo(map);
      });

      let routeCoords: [number, number][] = [
        [ORIGIN_POINT[0], ORIGIN_POINT[1]],
        [DEST_POINT[0], DEST_POINT[1]],
      ];
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${ORIGIN_POINT[1]},${ORIGIN_POINT[0]};${DEST_POINT[1]},${DEST_POINT[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const json = await res.json();
        const coords = json?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length) {
          routeCoords = coords.map((c: [number, number]) => [c[1], c[0]]);
        }
      } catch {
        // Fallback trace
      }
      if (cancelled || !mapRef.current) return;

      rerouteGlowRef.current = L.polyline(routeCoords, {
        color: "#06b6d4",
        weight: 10,
        opacity: 0.22,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      rerouteRef.current = L.polyline(routeCoords, {
        color: "#06b6d4",
        weight: 4,
        opacity: 0.98,
        dashArray: "10 10",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      dashTimer = window.setInterval(() => {
        dashStep = (dashStep + 1) % 20;
        rerouteRef.current?.setStyle({ dashOffset: `${dashStep}` });
      }, 100);

      L.circleMarker([ORIGIN_POINT[0], ORIGIN_POINT[1]], {
        radius: 6,
        color: "#ffffff",
        weight: 1.5,
        fillColor: "#06b6d4",
        fillOpacity: 1,
      })
        .bindTooltip("UNIT-07 ORIGIN", {
          permanent: true,
          direction: "top",
          offset: [0, -10],
          className: "citypulse-tooltip",
        })
        .addTo(map);

      L.marker(BLOCKAGE_POINT, {
        icon: L.divIcon({
          className: "citypulse-div-icon",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          html: '<div style="display:flex;height:26px;width:26px;align-items:center;justify-content:center;color:#f97316;font-size:20px;font-weight:700;text-shadow:0 0 12px #f97316;">✕</div>',
        }),
      })
        .bindTooltip("RE-ROUTE TRIGGER: SECONDARY BLOCKAGE", {
          permanent: true,
          direction: "top",
          offset: [0, -12],
          className: "citypulse-tooltip citypulse-tooltip--warning",
        })
        .addTo(map);

      GLOBAL_HOTSPOTS.forEach((hotspot) => {
        const color = SEVERITY_COLOR[hotspot.severity];
        const openHotspot = () => focusHotspot(hotspot);

        L.circleMarker([hotspot.lat, hotspot.lng], {
          radius: 8 + hotspot.magnitude * 2.4,
          stroke: false,
          fillColor: color,
          fillOpacity: 0.16,
        })
          .on("click", openHotspot)
          .addTo(map);

        L.circleMarker([hotspot.lat, hotspot.lng], {
          radius: 3 + hotspot.magnitude * 0.45,
          color: "#ffffff",
          weight: 1,
          fillColor: color,
          fillOpacity: 1,
        })
          .bindTooltip(`${hotspot.name} · ${hotspot.severity.toUpperCase()} · M${hotspot.magnitude.toFixed(1)}`, {
            direction: "top",
            className: "citypulse-tooltip",
          })
          .on("click", openHotspot)
          .addTo(map);
      });

      window.setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      cancelled = true;
      if (dashTimer) {
        window.clearInterval(dashTimer);
      }
      mapRef.current?.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      rerouteRef.current = null;
      rerouteGlowRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const tile = tileLayerRef.current;
    if (!map || !tile) return;
    void import("leaflet").then((L) => {
      map.removeLayer(tile);
      tileLayerRef.current = L.tileLayer(theme === "dark" ? TILE_DARK : TILE_LIGHT, {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);
      tileLayerRef.current.bringToBack();
    });
  }, [theme]);

  const flyHome = () => focusHotspot(GLOBAL_HOTSPOTS[0]);
  const flyWorld = () => {
    mapRef.current?.flyTo(WORLD_CENTER, 2, { animate: true, duration: 1.35 });
  };

  const isDark = theme === "dark";

  return (
    <div className={`relative h-full w-full overflow-hidden ${isDark ? "bg-[#0d1018]" : "bg-[#e8eef5]"}`}>
      {/* Background map view layer */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      {/* Dynamic dimming/contrast mapping overlay */}
      {isDark && (
        <div className="pointer-events-none absolute inset-0 bg-[#0d1018]/35 mix-blend-multiply z-10" />
      )}

      {/* HEADER CONTROLS INTERFACE PANEL */}
      <HudOverlay selected={selected} theme={theme} />

      {/* CRITICAL HOTSPOT TRACKER LIST SIDEBAR */}
      <HotspotList selected={selected} theme={theme} onSelect={focusHotspot} />

      {/* BOTTOM-RIGHT HAZARD AI ASSISTANT */}
      <HazardAssistant open={assistantOpen} theme={theme} onOpenChange={setAssistantOpen} />

      {/* HORIZONTAL MODE SECTOR SWITCH CONTROLS */}
      <div 
        className={`pointer-events-auto absolute left-1/2 top-12 flex -translate-x-1/2 items-center gap-1 border border-cyan-500/30 backdrop-blur-md rounded shadow-sm transition-colors duration-200 z-40 ${
          isDark ? "bg-slate-950/70" : "bg-white/90"
        }`}
      >
        <button
          onClick={flyHome}
          className={`px-3 py-1.5 text-[10px] uppercase font-semibold tracking-[0.25em] transition-colors hover:bg-cyan-500/10 ${
            isDark ? "text-cyan-400" : "text-cyan-600"
          }`}
        >
          ◎ Active Sector
        </button>
        <span className="h-4 w-px bg-cyan-500/30" />
        <button
          onClick={flyWorld}
          className={`px-3 py-1.5 text-[10px] uppercase font-semibold tracking-[0.25em] transition-colors hover:bg-cyan-500/10 ${
            isDark ? "text-cyan-400" : "text-cyan-600"
          }`}
        >
          ◯ Global View
        </button>
      </div>

      {/* RADAR DECORATIVE EMISSION GRID */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.05] z-10">
        <div
          className="absolute left-0 right-0 h-24 animate-scan"
          style={{ background: "linear-gradient(to bottom, transparent, #06b6d4, transparent)" }}
        />
      </div>
    </div>
  );
}

function HazardAssistant({
  open,
  theme,
  onOpenChange,
}: {
  open: boolean;
  theme: "dark" | "light";
  onOpenChange: (open: boolean) => void;
}) {
  const isDark = theme === "dark";
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [reply, setReply] = useState("");

  const toggleAction = (action: string) => {
    setCompletedActions((current) =>
      current.includes(action) ? current.filter((item) => item !== action) : [...current, action],
    );
  };

  return (
    <div className="pointer-events-auto absolute bottom-12 right-5 z-50 flex max-w-[calc(100%-1.25rem)] flex-col items-end gap-3">
      {open && (
        <div
          className={`flex max-h-[calc(100vh-150px)] w-[330px] flex-col overflow-hidden rounded border border-warning/60 shadow-2xl backdrop-blur-md transition-colors duration-200 ${
            isDark ? "bg-slate-950/92 text-slate-100" : "bg-white/95 text-slate-900"
          }`}
        >
          <div className="flex items-start gap-2.5 border-b border-warning/30 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-warning bg-warning/15 text-warning">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] uppercase tracking-[0.25em] text-warning">
                Hazard AI Assistant
              </div>
              <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-warning">
                Collapse + utility leak risk
              </div>
              <div className={`mt-0.5 text-[9px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                AI triage chat for Sector 4 responders.
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center border transition-colors ${
                isDark
                  ? "border-slate-700 text-slate-400 hover:border-warning/60 hover:text-warning"
                  : "border-slate-300 text-slate-500 hover:border-warning hover:text-warning"
              }`}
              aria-label="Close hazard assistant"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
            <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-warning/60 bg-warning/15 text-warning">
                <BrainCircuit className="h-3.5 w-3.5" />
              </div>
              <div className={`max-w-[252px] border px-2.5 py-2 text-[10px] leading-relaxed ${
                isDark ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50"
              }`}>
                <div className="font-bold uppercase tracking-[0.12em] text-warning">
                  Collapse + utility leak risk detected.
                </div>
                <div className={`mt-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  I am seeing structural damage, geofence danger, blocked approach, and possible gas/electrical exposure.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-warning/60 bg-warning/15 text-warning">
                <BrainCircuit className="h-3.5 w-3.5" />
              </div>
              <div className={`max-w-[270px] border px-2.5 py-2 ${
                isDark ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50"
              }`}>
                <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Suggested Actions
                </div>
                <div className="mt-2 space-y-1.5">
                  {AI_ACTIONS.map((item, index) => (
                    <button
                      key={item.action}
                      onClick={() => toggleAction(item.action)}
                      className={`flex w-full items-start gap-2 border px-2 py-1.5 text-left text-[10px] leading-relaxed transition-colors ${
                        completedActions.includes(item.action)
                          ? "border-green-300 bg-green-100/90 text-green-900"
                          : isDark
                            ? "border-slate-700 bg-slate-950/60 hover:border-warning/60"
                            : "border-slate-300 bg-white hover:border-warning"
                      }`}
                    >
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                        completedActions.includes(item.action) ? "border-green-500 bg-green-200 text-green-900" : "border-warning text-warning"
                      }`}>
                        {completedActions.includes(item.action) ? <Check className="h-3 w-3" /> : String(index + 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">{item.action}</span>
                        <span className={`mt-1 flex flex-wrap gap-1.5 text-[8px] uppercase tracking-[0.16em] ${
                          completedActions.includes(item.action) ? "text-green-800" : "text-muted-foreground"
                        }`}>
                          <span>{item.priority}</span>
                          <span>Risk: {item.risk}</span>
                        </span>
                        <span className={`mt-0.5 block text-[9px] leading-snug ${
                          completedActions.includes(item.action) ? "text-green-800/80" : isDark ? "text-slate-400" : "text-slate-600"
                        }`}>
                          {item.reason}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          <div className="mt-2.5 border-t border-warning/25 pt-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Who Should Go
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {RESPONSE_TEAMS.map((team) => {
                const Icon = team.icon;
                return (
                  <div key={team.label} className={`border px-2.5 py-2 ${isDark ? "border-slate-800 bg-slate-900/55" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${team.tone}`} />
                      <span className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground">{team.label}</span>
                    </div>
                    <div className={`mt-1 text-[10px] font-semibold uppercase leading-snug ${team.tone}`}>
                      {team.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-warning/25 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Ask the AI a follow-up..."
                className={`min-w-0 flex-1 border px-3 py-2 text-[10px] outline-none transition-colors placeholder:text-muted-foreground focus:border-warning ${
                  isDark ? "border-slate-700 bg-slate-950/70 text-slate-100" : "border-slate-300 bg-white text-slate-900"
                }`}
              />
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-warning bg-warning text-slate-950 transition-colors hover:bg-warning/85"
                aria-label="Send responder question"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => onOpenChange(!open)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-950 bg-yellow-400 text-slate-950 shadow-[0_0_28px_color-mix(in_oklab,var(--warning)_75%,transparent)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-warning/60"
        aria-label={open ? "Close hazard assistant" : "Open hazard assistant"}
      >
        <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-300/45 animate-ping" />
        <AlertTriangle className="relative h-7 w-7" />
      </button>
    </div>
  );
}

function HotspotList({
  selected,
  theme,
  onSelect,
}: {
  selected: Hotspot | null;
  theme: "dark" | "light";
  onSelect: (h: Hotspot) => void;
}) {
  const isDark = theme === "dark";
  return (
    <div 
      className={`pointer-events-auto absolute right-5 top-28 w-64 border border-cyan-500/30 backdrop-blur-md rounded shadow-md transition-colors duration-200 z-40 ${
        isDark ? "bg-slate-950/80" : "bg-white/90"
      }`}
    >
      <div className="flex items-center justify-between border-b border-cyan-500/30 px-3 py-2">
        <span className={`text-[10px] uppercase font-bold tracking-[0.25em] ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>
          ◢ Global Critical Index
        </span>
        <span className={`text-[9px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {GLOBAL_HOTSPOTS.length} SECTORS
        </span>
      </div>
      <ul className="max-h-[calc(100vh-220px)] overflow-y-auto">
        {GLOBAL_HOTSPOTS.map((hotspot) => {
          const active = selected?.id === hotspot.id;
          return (
            <li key={hotspot.id}>
              <button
                onClick={() => onSelect(hotspot)}
                className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-[10px] transition-colors hover:bg-cyan-500/5 ${
                  active ? "border-cyan-500 bg-cyan-500/10" : "border-transparent"
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: SEVERITY_COLOR[hotspot.severity],
                    boxShadow: `0 0 8px ${SEVERITY_COLOR[hotspot.severity]}`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className={`truncate uppercase tracking-[0.15em] font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                    {hotspot.name}
                  </div>
                  <div className={`flex items-center gap-2 text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    <span style={{ color: SEVERITY_COLOR[hotspot.severity], fontWeight: 600 }}>
                      {hotspot.severity.toUpperCase()}
                    </span>
                    <span>· M{hotspot.magnitude.toFixed(1)}</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HudOverlay({ selected, theme }: { selected: Hotspot | null; theme: "dark" | "light" }) {
  const isDark = theme === "dark";
  
  return (
    <>
      {/* NAVIGATION INDICATORS METRIC TOP HEADER */}
      <div 
        className={`pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between border-b border-cyan-500/10 px-5 py-2 backdrop-blur-md transition-colors duration-200 z-40 ${
          isDark ? "bg-slate-950/60 text-slate-300" : "bg-white/80 text-slate-800"
        }`}
      >
        <div className="flex items-center gap-4 text-[10px] uppercase font-medium tracking-[0.22em]">
          <span className={`pointer-events-auto flex items-center gap-2 font-bold ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>
            <Crosshair className="h-3 w-3" />
            {selected ? selected.name : "Active Zone"}
          </span>
          {selected && (
            <>
              <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                Lat {selected.lat.toFixed(4)}° · Lon {selected.lng.toFixed(4)}°
              </span>
              <span style={{ color: SEVERITY_COLOR[selected.severity], fontWeight: 600 }}>
                M{selected.magnitude.toFixed(1)} · {selected.severity.toUpperCase()}
              </span>
            </>
          )}
        </div>
        <div className={`flex items-center gap-3 text-[10px] uppercase font-medium tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          <span className="flex items-center gap-1.5">
            <Layers className="h-3 w-3" /> {theme === "dark" ? "Dark" : "Light"} Layer
          </span>
          <span className="flex items-center gap-1.5">
            <Compass className="h-3 w-3" /> Live OSRM
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize2 className="h-3 w-3" /> Global HUD
          </span>
        </div>
      </div>

      {/* MAP STATUS AND LEGEND FOOTER PANEL */}
      <div 
        className={`pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-cyan-500/10 px-5 py-2 backdrop-blur-md transition-colors duration-200 z-40 ${
          isDark ? "bg-slate-950/60 text-slate-400" : "bg-white/80 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.22em]">
          <LegendDot color="#ef4444" label="Critical" isDark={isDark} />
          <LegendDot color="#f59e0b" label="Warning" isDark={isDark} />
          <LegendDot color="#06b6d4" label="Watch" isDark={isDark} />
          <LegendDot color="#f97316" label="Blockage" isDark={isDark} />
        </div>
        <div className={`text-[10px] uppercase tracking-[0.22em] font-medium ${isDark ? "text-slate-500" : "text-slate-600"}`}>
          Map Engine: CARTO Framework · Telemetry: OSRM Core
        </div>
      </div>
    </>
  );
}

function LegendDot({ color, label, isDark }: { color: string; label: string; isDark: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-medium ${isDark ? "text-slate-300" : "text-slate-800"}`}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
    </span>
  );
}
