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
      "Starts in Graecia with walls and extra levy. Direwolves hunt the olive hills; stone and the Inner-Sea Temple sit on the doorstep — Europe pays if you cluster it.",
    startLevyBonus: 2,
    capitalCastle: true,
  },
  lumuria: {
    id: "lumuria",
    name: "Lemuria",
    adjective: "Lemurian",
    capitol: CAPITOL.lumuria,
    homes: ["india", "indochina", "canton", "malaya", "gulf"],
    color: "#db2777",
    blurb:
      "Wakes in India on gold, rhinos, and the Monsoon Stupa. Indochina and Cathay are a short march; Oceania’s timber is a sail away.",
  },
  eldorado: {
    id: "eldorado",
    name: "El Dorado",
    adjective: "Doradan",
    capitol: CAPITOL.eldorado,
    homes: ["amazon", "grenada", "guiana", "brazil", "cerrado"],
    color: "#c17f3a",
    blurb:
      "The Amazon opens walled, with extra levy and a gold jungle. Inland — sink mines, raise black caiman, and lock South America.",
    startLevyBonus: 2,
    capitalCastle: true,
  },
  aztec: {
    id: "aztec",
    name: "Aztec",
    adjective: "Mexica",
    capitol: CAPITOL.aztec,
    homes: ["mexico", "yucatan", "sierra", "texas", "panama"],
    color: "#c1121f",
    blurb:
      "Mexico holds gold, the Sun Pyramid, and jaguars, with coasts on both oceans. Yucatan and the isthmus are the path to two continents.",
  },
  asgard: {
    id: "asgard",
    name: "Asgard",
    adjective: "Asgardian",
    capitol: CAPITOL.asgard,
    homes: ["alaska", "yukon", "cascade", "hudson", "hawaii"],
    color: "#5ec8e8",
    blurb:
      "Alaska already has a port. Buffalo and Yukon gold lie next door; the first longship can reach Hawaii or the ice.",
    capitalPort: true,
  },
  tartaria: {
    id: "tartaria",
    name: "Tartaria",
    adjective: "Tartarian",
    capitol: CAPITOL.tartaria,
    homes: ["cathay", "gobi", "nippon", "siberia", "yakutia"],
    color: "#1d4ed8",
    blurb:
      "Cathay opens on gold, pandas, and the Eastern Court. Siberian tigers range the east; Gobi stone and Nippon timber are the first grabs.",
  },
  egypt: {
    id: "egypt",
    name: "Egypt",
    adjective: "Egyptian",
    capitol: CAPITOL.egypt,
    homes: ["nile", "maghreb", "horn", "guinea", "congo"],
    color: "#e8b86d",
    blurb:
      "The Nile is gold, lions, and the Pyramids. Maghreb and the Horn are tribal gold camps — Africa’s tribute grows as you take them.",
  },
  babylon: {
    id: "babylon",
    name: "Babylon",
    adjective: "Babylonian",
    capitol: CAPITOL.babylon,
    homes: ["mesopotamia", "arabia", "persia", "anatolia", "armenia"],
    color: "#7b2d8e",
    blurb:
      "Mesopotamia starts walled, with extra levy, the Hanging Gardens, and a sea gate. War elephants and desert gold ring the two rivers.",
    startLevyBonus: 2,
    capitalCastle: true,
  },
  cape: {
    id: "cape",
    name: "Karoo",
    adjective: "Karoo",
    capitol: CAPITOL.cape,
    homes: ["cape", "madagascar", "rift", "guinea", "congo"],
    color: "#16a34a",
    blurb:
      "The Cape Light already keeps a port, and every African land you hold yields extra timber for cheap ships. Hippos hold the south.",
    woodOnAf: true,
    shipWoodCost: 4,
    capitalPort: true,
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
      "Coral Coast gold, a starting port, and cheaper harbours. Every Oceanian land pays extra gold; crocodiles run the islands.",
    goldOnOc: true,
    portGoldCost: 3,
    capitalPort: true,
  },
  thule: {
    id: "thule",
    name: "Nord",
    adjective: "Nordic",
    capitol: CAPITOL.thule,
    homes: ["greenland", "labrador", "seaboard", "highlands", "fjords"],
    color: "#5a7ea0",
    blurb:
      "The Ice Citadel already has a haven, and a land road into Labrador. North American stone is cheaper to quarry; polar bears hold the ice.",
    stoneOnNa: true,
    castleCost: 6,
    capitalPort: true,
  },
};

export const EMPIRE_LIST: EmpireDef[] = Object.values(EMPIRES);

export function empireOf(id: EmpireId): EmpireDef {
  return EMPIRES[id];
}
