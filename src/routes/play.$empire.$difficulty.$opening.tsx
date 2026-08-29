import { createFileRoute } from "@tanstack/react-router";
import { PlayScreen } from "@/components/game/PlayScreen";

export const Route = createFileRoute("/play/$empire/$difficulty/$opening")({
  component: PlayRoute,
});

function PlayRoute() {
  const { empire, difficulty, opening } = Route.useParams();
  return <PlayScreen empire={empire} difficulty={difficulty} opening={opening} />;
}
