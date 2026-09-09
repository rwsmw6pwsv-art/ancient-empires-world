# Ancient Empires

Turn-based strategy on an ice-age world. Thirteen empires. Thirteen regions. Two hundred sixty-nine hex lands.

Pick a house, claim its capital, then march, siege, and lock regions before rival empires do.

## Empires

| Empire | Region | Beast |
| --- | --- | --- |
| Asgard | Antarctica | Polar bear |
| El Dorado | South America | Mastodon |
| Mayan | Central America | Jaguar |
| Kunlun | East Asia | Tiger |
| Siberia | West Asia | Grizzly |
| Shangri-La | South Asia | Elephant |
| Egypt | North Africa | Lion |
| Karoo | South Africa | Hippo |
| Sahul | Oceania | Crocodile |
| Nord | East America | Sabertooth |
| Alaska | West America | Mammoth |
| Atlantis | Europe | Direwolf |

Lands are named for terrain, not countries — ice, veld, ghat, reef. Middle East has no throne — it is tribal ground.

## Play

1. Choose an empire and opening.
2. Train levies, raid, or march into neighboring hexes.
3. Lay siege to walled cities; raise wood, then stone.
4. Lock a whole region for bonus gold.
5. Hold seven regions to win. There is no turn limit.

Saves live in the browser. Difficulty changes how hard rival empires push back.

## Run it

```bash
npm install
npm run dev
```

Open the printed local address. Production build:

```bash
npm run build
npm run preview
```

## Stack

React 19, TanStack Start, Vite, Tailwind v4. Map data lives in `src/lib/game/world.ts`.
