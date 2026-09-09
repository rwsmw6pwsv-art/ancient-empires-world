import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { BootFallback } from "@/components/game/LoadingScreen";

const DrillScreen = lazy(() =>
  import("@/components/game/DrillScreen").then((m) => ({ default: m.DrillScreen })),
);

export const Route = createFileRoute("/drill")({
  component: DrillRoute,
});

function DrillRoute() {
  return (
    <Suspense fallback={<BootFallback label="Preparing the battle" />}>
      <DrillScreen />
    </Suspense>
  );
}
