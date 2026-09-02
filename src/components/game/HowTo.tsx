import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "One capital",
    body: "Each of the twelve empires wakes in its seat, walled. Every other land is tribal. Camp size follows the age: one to three men on Easy, four to six on Medium, seven to nine on Hard — Hard camps also refill faster. A raid chips a city; they only overrun a host of one. Bounce a camp and it stays quiet for a few turns. Isolated seats — Nord and Sahul — wake with a harbour and a keel.",
  },
  {
    title: "Ports, mines and markets",
    body: "Raise a port on any land that touches a sea. Inland provinces sink mines. Open a market in any owned town for extra tribute. Sow a farm for grain. Lay a road to pave a city — two neighbouring paved lands form a trade route. Occupied land is a city (+5 defence). Raise walls for +12 more. Markets, ports, mines, farms and walls can be improved twice with gold: each rank pays more trade or food, and improved walls become a keep then a citadel. Each house also draws a local yield from its home continent (stone, timber, gold, or grain) and often a cheaper work. Pinch or scroll to zoom; drag to pan. The map opens on your own lands.",
  },
  {
    title: "Trade",
    body: "Occupy gold, silver, grain, metal, timber, or stone lands and they pay you. Silver pays the host — men, knights, beasts and dragons. Ships sail free. Food feeds citizens — two people share a measure of grain. Capitals start with a small city; camps you take keep a few souls. Population grows when the realm expands or the granary is fat, and only in developed cities (farm, market, road, port, or a capital). Hunger shrinks the city. Every two citizens pay extra trade gold. Every capital mints silver for whoever holds it. Trade gold also grows with a fat purse, extra provinces, continents, ports, ships, veins, and paved roads.",
  },
  {
    title: "The bigger the realm",
    body: "Every extra province raises tribute, and clustering lands on one continent pays more than scattering. Half your lands arrive as free levies each watch. Standing men draw silver wages — one silver per two, and never less than one while a host stands. Knights and dragons cost one each. Beasts cost three silver — hunt with them or the mint starves the court. Capture pays two gold plus one per defender; cracking an empire’s locked continent pays more. A dragon wakes when you take a capital or finish a continent. Tribal camps stop replenishing on turn 30 (Easy), 50 (Medium) and 80 (Hard).",
  },
  {
    title: "Beasts of the house",
    body: "Each empire raises its own host at a capital only: Atlantis direwolves, Lemuria rhinos, El Dorado black caiman, Aztec jaguars, Asgard buffalo, Egypt lions, Babylon elephants, Sahul crocodiles, Tartaria Siberian tigers, Patagonia grizzly bears, Nord polar bears, and Karoo hippos. They are hunters, not garrison — send them with the column. Capitals wake with three beasts on Easy, two on Medium, and one on Hard. Damage is high (13–16); health stays modest. Three silver wages each. Dragons are 25 attack and 25 defence (one per city, 25 gold). Knights 2/2, men 1/1.",
  },
  {
    title: "Ships",
    body: "A finished port lets you lay keels. Rank I holds two, rank II four, rank III six. A beach without a port berths one arriving keel. Each ship sails with the host across water and docks at the landing. After the fight you may leave it there or send it home with part of the column. A wiped landing loses the keel. Two keels, two sea strikes in the same watch from that shore. Each ship also pays two trade gold. Nord and Sahul wake with a keel already in harbour.",
  },
  {
    title: "The field",
    body: "When you attack — or when a rival marches on you — the fight opens on the field. Each kind stands as one host: men, knights, beasts, dragons. Tap yours, then a mark. They duel; the mark answers once this round. A live striker rests until the rest of your host has gone, then the enemy volleys back. Men hold 1 wound, knights 2, beasts 3, dragons 5. Walls are a pool you chew before the garrison. Jungle favours beasts, ice favours Nord, mountains favour the defence. Odds show on the mark. When a host falls below half it breaks and flees. Captains can take the volley for you.",
  },
  {
    title: "Victory",
    body: "Hold five continents and you win immediately. Otherwise the age closes on turn 200: the court with the most continents takes the crown, most provinces if continents are tied. Last throne standing also wins.",
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
