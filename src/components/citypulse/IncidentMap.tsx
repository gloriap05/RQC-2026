import { Crosshair, Maximize2, Layers, Compass } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
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

const REROUTE_LINE: [number, number][] = [
  [37.782, -122.416],
  [37.7822, -122.414],
  [37.7836, -122.4128],
  [37.7842, -122.4115],
  [37.7848, -122.4102],
];

const BLOCKED_LINE: [number, number][] = [
  [37.782, -122.416],
  [37.782, -122.4135],
  [37.7842, -122.413],
  [37.7848, -122.411],
];

const BLOCKAGE_POINT: [number, number] = [37.7836, -122.413];
const ORIGIN_POINT: [number, number] = [37.782, -122.416];
const TILT_BUILDING: [number, number][] = [
  [37.7854, -122.4088],
  [37.7854, -122.4082],
  [37.785, -122.4082],
  [37.785, -122.4088],
];

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
  watch: "#22d3ee",
};

function hotspotZoom(hotspot: Hotspot) {
  if (hotspot.id === "sf") return 15;
  if (hotspot.severity === "critical") return 8;
  if (hotspot.severity === "warning") return 6;
  return 5;
}

export function IncidentMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [selected, setSelected] = useState<Hotspot | null>(GLOBAL_HOTSPOTS[0]);

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

    void import("leaflet").then((L) => {
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
        .addAttribution("CARTO · OpenStreetMap")
        .addTo(map);

      L.tileLayer(TILE_URL, {
        maxZoom: 19,
      }).addTo(map);

      L.polygon(GEOFENCE_COORDS, {
        color: "#ef4444",
        weight: 2.5,
        dashArray: "8 6",
        fillColor: "#ef4444",
        fillOpacity: 0.08,
      }).addTo(map);

      CIVILIAN_HEAT.forEach((point) => {
        L.circleMarker([point.lat, point.lng], {
          radius: 10 + point.weight * 10,
          stroke: false,
          fillColor: point.weight > 0.72 ? "#ef4444" : "#f59e0b",
          fillOpacity: 0.12 + point.weight * 0.18,
        }).addTo(map);
      });

      L.polyline(BLOCKED_LINE, {
        color: "#67e8f9",
        weight: 2,
        opacity: 0.25,
        dashArray: "5 10",
      }).addTo(map);

      L.polyline(REROUTE_LINE, {
        color: "#67e8f9",
        weight: 10,
        opacity: 0.18,
      }).addTo(map);

      const rerouteLine = L.polyline(REROUTE_LINE, {
        color: "#67e8f9",
        weight: 3,
        opacity: 0.95,
        dashArray: "12 12",
        lineCap: "round",
      }).addTo(map);

      dashTimer = window.setInterval(() => {
        dashStep = (dashStep + 1) % 24;
        rerouteLine.setStyle({ dashOffset: `${dashStep}` });
      }, 100);

      L.circleMarker(ORIGIN_POINT, {
        radius: 6,
        color: "#ffffff",
        weight: 1.5,
        fillColor: "#67e8f9",
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

      L.polygon(TILT_BUILDING, {
        color: "#f59e0b",
        weight: 2,
        fillColor: "#f59e0b",
        fillOpacity: 0.38,
      })
        .bindTooltip("OSM 3D Comparison Flag: Tilt Delta Detected: 2.4° (Pre-Collapse Warning)", {
          permanent: true,
          direction: "top",
          offset: [0, -8],
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
    };
  }, []);

  const flyHome = () => focusHotspot(GLOBAL_HOTSPOTS[0]);

  const flyWorld = () => {
    mapRef.current?.flyTo(WORLD_CENTER, 2, { animate: true, duration: 1.35 });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0d1018]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[#0d1018]/12 mix-blend-multiply" />

      <HudOverlay selected={selected} />

      <HotspotList
        selected={selected}
        onSelect={(hotspot) => {
          focusHotspot(hotspot);
        }}
      />

      <div className="pointer-events-auto absolute left-1/2 top-12 flex -translate-x-1/2 items-center gap-1 border border-cyan-route/30 bg-mask/70 backdrop-blur-sm">
        <button
          onClick={flyHome}
          className="px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-cyan-route hover:bg-cyan-route/10"
        >
          ◎ Active Sector
        </button>
        <span className="h-4 w-px bg-cyan-route/30" />
        <button
          onClick={flyWorld}
          className="px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-cyan-route hover:bg-cyan-route/10"
        >
          ◯ Global View
        </button>
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.05]">
        <div
          className="absolute left-0 right-0 h-24 animate-scan"
          style={{ background: "linear-gradient(to bottom, transparent, var(--cyan-route), transparent)" }}
        />
      </div>
    </div>
  );
}

function HotspotList({
  selected,
  onSelect,
}: {
  selected: Hotspot | null;
  onSelect: (h: Hotspot) => void;
}) {
  return (
    <div className="pointer-events-auto absolute right-5 top-28 w-64 border border-cyan-route/30 bg-mask/80 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-cyan-route/30 px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-route">◢ Global Critical Index</span>
        <span className="text-[9px] text-muted-foreground">{GLOBAL_HOTSPOTS.length}</span>
      </div>
      <ul className="max-h-[calc(100vh-220px)] overflow-y-auto">
        {GLOBAL_HOTSPOTS.map((hotspot) => {
          const active = selected?.id === hotspot.id;
          return (
            <li key={hotspot.id}>
              <button
                onClick={() => onSelect(hotspot)}
                className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-[10px] hover:bg-cyan-route/5 ${
                  active ? "border-cyan-route bg-cyan-route/10" : "border-transparent"
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
                  <div className="truncate uppercase tracking-[0.15em] text-foreground">{hotspot.name}</div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span style={{ color: SEVERITY_COLOR[hotspot.severity] }}>{hotspot.severity.toUpperCase()}</span>
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

function HudOverlay({ selected }: { selected: Hotspot | null }) {
  return (
    <>
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between border-b border-border/60 bg-mask/50 px-5 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="flex items-center gap-2 text-cyan-route">
            <Crosshair className="h-3 w-3" />
            {selected ? selected.name : "Active Zone"}
          </span>
          {selected && (
            <>
              <span>Lat {selected.lat.toFixed(4)}° · Lon {selected.lng.toFixed(4)}°</span>
              <span style={{ color: SEVERITY_COLOR[selected.severity] }}>
                M{selected.magnitude.toFixed(1)} · {selected.severity.toUpperCase()}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3 w-3" /> Leaflet Tiles
          </span>
          <span className="flex items-center gap-1.5">
            <Compass className="h-3 w-3" /> Tactical Overlay
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize2 className="h-3 w-3" /> Worldwide
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-border/60 bg-mask/50 px-5 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.22em]">
          <LegendDot color="#ef4444" label="Critical" />
          <LegendDot color="#f59e0b" label="Warning / Tilt" />
          <LegendDot color="#22d3ee" label="Reroute / Watch" />
          <LegendDot color="#f97316" label="Blockage" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Tiles: CARTO Dark · Raster · OSM v2026.05</div>
      </div>
    </>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
    </span>
  );
}
