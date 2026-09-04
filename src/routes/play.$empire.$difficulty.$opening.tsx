import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const PlayScreen = lazy(() =>
  import("@/components/game/PlayScreen").then((m) => ({ default: m.PlayScreen })),
);

export const Route = createFileRoute("/play/$empire/$difficulty/$opening")({
  component: PlayRoute,
});

function PlayRoute() {
  const { empire, difficulty, opening } = Route.useParams();
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-bg font-display text-lg text-fg">
          Opening the age…
        </div>
      }
    >
      <PlayScreen empire={empire} difficulty={difficulty} opening={opening} />
    </Suspense>
  );
}
