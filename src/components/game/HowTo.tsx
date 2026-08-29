import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "One capital",
    body: "Each of the twelve empires wakes in its seat. Every other land is tribal. Camps hold four to six men, sometimes a champion — never a city. A raid chips a city; they only overrun a host of one. Bounce a camp and it stays quiet for a few turns.",
  },
  {
    title: "Ports, mines and markets",
    body: "Raise a port on any land that touches a sea. Inland provinces sink mines. Open a market in any owned town for extra tribute. Occupied land is a city (+5 defence). Raise walls for +12 more. Pinch or scroll to zoom; drag to pan. The map opens on your own lands.",
  },
  {
    title: "Trade",
    body: "Occupy gold, metal, timber, or stone lands and they pay you. A market or port on a rich province turns that bounty into trade gold. Holding several of the same resource grows the trade further. Men and knights need metal; dragons and beasts cost gold only. Timber lays ships.",
  },
  {
    title: "The bigger the realm",
    body: "Every extra province raises tribute, and clustering lands on one continent pays more than scattering. Half your lands arrive as free levies each watch. Take as much of the map as you can hold.",
  },
  {
    title: "Beasts of the house",
    body: "Each empire raises its own host at a capital only: Atlantis direwolves, Lemuria rhinos, El Dorado black caiman, Aztec jaguars, Asgard buffalo, Egypt lions, Babylon elephants, Sahul crocodiles, Tartaria Siberian tigers, Patagonia grizzly bears, Nord polar bears, and Karoo hippos. Damage, health and gold cost differ by house. Dragons are 25 attack and 25 defence (one per city, 25 gold). Knights 2/2, men 1/1.",
  },
  {
    title: "Ships",
    body: "A finished port lets you lay keels. Ships spend themselves to cross sea lanes — the inner sea, the Caspian, the southern ocean.",
  },
  {
    title: "Victory",
    body: "Hold two continents and you win immediately. Otherwise the age closes on turn 100: only a court with at least two continents can take the crown — most continents first, most provinces if tied. Last throne standing also wins.",
  },
];

export function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 p-4 sm:items-center">
      <div className="panel w-full max-w-lg p-6 shadow-2xl">
        <p className="font-display text-xs tracking-[0.22em] text-muted uppercase">How to play</p>
        <h2 className="mt-2 font-display text-2xl text-fg">Twelve empires, eight continents</h2>
        <ol className="mt-5 space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="mt-0.5 font-display text-muted tabular-nums">{i + 1}</span>
              <div>
                <p className="font-medium text-fg">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button className="mt-6 w-full" onClick={onClose}>
          To the map
        </Button>
      </div>
    </div>
  );
}
