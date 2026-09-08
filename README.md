# Ancient Empires

Turn-based strategy on an ice-age world. Eleven courts. Thirteen regions. Two hundred sixty-nine hex lands.

Pick a house, claim its capital, then march, siege, and lock regions before rival courts do.

## The world

| Region | Lands |
| --- | ---: |
| West America | 23 |
| East America | 23 |
| Central America | 21 |
| South America | 22 |
| Europe | 20 |
| North Africa | 19 |
| South Africa | 19 |
| Middle East | 21 |
| West Asia | 18 |
| East Asia | 22 |
| South Asia | 18 |
| Oceania | 21 |
| Antarctica | 22 |

Land bridges include Beringia–Kamchatka, Peninsula–Weddell, and Tocantins–Fuegia–Drake–Weddell.

## Courts

Atlantis, Lumuria, Eldorado, Aztec, Asgard, Tartaria, Egypt, Babylon, Cape, Gondwana, and Thule. Each starts on a named capital.

## Play

1. Choose a court and opening.
2. Train levies, raid, or march into neighboring hexes.
3. Lay siege to walled cities; raise wood, then stone.
4. Lock a whole region for bonus gold.
5. Hold five regions to win.

Saves live in the browser. Difficulty changes how hard rival courts push back.

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
