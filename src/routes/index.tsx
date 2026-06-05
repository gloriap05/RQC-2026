import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside className="w-[450px] shrink-0 border-r border-border bg-panel">
        <ControlPanel theme={theme} onThemeChange={setTheme} />
      </aside>
      <main className="relative flex-1 overflow-hidden">
        <IncidentMap theme={theme} />
      </main>
    </div>
  );
}
