import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "One capital",
    body: "Each of the eleven empires wakes in its seat behind stone walls. Every other land is tribal — an open camp, no palisade. Camp size follows the age: two to four warriors on Easy, three to five on Medium, five to seven on Hard — camps next to a capital wake one stronger. A raid chips a city; they only overrun an unwalled camp of one. A capital keeps a city watch even when the host is on the road, and an assault on your land opens a battle. Bounce a camp and it stays quiet for a few turns. Isolated seats — Asgard on the ice and Sahul — wake with a keel.",
  },
  {
    title: "Ports, mines and markets",
    body: "Raise a port on any land that touches a sea. Inland provinces sink mines. Open a market in any owned town for extra tribute. Sow a farm for grain. Lay a road to pave a city — two neighbouring paved lands form a trade route. Occupied land is a city (+5 defence). Camps you take have no walls; raise wooden walls, then stone walls, then a wooden keep, then a stone keep. Capitals start with stone walls. Markets, ports, mines and farms can be improved twice with gold. Each house also draws a local yield from its home region (stone, timber, gold, or grain) and often a cheaper work. Pinch or scroll to zoom; drag to pan. The map opens on your own lands.",
  },
  {
    title: "Trade",
    body: "Every owned land pays a little gold, silver, timber, stone, metal and grain each watch. The mark on the map is what that land has in abundance, and it pays extra of that yield. Silver pays the host — warriors, archers, knights, beasts and dragons. Ships sail free. Food feeds citizens — two people share a measure of grain. Capitals start with a small city; camps you take keep a few souls. Population grows when the realm expands or the granary is fat, and only in developed cities (farm, market, road, port, or a capital). Hunger shrinks the city. Every two citizens pay extra trade gold. Every capital mints silver for whoever holds it. Trade gold also grows with a fat purse, extra provinces, regions, ports, ships, veins, and paved roads.",
  },
  {
    title: "The bigger the realm",
    body: "Every extra province raises tribute, and clustering lands on one region pays more than scattering. Half your lands arrive as free levies each watch. Standing warriors and archers draw silver wages — one silver per two, and never less than one while a host stands. Knights and dragons cost one each. Beasts cost three silver — hunt with them or the mint starves the court. Capture pays two gold plus one per defender; cracking an empire’s locked region pays more. A dragon wakes when you take a capital or finish a region. Tribal camps stop replenishing on turn 20 (Easy), 30 (Medium) and 40 (Hard), and they refill more slowly than they once did.",
  },
  {
    title: "Beasts of the house",
    body: "Each empire raises its own host at a capital only: Atlantis direwolves, Shangri-La rhinos, El Dorado black caiman, Mayan jaguars, Asgard penguins, Egypt lions, Sumer elephants, Sahul crocodiles, Kunlun Siberian tigers, Nord buffalo, and Karoo hippos. They are hunters, not garrison — send them with the column. Capitals wake with two beasts on Easy, one on Medium, and none on Hard. Warriors take one watch to drill, archers one, knights two, beasts three, dragons five. Beasts punch through weak wooden walls to surprise a keep. Dragons tear walls and every defence and roam the whole field; only another dragon or a scorpion can wound them. Knights ride warriors down. Defending archers stand on the keep and rain arrows. Warriors hold the melee.",
  },
  {
    title: "Ships",
    body: "A finished port lets you lay keels. Rank I holds two, rank II four, rank III six. A beach without a port berths one arriving keel. Each ship sails with the host across water and docks at the landing. After the fight you may leave it there or send it home with the column. A wiped landing loses the keel. Columns take a watch to arrive, land or sea — you may send several in the same watch to different shores. Each ship also pays two trade gold. Asgard and Sahul wake with a keel already in harbour.",
  },
  {
    title: "Siege engines",
    body: "Lay siege on a neighbour first. Then rams, ladders, towers and catapults raise for free on the siege screen — they take watches, not gold. A ram takes one watch and knocks the gate down. Ladders take one watch and scale a wall without breaking it. A siege tower takes three watches and carries up to 20 warriors, or 5 knights, or 5 beasts over the wall. A catapult takes five watches and weakens their defences from a distance before you assault. Raise scorpions on your own walls to wound dragons.",
  },
  {
    title: "The field",
    body: "An attack does not strike the same watch you order it. The column is on the road, then the raid opens when they arrive. Tap a host in the tray, then tap the grass outside the walls — you cannot drop warriors inside. Troops path and pick their own marks: warriors hunt the melee, archers linger outside and shoot, knights ride warriors down, beasts punch weak walls, dragons roam and burn defences. Defending archers stand on the keep. Rams hit the gate. Ladders open a climb. Towers spill a column over the wall. Cannons, scorpions and the keep fire on their own. Fifty percent destruction or a fallen keep is one star; both is two; a razed village is three. Smash the keep before the clock runs out to take the land. Captains can send the whole column, or you can auto resolve the field.",
  },
  {
    title: "Victory",
    body: "Hold five regions and you win immediately. Otherwise the age closes on turn 200: the court with the most regions takes the crown, most provinces if regions are tied. Last throne standing also wins.",
  },
];

export function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 p-4 sm:items-center">
      <div className="panel w-full max-w-lg p-6 shadow-2xl">
        <p className="font-display text-xs tracking-[0.22em] text-muted uppercase">How to play</p>
        <h2 className="mt-2 font-display text-2xl text-fg">Eleven empires, thirteen regions</h2>
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
