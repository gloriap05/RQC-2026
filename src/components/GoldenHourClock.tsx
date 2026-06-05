import React, { useEffect, useState } from 'react';

export default function GoldenHourClock({ eventTimestamp, compact }: { eventTimestamp: string | number; compact?: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const eventTime = typeof eventTimestamp === 'string' ? new Date(eventTimestamp).getTime() : eventTimestamp;
  const elapsedMs = Math.max(0, now - eventTime);
  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);

  // USAR thresholds (ms)
  const H6 = 6 * 60 * 60 * 1000;
  const H24 = 24 * 60 * 60 * 1000;
  const H48 = 48 * 60 * 60 * 1000;

  let bandLabel = 'Golden Window';
  let bandColor = 'bg-emerald-400';
  let bandStart = 0;
  let bandEnd = H6;

  if (elapsedMs < H6) {
    bandLabel = 'Golden Window';
    bandColor = 'bg-emerald-400';
    bandStart = 0;
    bandEnd = H6;
  } else if (elapsedMs < H24) {
    bandLabel = 'Urgent';
    bandColor = 'bg-amber-400';
    bandStart = H6;
    bandEnd = H24;
  } else if (elapsedMs < H48) {
    bandLabel = 'Critical';
    bandColor = 'bg-rose-400';
    bandStart = H24;
    bandEnd = H48;
  } else {
    bandLabel = 'Critical (extended)';
    bandColor = 'bg-rose-700';
    bandStart = H48;
    bandEnd = H48 * 2;
  }

  const bandProgress = Math.max(0, Math.min(1, (elapsedMs - bandStart) / (bandEnd - bandStart)));

  // time remaining in current band
  const remainingMs = Math.max(0, bandEnd - elapsedMs);
  const remH = Math.floor(remainingMs / (1000 * 60 * 60));
  const remM = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  if (compact) {
    // compact horizontal pill for header
    return (
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${bandColor}`} />
        <div className="font-mono text-xs">{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}</div>
        <div className="text-[10px] text-slate-300 uppercase tracking-wider">{bandLabel}</div>
        <div className="w-24 h-2 bg-slate-800 rounded overflow-hidden">
          <div className={`${bandColor} h-2`} style={{ width: `${Math.round(bandProgress * 100)}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-start">
          <div className="font-mono text-[10px] text-slate-300">Elapsed</div>
          <div className="font-bold tracking-wide text-sm">{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
        </div>
        <div className="text-[11px] uppercase tracking-wider text-slate-300">{bandLabel}</div>
        <div className={`ml-1 h-2 w-2 rounded-full ${bandColor}`} />
      </div>

      <div className="w-36">
        <div className="h-2 w-full bg-slate-800 rounded overflow-hidden">
          <div className={`h-2 ${bandColor}`} style={{ width: `${Math.round(bandProgress * 100)}%` }} />
        </div>
        <div className="text-[10px] text-slate-400 mt-1">{remH}h {remM}m remaining in band</div>
      </div>
    </div>
  );
}
