import React from 'react';
import { AlertTriangle, ShieldAlert, Clock, Zap, Droplet, Flame } from 'lucide-react';

export interface HazardEvent {
  id: string;
  timeOffset: string;
  title: string;
  description: string;
  type: 'seismic' | 'power' | 'water' | 'fire';
  status: 'critical' | 'predicted';
  probability?: number;
  lat: number;
  lng: number;
}

interface PanelProps {
  hazards: HazardEvent[];
  onSelectEvent: (event: HazardEvent) => void;
  activeId: string | null;
}

export const CascadingHazardsPanel: React.FC<PanelProps> = ({ hazards, onSelectEvent, activeId }) => {
  
  const getHazardIcon = (type: string) => {
    switch (type) {
      case 'seismic': return <AlertTriangle className="w-4 h-4" />;
      case 'power': return <Zap className="w-4 h-4" />;
      case 'water': return <Droplet className="w-4 h-4" />;
      case 'fire': return <Flame className="w-4 h-4" />;
      default: return <ShieldAlert className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-80 h-full bg-slate-900/90 border-r border-slate-800 text-slate-100 flex flex-col backdrop-blur-md z-10">
      {/* Panel Title Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wider uppercase">Seismic Cascade Matrix</h2>
        </div>
        <div className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Predictive On
        </div>
      </div>

      {/* Sequential Vertical Chronological Failures List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hazards.map((hazard, index) => {
          const isActive = activeId === hazard.id;
          return (
            <div key={hazard.id} className="relative pl-6">
              {/* Chronological dependency connector dash lines */}
              {index !== hazards.length - 1 && (
                <div className="absolute left-2.5 top-6 bottom-[-20px] w-0.5 bg-gradient-to-b from-slate-700 to-slate-800 border-dashed border-l border-slate-700" />
              )}
              
              {/* Interactive Node Point Status Indicator */}
              <div className={`absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                hazard.status === 'critical' ? 'bg-red-950 border-red-500 text-red-400' : 'bg-amber-950 border-amber-500 text-amber-400'
              } ${isActive ? 'scale-125 ring-2 ring-sky-400' : ''}`}>
                {getHazardIcon(hazard.type)}
              </div>

              {/* Cascade Data Card Target Box */}
              <div 
                onClick={() => onSelectEvent(hazard)}
                className={`p-3 rounded-lg border bg-slate-950/40 space-y-2 cursor-pointer transition-all hover:bg-slate-950/80 ${
                  isActive 
                    ? 'border-sky-500 bg-slate-950/90 shadow-lg shadow-sky-500/10' 
                    : hazard.status === 'critical' ? 'border-red-500/20' : 'border-amber-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {hazard.timeOffset}
                  </span>
                  {hazard.status === 'predicted' && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {hazard.probability}% Match
                    </span>
                  )}
                </div>
                
                <h3 className="text-xs font-bold leading-snug text-slate-200">
                  {hazard.title}
                </h3>
                
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {hazard.description}
                </p>

                {hazard.status === 'predicted' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`PRE-EMPTIVE ACTION ASSIGNED: Deploying intercept squads to coordinates Vector: [LAT: ${hazard.lat}, LNG: ${hazard.lng}]`);
                    }}
                    className="w-full mt-2 py-1 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-bold rounded tracking-wide transition-colors uppercase flex items-center justify-center gap-1"
                  >
                    Deploy Pre-emptive Intercept
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500 italic text-center">
        Data verified via Tri-Factor Validation loops.
      </div>
    </div>
  );
};