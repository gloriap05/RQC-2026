import { createFileRoute } from "@tanstack/react-router";
import { ControlPanel } from "@/components/citypulse/ControlPanel";
import { IncidentMap } from "@/components/citypulse/IncidentMap";

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
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside className="w-[450px] shrink-0 border-r border-border bg-panel">
        <ControlPanel />
      </aside>
      <main className="relative flex-1 overflow-hidden">
        <IncidentMap />
      </main>
    </div>
  );
}
