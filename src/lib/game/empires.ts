import type { EmpireDef, EmpireId } from "./types";
import { CAPITOL } from "./types";

export const EMPIRES: Record<EmpireId, EmpireDef> = {
  atlantis: {
    id: "atlantis",
    name: "Atlantis",
    adjective: "Atlantean",
    capitol: CAPITOL.atlantis,
    homes: ["roma", "iberia", "gaul", "balkans", "rhine"],
    color: "#1aa6a0",
    blurb:
      "Starts in Graecia on the Inner-Sea Temple. Direwolves hunt the olive hills; every European land yields extra stone.",
    stoneOnEu: true,
    castleCost: 4,
  },
  lumuria: {
    id: "lumuria",
    name: "Lemuria",
    adjective: "Lemurian",
    capitol: CAPITOL.lumuria,
    homes: ["india", "indochina", "canton", "malaya", "gulf"],
    color: "#db2777",
    blurb:
      "Wakes in India on gold, rhinos, and the Monsoon Stupa. Asian lands yield extra timber and harbours come cheap — a sail to Malaya and Oceania.",
    woodOnAs: true,
    portGoldCost: 3,
  },
  eldorado: {
    id: "eldorado",
    name: "El Dorado",
    adjective: "Doradan",
    capitol: CAPITOL.eldorado,
    homes: ["amazon", "grenada", "guiana", "brazil", "cerrado"],
    color: "#c17f3a",
    blurb:
      "The Amazon opens on a gold jungle with a mine already sunk. Inland — raise black caiman and lock South America.",
    capitalMine: true,
  },
  aztec: {
    id: "aztec",
    name: "Aztec",
    adjective: "Mexica",
    capitol: CAPITOL.aztec,
    homes: ["mexico", "yucatan", "sierra", "texas", "panama"],
    color: "#c1121f",
    blurb:
      "Mexico holds gold, the Sun Pyramid, and jaguars. Every Central American land pays extra gold; mines come cheap, and the isthmus opens two continents.",
    goldOnCa: true,
    mineGoldCost: 2,
    mineStoneCost: 2,
  },
  asgard: {
    id: "asgard",
    name: "Asgard",
    adjective: "Asgardian",
    capitol: CAPITOL.asgard,
    homes: ["alaska", "yukon", "cascade", "hudson", "hawaii"],
    color: "#5ec8e8",
    blurb:
      "Alaska wakes on the ice with buffalo at the gate. North American lands yield extra timber, and harbours come cheap for the Hawaii sail.",
    woodOnNa: true,
    portGoldCost: 3,
  },
  tartaria: {
    id: "tartaria",
    name: "Tartaria",
    adjective: "Tartarian",
    capitol: CAPITOL.tartaria,
    homes: ["cathay", "gobi", "nippon", "siberia", "yakutia"],
    color: "#1d4ed8",
    blurb:
      "Cathay opens on gold, pandas, and the Eastern Court. Every Asian land yields extra stone, and mines come cheap — Gobi rock and Nippon timber are the first grabs.",
    stoneOnAs: true,
    mineGoldCost: 2,
    mineStoneCost: 2,
  },
  egypt: {
    id: "egypt",
    name: "Egypt",
    adjective: "Egyptian",
    capitol: CAPITOL.egypt,
    homes: ["nile", "maghreb", "horn", "guinea", "congo"],
    color: "#e8b86d",
    blurb:
      "The Nile is gold, lions, and the Pyramids. African lands yield extra grain, and farms come cheap — Maghreb and the Horn are the first grabs.",
    foodOnAf: true,
    farmGoldCost: 2,
  },
  babylon: {
    id: "babylon",
    name: "Babylon",
    adjective: "Babylonian",
    capitol: CAPITOL.babylon,
    homes: ["mesopotamia", "arabia", "persia", "anatolia", "armenia"],
    color: "#7b2d8e",
    blurb:
      "Mesopotamia opens on the Hanging Gardens and a sea gate. Every Middle Eastern land pays extra gold; markets come cheap. Elephants ring the two rivers.",
    goldOnMe: true,
    marketGoldCost: 2,
  },
  cape: {
    id: "cape",
    name: "Karoo",
    adjective: "Karoo",
    capitol: CAPITOL.cape,
    homes: ["cape", "madagascar", "rift", "guinea", "congo"],
    color: "#16a34a",
    blurb:
      "The Cape Light sits on African timber: every African land you hold yields extra wood for cheap ships. Hippos hold the south.",
    woodOnAf: true,
    shipWoodCost: 4,
  },
  patagonia: {
    id: "patagonia",
    name: "Patagonia",
    adjective: "Patagonian",
    capitol: CAPITOL.patagonia,
    homes: ["patagonia", "pampas", "andes", "cerrado", "brazil"],
    color: "#3f5c4a",
    blurb:
      "The Southern Stones sit on cheap mines: every South American land yields extra stone. Grizzly bears range the pampas; Andes rock is next door.",
    stoneOnSa: true,
    mineGoldCost: 1,
    mineStoneCost: 2,
  },
  gondwana: {
    id: "gondwana",
    name: "Sahul",
    adjective: "Sahulian",
    capitol: CAPITOL.gondwana,
    homes: ["coral", "outback", "westralia", "aotearoa", "tasmania", "polynesia"],
    color: "#e07a5f",
    blurb:
      "Coral Coast gold, a starting port and a keel, and cheaper harbours. Every Oceanian land pays extra gold; crocodiles run the islands.",
    goldOnOc: true,
    portGoldCost: 3,
    capitalPort: true,
    startShip: true,
  },
  thule: {
    id: "thule",
    name: "Nord",
    adjective: "Nordic",
    capitol: CAPITOL.thule,
    homes: ["greenland", "labrador", "seaboard", "highlands", "fjords"],
    color: "#5a7ea0",
    blurb:
      "The Ice Citadel already has a haven and a keel, and a land road into Labrador. North American stone is cheaper to quarry; polar bears hold the ice.",
    stoneOnNa: true,
    castleCost: 6,
    capitalPort: true,
    startShip: true,
  },
};

export const EMPIRE_LIST: EmpireDef[] = Object.values(EMPIRES);

export function empireOf(id: EmpireId): EmpireDef {
  return EMPIRES[id];
}
