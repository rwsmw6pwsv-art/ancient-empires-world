import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { BootFallback } from "@/components/game/LoadingScreen";

const PlayScreen = lazy(() =>
  import("@/components/game/PlayScreen").then((m) => ({ default: m.PlayScreen })),
);

export const Route = createFileRoute("/play/$empire/$difficulty/$opening")({
  component: PlayRoute,
});

function PlayRoute() {
  const { empire, difficulty, opening } = Route.useParams();
  return (
    <Suspense fallback={<BootFallback label="Generating the world" />}>
      <PlayScreen empire={empire} difficulty={difficulty} opening={opening} />
    </Suspense>
  );
}
