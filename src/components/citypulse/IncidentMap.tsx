import { AlertTriangle, Ambulance, BrainCircuit, Check, Compass, Crosshair, Flame, Layers, Maximize2, Send, ShieldAlert, Users, X } from "lucide-react";
import { hazardConfig } from "@/lib/hazardConfig";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MlMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const ACTIVE_CENTER: [number, number] = [-122.4094, 37.7849];
const WORLD_CENTER: [number, number] = [10, 25];

const GEOFENCE_COORDS: [number, number][] = [
  [-122.4118, 37.7858],
  [-122.4108, 37.7866],
  [-122.409, 37.7868],
  [-122.4078, 37.786],
  [-122.4074, 37.7848],
  [-122.408, 37.7838],
  [-122.4094, 37.7832],
  [-122.411, 37.7836],
  [-122.412, 37.7846],
  [-122.4118, 37.7858],
];

const ORIGIN_POINT: [number, number] = [-122.416, 37.782];
const DEST_POINT: [number, number] = [-122.4094, 37.7849];
const BLOCKAGE_POINT: [number, number] = [-122.413, 37.7836];

const CIVILIAN_HEAT = Array.from({ length: 60 }).map(() => {
  const radius = Math.random() * 0.0012;
  const angle = Math.random() * Math.PI * 2;
  const weight = 0.5 + Math.random() * 0.5;
  return {
    lng: ACTIVE_CENTER[0] + Math.cos(angle) * radius,
    lat: ACTIVE_CENTER[1] + Math.sin(angle) * radius * 0.7,
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

function hotspotZoom(h: Hotspot) {
  if (h.id === "sf") return 15.5;
  if (h.severity === "critical") return 8;
  if (h.severity === "warning") return 6;
  return 5;
}

interface IncidentMapProps {
  theme: "dark" | "light";
}

export function IncidentMap({ theme }: IncidentMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [selected, setSelected] = useState<Hotspot | null>(GLOBAL_HOTSPOTS[0]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const focusHotspot = (hotspot: Hotspot) => {
    setSelected(hotspot);
    mapRef.current?.flyTo({
      center: [hotspot.lng, hotspot.lat],
      zoom: hotspotZoom(hotspot),
      pitch: hotspot.id === "sf" ? 60 : 30,
      bearing: hotspot.id === "sf" ? -20 : 0,
      duration: 1400,
      essential: true,
    });
  };

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: theme === "dark" ? STYLE_DARK : STYLE_LIGHT,
      center: ACTIVE_CENTER,
      zoom: 15.5,
      pitch: 60,
      bearing: -20,
      attributionControl: false,
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    requestAnimationFrame(() => map.resize());

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: "CARTO · OpenStreetMap · OSRM" }),
      "bottom-left",
    );

    let dashStep = 0;
    let dashTimer: number | null = null;
    let cancelled = false;

    const wireLayers = async () => {
      // 3D buildings (Carto basemap source layer "building")
      try {
        const layers = map.getStyle().layers ?? [];
        let labelLayerId: string | undefined;
        for (const l of layers) {
          if (l.type === "symbol") {
            labelLayerId = l.id;
            break;
          }
        }
        if (map.getSource("carto")) {
          map.addLayer(
            {
              id: "3d-buildings",
              source: "carto",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 14,
              paint: {
                "fill-extrusion-color": themeRef.current === "dark" ? "#1b2230" : "#cbd5e1",
                "fill-extrusion-height": [
                  "case",
                  ["has", "render_height"],
                  ["get", "render_height"],
                  ["has", "height"],
                  ["get", "height"],
                  12,
                ],
                "fill-extrusion-base": 0,
                "fill-extrusion-opacity": 0.85,
              },
            },
            labelLayerId,
          );
        }
      } catch {
        // ignore
      }

      // Geofence polygon
      map.addSource("geofence", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [GEOFENCE_COORDS] },
        },
      });
      map.addLayer({
        id: "geofence-fill",
        type: "fill",
        source: "geofence",
        paint: { "fill-color": "#ef4444", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: "geofence-line",
        type: "line",
        source: "geofence",
        paint: {
          "line-color": "#ef4444",
          "line-width": 2.5,
          "line-dasharray": [2, 1.5],
        },
      });

      const hazardEl = document.createElement("div");
      hazardEl.className = "citypulse-hazard-marker";
      hazardEl.setAttribute("aria-label", "Critical hazard");
      hazardEl.innerHTML = '<div class="citypulse-hazard-triangle">!</div>';
      markersRef.current.push(
        new maplibregl.Marker({ element: hazardEl, anchor: "bottom" })
          .setLngLat(DEST_POINT)
          .setPopup(
            new Popup({ closeButton: false, offset: 24 }).setHTML(
              tip("Hazard: collapse + utility leak risk", "#f59e0b"),
            ),
          )
          .addTo(map),
      );

      // Geofence label (always visible)
      const gfLngs = GEOFENCE_COORDS.map((c) => c[0]);
      const gfLats = GEOFENCE_COORDS.map((c) => c[1]);
      const gfCentroid: [number, number] = [
        (Math.min(...gfLngs) + Math.max(...gfLngs)) / 2,
        Math.max(...gfLats) + 0.0004,
      ];
      const gfLabelEl = document.createElement("div");
      gfLabelEl.style.cssText =
        "font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#fff;background:rgba(127,29,29,0.92);border:1px solid #ef4444;padding:4px 8px;border-radius:2px;box-shadow:0 0 12px #ef444466;white-space:nowrap;pointer-events:none;";
      gfLabelEl.textContent = "⚠ Red Zone · Restricted Perimeter";
      markersRef.current.push(
        new maplibregl.Marker({ element: gfLabelEl }).setLngLat(gfCentroid).addTo(map),
      );

      // Civilian heat
      map.addSource("civilian-heat", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: CIVILIAN_HEAT.map((p) => ({
            type: "Feature",
            properties: { weight: p.weight },
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          })),
        },
      });
      map.addLayer({
        id: "civilian-heat-layer",
        type: "heatmap",
        source: "civilian-heat",
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": 1.2,
          "heatmap-radius": 28,
          "heatmap-opacity": 0.7,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(6,182,212,0)",
            0.3, "rgba(6,182,212,0.4)",
            0.6, "rgba(245,158,11,0.6)",
            1, "rgba(239,68,68,0.85)",
          ],
        },
      });

      // Reroute (initial straight, replaced by OSRM)
      let routeCoords: [number, number][] = [ORIGIN_POINT, DEST_POINT];
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${ORIGIN_POINT[0]},${ORIGIN_POINT[1]};${DEST_POINT[0]},${DEST_POINT[1]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const json = await res.json();
        const coords = json?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length) {
          routeCoords = coords as [number, number][];
        }
      } catch {
        // fallback
      }
      if (cancelled || !mapRef.current) return;

      map.addSource("reroute", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routeCoords } },
      });
      map.addLayer({
        id: "reroute-glow",
        type: "line",
        source: "reroute",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#06b6d4", "line-width": 12, "line-opacity": 0.22, "line-blur": 6 },
      });
      map.addLayer({
        id: "reroute-line",
        type: "line",
        source: "reroute",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#06b6d4",
          "line-width": 4,
          "line-opacity": 0.98,
          "line-dasharray": [2, 2],
        },
      });

      const dashSequence: number[][] = [];
      for (let i = 0; i < 8; i++) {
        dashSequence.push([2, 2, i * 0.25, 0]);
      }
      dashTimer = window.setInterval(() => {
        dashStep = (dashStep + 1) % 8;
        const t = dashStep / 8;
        if (mapRef.current?.getLayer("reroute-line")) {
          mapRef.current.setPaintProperty("reroute-line", "line-dasharray", [2, 2 + t * 2]);
        }
      }, 120);

      // Origin marker
      const originEl = labeledMarker(
        '<div style="width:14px;height:14px;border-radius:9999px;background:#06b6d4;border:2px solid #fff;box-shadow:0 0 14px #06b6d4;"></div>',
        "UNIT-07 · Origin",
        "#06b6d4",
      );
      markersRef.current.push(
        new maplibregl.Marker({ element: originEl, anchor: "bottom" })
          .setLngLat(ORIGIN_POINT)
          .addTo(map),
      );

      // Destination marker
      const destEl = labeledMarker(
        '<div style="width:14px;height:14px;border-radius:9999px;background:#22c55e;border:2px solid #fff;box-shadow:0 0 14px #22c55e;"></div>',
        "Destination · Safe Zone",
        "#22c55e",
      );
      markersRef.current.push(
        new maplibregl.Marker({ element: destEl, anchor: "bottom" })
          .setLngLat(DEST_POINT)
          .addTo(map),
      );

      // Blockage marker
      const blockEl = labeledMarker(
        '<div style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;color:#f97316;font-size:22px;font-weight:700;text-shadow:0 0 12px #f97316;line-height:1;">✕</div>',
        "Blockage · Re-route Trigger",
        "#f97316",
      );
      markersRef.current.push(
        new maplibregl.Marker({ element: blockEl, anchor: "bottom" })
          .setLngLat(BLOCKAGE_POINT)
          .addTo(map),
      );

      // Global hotspots
      GLOBAL_HOTSPOTS.forEach((h) => {
        const color = SEVERITY_COLOR[h.severity];
        const el = document.createElement("div");
        const size = 10 + h.magnitude * 2;
        el.style.cssText = `position:relative;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:1.5px solid #fff;box-shadow:0 0 ${
          8 + h.magnitude * 2
        }px ${color};cursor:pointer;`;
        const halo = document.createElement("div");
        halo.style.cssText = `position:absolute;inset:-${h.magnitude * 3}px;border-radius:9999px;background:${color};opacity:0.18;animation:citypulse-ping 2.4s ease-out infinite;`;
        el.appendChild(halo);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          focusHotspot(h);
        });
        markersRef.current.push(
          new maplibregl.Marker({ element: el })
            .setLngLat([h.lng, h.lat])
            .setPopup(
              new Popup({ closeButton: false, offset: 14 }).setHTML(
                tip(`${h.name} · ${h.severity.toUpperCase()} · M${h.magnitude.toFixed(1)}`, color),
              ),
            )
            .addTo(map),
        );
      });

      void renderAftershocks(map);
    };

    map.on("load", () => {
      void wireLayers();
    });

    return () => {
      cancelled = true;
      if (dashTimer) window.clearInterval(dashTimer);
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    let interval: number | null = null;

    const refresh = async () => {
      const map = mapRef.current;
      if (!mounted || !map?.isStyleLoaded()) return;
      await renderAftershocks(map);
    };

    interval = window.setInterval(refresh, 60_000);

    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  // Theme switch — swap style and re-add custom layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const newStyle = theme === "dark" ? STYLE_DARK : STYLE_LIGHT;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();
    const bearing = map.getBearing();

    map.setStyle(newStyle);
    map.once("styledata", () => {
      map.jumpTo({ center, zoom, pitch, bearing });
      // Re-add 3D buildings on new style
      try {
        if (map.getLayer("3d-buildings")) return;
        const layers = map.getStyle().layers ?? [];
        let labelLayerId: string | undefined;
        for (const l of layers) {
          if (l.type === "symbol") {
            labelLayerId = l.id;
            break;
          }
        }
        if (map.getSource("carto")) {
          map.addLayer(
            {
              id: "3d-buildings",
              source: "carto",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 14,
              paint: {
                "fill-extrusion-color": theme === "dark" ? "#1b2230" : "#cbd5e1",
                "fill-extrusion-height": [
                  "case",
                  ["has", "render_height"],
                  ["get", "render_height"],
                  ["has", "height"],
                  ["get", "height"],
                  12,
                ],
                "fill-extrusion-base": 0,
                "fill-extrusion-opacity": 0.85,
              },
            },
            labelLayerId,
          );
        }
      } catch {
        // ignore
      }
    });
  }, [theme]);

  const flyHome = () => focusHotspot(GLOBAL_HOTSPOTS[0]);
  const flyWorld = () => {
    mapRef.current?.flyTo({ center: WORLD_CENTER, zoom: 1.6, pitch: 0, bearing: 0, duration: 1500, essential: true });
  };

  const isDark = theme === "dark";

  return (
    <div className={`relative h-full w-full overflow-hidden ${isDark ? "bg-[#0d1018]" : "bg-[#e8eef5]"}`}>
      <div ref={containerRef} className="absolute inset-0 z-0" style={{ width: "100%", height: "100%" }} />

      {isDark && (
        <div className="pointer-events-none absolute inset-0 bg-[#0d1018]/35 mix-blend-multiply z-10" />
      )}

      <HudOverlay selected={selected} theme={theme} />
      <HotspotList selected={selected} theme={theme} onSelect={focusHotspot} />
      <HazardAssistant open={assistantOpen} theme={theme} onOpenChange={setAssistantOpen} />

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

      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.05] z-10">
        <div
          className="absolute left-0 right-0 h-24 animate-scan"
          style={{ background: "linear-gradient(to bottom, transparent, #06b6d4, transparent)" }}
        />
      </div>
    </div>
  );
}

function tip(text: string, color = "#06b6d4") {
  return `<div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#fff;background:rgba(2,6,23,0.92);border:1px solid ${color};padding:6px 10px;border-radius:2px;box-shadow:0 0 14px ${color}66;white-space:nowrap;">${text}</div>`;
}

function labeledMarker(iconHTML: string, label: string, color: string): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:4px;transform:translateY(0);";
  const icon = document.createElement("div");
  icon.style.cssText = "display:flex;align-items:center;justify-content:center;";
  icon.innerHTML = iconHTML;
  const tag = document.createElement("div");
  tag.textContent = label;
  tag.style.cssText = `font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#fff;background:rgba(2,6,23,0.9);border:1px solid ${color};padding:3px 6px;border-radius:2px;box-shadow:0 0 10px ${color}55;white-space:nowrap;`;
  wrap.appendChild(icon);
  wrap.appendChild(tag);
  return wrap;
}

async function renderAftershocks(map: MlMap) {
  try {
    const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson");
    const json = await res.json();
    const features = json.features || [];
    const cfg = hazardConfig.aftershock;
    const now = Date.now();
    let omoriSum = 0;

    const filtered = features
      .filter((feature: any) => {
        const [lng, lat] = feature.geometry.coordinates;
        const radiusKm = distanceKm(ACTIVE_CENTER[1], ACTIVE_CENTER[0], lat, lng);
        return radiusKm <= cfg.proximityKm;
      })
      .slice(0, cfg.maxEvents)
      .map((feature: any) => {
        const [lng, lat] = feature.geometry.coordinates;
        const mag = feature.properties?.mag || 0;
        const time = feature.properties?.time || now;
        const ageHours = Math.max(0.001, (now - time) / (1000 * 60 * 60));
        omoriSum += Math.max(0.5, mag) * (1 / (1 + ageHours));

        return {
          type: "Feature",
          properties: {
            mag,
            place: feature.properties?.place || "",
            opacity: Math.max(0.12, Math.min(0.95, 1 / (1 + ageHours / cfg.opacityDecayHalfLifeHours))),
          },
          geometry: { type: "Point", coordinates: [lng, lat] },
        };
      });

    const data = {
      type: "FeatureCollection",
      features: filtered,
    };

    const source = map.getSource("aftershocks") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data as any);
    } else {
      map.addSource("aftershocks", { type: "geojson", data: data as any });
      map.addLayer({
        id: "aftershock-circles",
        type: "circle",
        source: "aftershocks",
        paint: {
          "circle-radius": ["+", 4, ["*", ["coalesce", ["get", "mag"], 0], cfg.radiusScale]],
          "circle-color": [
            "case",
            [">=", ["coalesce", ["get", "mag"], 0], 4.5],
            "#ef4444",
            [">=", ["coalesce", ["get", "mag"], 0], 3],
            "#f59e0b",
            "#06b6d4",
          ],
          "circle-opacity": ["coalesce", ["get", "opacity"], 0.4],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.65,
        },
      });
    }

    const predicted = Math.min(99, Math.round(omoriSum * 8));
    const existing = document.getElementById("aftershock-predicted");
    if (existing) existing.remove();

    const ctrl = document.createElement("div");
    ctrl.id = "aftershock-predicted";
    ctrl.className = "pointer-events-auto absolute left-4 bottom-12 z-50";
    ctrl.innerHTML = `
      <div class="rounded border border-slate-800 bg-slate-950/80 p-1.5 text-xs text-slate-100">
        <div class="text-[9px] uppercase text-slate-300">Aftershock (1h)</div>
        <div class="mt-0.5 text-xs font-semibold">${predicted}%</div>
      </div>
    `;
    map.getContainer().appendChild(ctrl);
  } catch (error) {
    console.warn("aftershock overlay fetch failed", error);
  }
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    <div className="pointer-events-none absolute inset-0 z-50">
      {open && (
        <div
          className={`pointer-events-auto absolute bottom-16 right-[19rem] flex max-h-[calc(100%-6rem)] w-[360px] flex-col overflow-hidden rounded border border-warning/60 shadow-2xl backdrop-blur-md transition-colors duration-200 ${
            isDark ? "bg-slate-950/92 text-slate-100" : "bg-white/95 text-slate-900"
          }`}
        >
          <div className="flex items-start gap-2 border-b border-warning/30 px-2.5 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-warning bg-warning/15 text-warning">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] uppercase tracking-[0.25em] text-warning">
                Hazard AI Assistant
              </div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-warning">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center border border-warning/60 bg-warning/15 text-warning">
                  <BrainCircuit className="h-3.5 w-3.5" />
                </div>
                <div className={`max-w-[290px] border px-2.5 py-1.5 text-[9px] leading-relaxed ${
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
                <div className="flex h-5 w-5 shrink-0 items-center justify-center border border-warning/60 bg-warning/15 text-warning">
                  <BrainCircuit className="h-3.5 w-3.5" />
                </div>
                <div className={`max-w-[308px] border px-2.5 py-1.5 ${
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
                      className={`flex w-full items-start gap-2 border px-2 py-1.5 text-left text-[9px] leading-relaxed transition-colors ${
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
                          <span className={`mt-0.5 flex flex-wrap gap-1.5 text-[8px] uppercase tracking-[0.16em] ${
                            completedActions.includes(item.action) ? "text-green-800" : "text-muted-foreground"
                          }`}>
                            <span>{item.priority}</span>
                            <span>Risk: {item.risk}</span>
                          </span>
                          <span className={`mt-0.5 block text-[8px] leading-snug ${
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
                <div className="mt-2 grid grid-cols-1 gap-1.5">
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

          <div className="shrink-0 border-t border-warning/25 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Ask the AI a follow-up..."
                className={`min-w-0 flex-1 border px-2.5 py-2 text-[9px] outline-none transition-colors placeholder:text-muted-foreground focus:border-warning ${
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
        className="pointer-events-auto absolute bottom-16 right-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-950 bg-yellow-400 text-slate-950 shadow-[0_0_28px_color-mix(in_oklab,var(--warning)_75%,transparent)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-warning/60"
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
      className={`pointer-events-auto absolute right-4 top-24 max-h-[calc(100%-13rem)] w-72 overflow-hidden border border-cyan-500/30 backdrop-blur-md rounded shadow-md transition-colors duration-200 z-40 ${
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
      <ul className="max-h-[calc(100%-38px)] overflow-y-auto">
        {GLOBAL_HOTSPOTS.map((hotspot) => {
          const active = selected?.id === hotspot.id;
          return (
            <li key={hotspot.id}>
              <button
                onClick={() => onSelect(hotspot)}
                className={`flex w-full items-center gap-2 border-l-2 px-3 py-1.5 text-left text-[9px] transition-colors hover:bg-cyan-500/5 ${
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
                  <div className={`flex items-center gap-2 text-[8px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
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
            <Layers className="h-3 w-3" /> {theme === "dark" ? "Dark" : "Light"} 3D
          </span>
          <span className="flex items-center gap-1.5">
            <Compass className="h-3 w-3" /> Live OSRM
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize2 className="h-3 w-3" /> MapLibre HUD
          </span>
        </div>
      </div>

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
          Map Engine: MapLibre GL · 3D Buildings · Telemetry: OSRM Core
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
