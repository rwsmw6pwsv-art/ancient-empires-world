import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "One capital",
    body: "Each of the thirteen empires wakes in its seat behind stone walls. Every other land is tribal — an open camp, no palisade. Camp size follows the age: two to four warriors on Easy, three to five on Medium, five to seven on Hard — camps next to a capital wake one stronger. A raid chips a city; they only overrun an unwalled camp of one. A capital keeps a city watch even when the host is on the road, and an assault on your land opens a battle. Bounce a camp and it stays quiet for a few turns. Isolated seats — Asgard on the ice and Sahul — wake with a ship.",
  },
  {
    title: "Ports, mines and markets",
    body: "Raise a port on any land that touches a sea. Inland provinces sink mines. Open a market in any owned town for extra tribute. Sow a farm for grain. Lay a road to pave a city — two neighbouring paved lands form a trade route. Occupied land is a city (+5 defence). Camps you take have no walls; raise wooden walls, then stone walls, then a wooden keep, then a stone keep. Capitals start with stone walls. Markets, ports, mines and farms can be improved twice with gold. Each house also draws a local yield from its home region (stone, timber, gold, or grain) and often a cheaper work. Drag to turn the globe; pinch or scroll to zoom. Hex lands wrap so East Asia meets West America across the Pacific. Home faces your lands.",
  },
  {
    title: "Trade",
    body: "Every owned land pays a little gold, silver, timber, stone, metal and grain each watch. The mark on each land is what it has in abundance, and it pays extra of that yield. Silver pays the host — warriors, archers, knights, beasts and dragons. Ships sail free. Food feeds citizens — two people share a measure of grain. Capitals start with a small city; camps you take keep a few souls. Population grows when the realm expands or the granary is fat, and only in developed cities (farm, market, road, port, or a capital). Hunger shrinks the city. Every two citizens pay extra trade gold. Every capital mints silver for whoever holds it. Trade gold also grows with a fat purse, extra provinces, regions, ports, ships, veins, and paved roads.",
  },
  {
    title: "The bigger the realm",
    body: "Every extra province raises tribute, and clustering lands on one region pays more than scattering. Half your lands arrive as free levies each watch. Standing warriors and archers draw silver wages — one silver per two, and never less than one while a host stands. Knights and dragons cost one each. Beasts cost three silver — hunt with them or the mint starves the empire. Capture pays two gold plus one per defender; cracking an empire’s locked region pays more. A dragon wakes when you take a capital or finish a region. Tribal camps stop replenishing on turn 20 (Easy), 30 (Medium) and 40 (Hard), and they refill more slowly than they once did.",
  },
  {
    title: "Beasts of the region",
    body: "Beasts raise on the lands of an empire's region, not only at the capital: Asgard polar bears, El Dorado gorillas, Mayan jaguars, Kunlun tigers, Siberia grizzlies, Shangri-La rhinos, Egypt lions, Sumer giants, Karoo hippos, Sahul crocodiles, Nord sabertooths, Alaska mammoths, and Atlantis direwolves. Occupy a rival empire's region and you train that region's host there only — mammoths stay in Alaska, jaguars stay in Mayan lands. They are hunters, not garrison — send them with the column. Dragons raise only at a capital. Capitals wake with three beasts, ten warriors, ten archers and five knights on Easy; two beasts, five warriors, five archers and three knights on Medium; one beast, three warriors, three archers and two knights on Hard. Warriors take one watch to drill, archers one, knights two, beasts three, dragons five. Beasts punch through weak wooden walls to surprise a keep. Dragons tear walls and every defence and roam the whole field; only another dragon or a scorpion can wound them. A trained dragon is fifty across the board. Taking a capital wakes a special dragon (fifty to seventy-five). Locking a region wakes a rare dragon (seventy-five to a hundred). Knights ride warriors down. Defending archers stand on the towers and rain arrows. Warriors hold the melee. Raise walls, outer walls, a keep, towers, moats and scorpions from City defense — separate from mines and markets.",
  },
  {
    title: "Ships and waters",
    body: "Ocean hexes are open waters — no tribes live there. A finished port lets you lay ships and train warships. Rank I holds two of each, rank II four, rank III six. A ship occupies neighbouring waters and gathers the yield each watch: shellfish or lost treasure near land, fish or whales in the deep. Fish and shellfish feed like grain and can be traded. Lost treasure is gold. Whales pay gold and arm the host with flame — fire arrows, flaming swords and flaming spears, raising attack. Warships carry a host across water and fight rival fleets. From occupied waters, Move sails the fleet; Disembark picks who goes ashore. Battle on the sea only if a rival warship already holds that hex or a neighbouring water. A sunk warship takes the army aboard with it. Several warships can share the same waters, and each adds defence. Asgard and Sahul wake with a ship already in harbour.",
  },
  {
    title: "Siege engines",
    body: "Lay siege on a neighbour first. Then rams, ladders, towers and catapults raise for free on the siege screen — they take watches, not gold. A ram takes one watch and knocks the gate down. Ladders take one watch and scale a wall without breaking it. A siege tower takes three watches and carries up to 20 warriors, or 5 knights, or 5 beasts over the wall. A catapult takes five watches and weakens their defences from a distance before you assault. Raise scorpions on your own walls to wound dragons.",
  },
  {
    title: "The field",
    body: "An attack does not strike the same watch you order it. The column is on the road, then the raid opens when they arrive. On attack, tap a host in the tray, then tap the grass outside the walls — you cannot drop warriors inside. On defence, tap inside the walls to place the garrison. Gates start shut — rams and the host have to smash them. A gate-tower stands either side of each gate. Split each kind with the counts: some hold the gate, some ride the first breach, some protect the keep. Dragons on defence can hunt theirs, hold the gate, cover a hole, or guard the citadel. Attackers can be ordered at the keep — the land is not yours until it falls. Tap a siege tower to load warriors, archers, knights or beasts; it spills them over the wall. Before the charge, give the army orders: warriors follow the ram, scale with ladders and towers, or drive for the keep; archers shoot towers, guard the ram, ride a siege tower, or aim at the keep; knights follow the ram, flank from a tower, or ride for the citadel; beasts punch a weak wall, drive the gate, ride over, or break for the keep; catapults breach a wall, aim at towers, or hurl at the keep; dragons hunt enemy dragons first, then scorpions, or burn the keep, and fly straight across the city. Hold keeps a troop for the next charge — rams, towers and ladders always roll. Once a mark falls they keep attacking the next. Rams hit the gate. Ladders open a climb. The field calls out a fallen gate, a breached wall, or a destroyed tower. Live bars at the top of the field show the strength of both hosts as they fight. Moats slow the host and cut their blows. Fifty percent destruction is one star; the keep as well is two; a razed village is three. Smash the keep before the clock runs out to take the land. Practise off the campaign in Battle Training — choose attack or defence, place the host, and set how many do each order.",
  },
  {
    title: "Victory",
    body: "Hold seven capitals and you win immediately. There is no turn limit. Last throne standing also wins. Save and leave writes the age and returns to the title — Resume from there, or open Battle Training. The field is not lost.",
  },
  {
    title: "Courts",
    body: "Each empire carries a level from its overall score — gold, goods, people, walls, host, lands and thrones. The courts rank Merchant (gold in the vault plus next tribute), Trader (every other yield, vault plus next), Popular (citizens), Protector (city defences), Warlord (the host, including columns on the road), Colonizer (lands) and Emperor (capitals). Open Courts from the watch bar.",
  },
];

export function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-bg/70 p-4 sm:items-center"
      role="dialog"
      aria-labelledby="how-to-title"
      onClick={onClose}
    >
      <div
        className="panel how-to-sheet w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="how-to-head">
          <div className="min-w-0">
            <p className="font-display text-xs tracking-[0.22em] text-muted uppercase">How to play</p>
            <h2 id="how-to-title" className="mt-1 font-display text-2xl text-fg">
              Thirteen empires, thirteen thrones
            </h2>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="how-to-body">
          <ol className="space-y-4">
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
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
