import React, { useState } from 'react';
import { ShieldAlert, Zap, Droplet, Flame } from 'lucide-react';
import { CascadingHazardsPanel } from './components/CascadingHazards';
import EscalationPanel from './components/EscalationPanel';
import AftershockPanel from './components/AftershockPanel';
import TripleThreatPanel from './components/TripleThreatPanel';
import ThreatTimeline from './components/ThreatTimeline';
import GoldenHourClock from './components/GoldenHourClock';

interface HazardEvent {
  id: string;
  timeOffset: string;
  title: string;
  description: string;
  type: 'seismic' | 'power' | 'water' | 'fire';
  status: 'active' | 'predicted';
  probability: number;
  lat: number;
  lng: number;
}

const mockHazardTimeline: HazardEvent[] = [
  { id: 'h1', timeOffset: 'T-0m', title: 'Seismic Shockwave', description: 'Initial tremor impact recorded.', type: 'seismic', status: 'active', probability: 100, lat: 42, lng: 48 },
  { id: 'h2', timeOffset: '+12m', title: 'Substation Alpha Failure', description: 'Structural compromise of power towers.', type: 'power', status: 'predicted', probability: 95, lat: 35, lng: 60 },
  { id: 'h3', timeOffset: '+25m', title: 'Water Pump Station B Overload', description: 'Pressure loss expected.', type: 'water', status: 'predicted', probability: 92, lat: 65, lng: 35 },
  { id: 'h4', timeOffset: '+30m', title: 'Gas Main Ignition Risk', description: 'Pipeline shearing near electrical grids.', type: 'fire', status: 'predicted', probability: 78, lat: 50, lng: 75 }
];

export default function App() {
  const [selectedEvent, setSelectedEvent] = useState<HazardEvent | null>(null);

  const getTypeStyles = (type: HazardEvent['type']) => {
    switch (type) {
      case 'seismic': return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: ShieldAlert };
      case 'power': return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', icon: Zap };
      case 'water': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: Droplet };
      case 'fire': return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', icon: Flame };
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans p-6 flex flex-col gap-6">
      <header className="border-b border-slate-900 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CityPulse Command</h1>
          <p className="text-xs text-slate-400">Seismic Cascade & Predictive Matrix</p>
        </div>
        <div className="flex items-center gap-4">
          <GoldenHourClock eventTimestamp={Date.now() - 1000 * 60 * 20} />
        </div>
      </header>

      {/* Main Grid: Sidebar (1 col) + Map (3 cols) */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar: composite panels */}
        <aside className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
            <EscalationPanel timeline={mockHazardTimeline.map((h) => ({ id: h.id, probability: h.probability, timeOffset: h.timeOffset }))} />
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
            <AftershockPanel center={{ lat: mockHazardTimeline[0].lat, lng: mockHazardTimeline[0].lng }} />
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
            <TripleThreatPanel incident={{ lat: mockHazardTimeline[0].lat, lng: mockHazardTimeline[0].lng, debrisRadiusKm: 2 }} heatmapCells={[{x:1,y:1},{x:2,y:2},{x:3,y:3},{x:4,y:4},{x:5,y:5}]} blockedRoutes={[{id:'r1'}]} />
          </div>

          <div className="hidden lg:block">
            <CascadingHazardsPanel hazards={mockHazardTimeline.map(h => ({ id: h.id, timeOffset: h.timeOffset, title: h.title, description: h.description, type: h.type, status: h.status === 'active' ? 'critical' : 'predicted', probability: h.probability, lat: h.lat, lng: h.lng }))} onSelectEvent={(e) => setSelectedEvent(e as any)} activeId={selectedEvent?.id ?? null} />
          </div>
        </aside>

        {/* Map Canvas */}
        <main className="lg:col-span-3 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden min-h-[500px]">
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />
          
          {selectedEvent && (
            <div className="absolute top-4 left-4 z-20 bg-slate-950/90 p-4 rounded border border-slate-800 max-w-sm">
              <h3 className="text-white font-bold">{selectedEvent.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{selectedEvent.description}</p>
            </div>
          )}
        </main>
      </div>
      {/* Bottom timeline */}
      <ThreatTimeline hazards={mockHazardTimeline.map(h => ({ title: h.title, probability: h.probability }))} />
    </div>
  );
}