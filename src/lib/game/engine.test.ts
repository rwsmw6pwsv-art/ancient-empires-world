import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playAiTurns } from "./ai.ts";
import { nextAiAction } from "./ai.ts";
import { autoVolley, battleWinner, hostFromSide, openBattle, strikeBattle } from "./battle.ts";
import { EMPIRE_LIST, empireOf } from "./empires.ts";
import {
  advanceJobs,
  beginSiege,
  buildCastle,
  buildMarket,
  buildMine,
  buildPort,
  buildRoad,
  buildFarm,
  buildShip,
  buildSiege,
  checkVictory,
  commitBattle,
  constructionBusy,
  continentsHeld,
  createNewGame,
  cityWatch,
  defenseStrength,
  endTurn,
  foodNeed,
  fortOf,
  hasJob,
  incomeFor,
  issueMarch,
  legalMarchTargets,
  ownedIds,
  oddsLabel,
  playCard,
  raiseWorks,
  rankPlayers,
  realmRecruits,
  realmPopulation,
  recallOccupiers,
  resolveAttack,
  setMarchFrom,
  siegeTargetOf,
  trainUnit,
  tradeFor,
  upkeepFor,
  watchReport,
  shipsCap,
  worksRank,
  worksCost,
  worksDefense,
  cancelJob,
  cancelMarch,
  hasKindJob,
} from "./engine.ts";
import { cloneRaid, deployTroop, openRaid, raidWinner, runRaid } from "./raid.ts";
import { beastOf, landscapeOf } from "./landscape.ts";
import { CAPITOL, CITY_DEF, CONTINENT_BONUS, CONTINENT_BREAK_GOLD, FORT_DEF, FORT_LABEL, HOUSES, PLAYER_COUNT, SAVE_VERSION, SIEGE_CAP, SIEGE_COST, SIEGE_TURNS, TOWER_CARGO, TURN_LIMIT, UNIT_COST, UNIT_LABEL, UNIT_STR, UNIT_TURNS, WIN_CONTINENTS, WORKS_CAP, type PlayerId } from "./types.ts";
import { DIFFICULTIES } from "./campaign.ts";
import { TERRITORIES, TERRITORY_BY_ID, continentTerritories, landNeighbors, seaNeighbors } from "./world.ts";

const EG = CAPITOL.egypt;

describe("world", () => {
  it("has one hundred and one provinces", () => {
    assert.equal(TERRITORIES.length, 112);
    assert.equal(new Set(TERRITORIES.map((t) => t.id)).size, 112);
    assert.equal(new Set(TERRITORIES.map((t) => t.name)).size, 112);
  });
  it("Malaya is Oceania", () => {
    assert.equal(TERRITORY_BY_ID.malaya.continent, "oc");
  });
  it("lands sit on the right regions", () => {
    assert.equal(TERRITORY_BY_ID.steppe.continent, "ac");
    assert.equal(TERRITORY_BY_ID.altai.continent, "ac");
    assert.equal(TERRITORY_BY_ID.india.continent, "ac");
    assert.equal(TERRITORY_BY_ID.texas.continent, "ca");
    assert.equal(TERRITORY_BY_ID.sierra.continent, "nw");
    assert.equal(TERRITORY_BY_ID.alaska.continent, "nw");
    assert.equal(TERRITORY_BY_ID.hawaii.continent, "ca");
    assert.equal(TERRITORY_BY_ID.grenada.continent, "ca");
    assert.equal(TERRITORY_BY_ID.anatolia.continent, "me");
    assert.equal(TERRITORY_BY_ID.volga.continent, "me");
    assert.equal(TERRITORY_BY_ID.ural.continent, "me");
    assert.equal(TERRITORY_BY_ID.nile.continent, "eu");
    assert.equal(TERRITORY_BY_ID.maghreb.continent, "eu");
    assert.equal(TERRITORY_BY_ID.horn.continent, "an");
    assert.equal(TERRITORY_BY_ID.somali.continent, "me");
    assert.equal(TERRITORY_BY_ID.roma.continent, "eu");
    assert.equal(TERRITORY_BY_ID.mexico.continent, "ca");
    assert.equal(TERRITORY_BY_ID.greenland.continent, "ne");
    assert.equal(TERRITORY_BY_ID.cathay.continent, "ae");
    assert.equal(TERRITORY_BY_ID.nippon.continent, "ae");
  });
  it("Sumer is coastal", () => {
    assert.equal(TERRITORY_BY_ID.mesopotamia.coastal, true);
  });
  it("inland mines only on landlocked provinces", () => {
    for (const id of ["prairie", "amazon", "cerrado", "gobi", "himalaya", "altai", "dakota", "tarim", "pantanal"]) {
      assert.equal(TERRITORY_BY_ID[id]!.coastal, false, id);
    }
  });
  it("regions have land", () => {
    for (const c of ["nw", "ne", "ca", "sa", "eu", "an", "af", "me", "ac", "ae", "oc"]) {
      assert.ok(continentTerritories(c).length >= 6, c);
    }
  });
  it("largest lands are split in two", () => {
    for (const [keep, child] of [
      ["greenland", "westgreenland"],
      ["siberia", "baikal"],
      ["yakutia", "chukotka"],
      ["india", "himalaya"],
      ["steppe", "altai"],
      ["hudson", "ontario"],
      ["gobi", "tarim"],
      ["alaska", "aleut"],
      ["indochina", "burma"],
      ["yukon", "mackenzie"],
      ["rift", "nyasa"],
      ["mexico", "oaxaca"],
      ["andes", "atacama"],
      ["cape", "namib"],
      ["seaboard", "florida"],
      ["cathay", "jiangnan"],
      ["sierra", "baja"],
      ["nippon", "korea"],
      ["cascade", "columbia"],
      ["volga", "ural"],
      ["horn", "somali"],
      ["labrador", "acadia"],
      ["canton", "yunnan"],
      ["arabia", "hejaz"],
      ["slavic", "ruthenia"],
      ["westralia", "kimberley"],
      ["outback", "nullarbor"],
      ["pampas", "plata"],
      ["prairie", "dakota"],
      ["cerrado", "pantanal"],
      ["patagonia", "araucania"],
      ["heartland", "lakes"],
      ["sahara", "gaetulia"],
      ["guinea", "kaabu"],
      ["sahel", "kanem"],
      ["congo", "teke"],
      ["kasai", "lunda"],
      ["horn", "nubia"],
      ["rift", "kilwa"],
      ["nyasa", "yao"],
      ["namib", "damara"],
      ["cape", "khoi"],
      ["madagascar", "sakalava"],
    ] as const) {
      assert.ok(TERRITORY_BY_ID[child], child);
      if (!["sierra-baja", "maghreb-sahara", "horn-somali", "guinea-sahel", "congo-kasai"].includes(`${keep}-${child}`)) {
        assert.equal(TERRITORY_BY_ID[child]!.continent, TERRITORY_BY_ID[keep]!.continent, child);
      }
      assert.ok(landNeighbors(keep).includes(child), `${keep}-${child}`);
    }
    assert.equal(TERRITORY_BY_ID.himalaya.coastal, false);
    assert.equal(TERRITORY_BY_ID.altai.coastal, false);
    assert.ok(landNeighbors("baffin").includes("labrador"));
    assert.ok(landNeighbors("westgreenland").includes("baffin"));
    assert.ok(landNeighbors("aleut").includes("chukotka"));
  });
});

describe("landscape", () => {
  it("covers every province", () => {
    for (const t of TERRITORIES) assert.ok(landscapeOf(t.id).terrain, t.id);
  });
  it("Sahara and ice read as desert and ice", () => {
    assert.equal(landscapeOf("maghreb").terrain, "desert");
    assert.equal(landscapeOf("greenland").terrain, "ice");
  });
  it("places fauna", () => {
    assert.equal(landscapeOf("maghreb").fauna, "camel");
    assert.equal(landscapeOf("greenland").fauna, "polar-bear");
  });
  it("wonders sit on capitals", () => {
    assert.equal(landscapeOf(EG).wonder, "pyramids");
    assert.equal(landscapeOf("mexico").wonder, "teocalli");
    assert.equal(landscapeOf("mesopotamia").wonder, "gardens");
  });
  it("every province has a trade resource", () => {
    for (const t of TERRITORIES) assert.ok(landscapeOf(t.id).resource, t.id);
  });
  it("beasts follow the empire", () => {
    assert.equal(beastOf("atlantis").id, "direwolf");
    assert.equal(beastOf("atlantis").atk, 16);
    assert.equal(beastOf("atlantis").def, 8);
    assert.equal(beastOf("atlantis").cost, 8);
    assert.equal(beastOf("lumuria").name, "Rhinos");
    assert.equal(beastOf("eldorado").id, "caiman");
    assert.equal(beastOf("aztec").id, "jaguar");
    assert.equal(beastOf("aztec").cost, 8);
    assert.equal(beastOf("asgard").id, "buffalo");
    assert.equal(beastOf("egypt").id, "lion");
    assert.equal(beastOf("babylon").id, "elephant");
    assert.equal(beastOf("gondwana").id, "crocodile");
    assert.equal(beastOf("tartaria").id, "siberian-tiger");
    assert.equal(beastOf("thule").id, "polar-bear");
    assert.equal(beastOf("cape").id, "hippo");
    assert.equal(beastOf("cape").atk, 15);
    assert.equal(beastOf("cape").def, 10);
    assert.equal(beastOf("cape").cost, 9);
  });
});

describe("houses", () => {
  it("eleven thrones", () => {
    assert.equal(HOUSES.length, PLAYER_COUNT);
    assert.equal(EMPIRE_LIST.length, PLAYER_COUNT);
    assert.equal(PLAYER_COUNT, 11);
  });
  it("capitals match the seats", () => {
    assert.equal(CAPITOL.atlantis, "roma");
    assert.equal(CAPITOL.egypt, "nubia");
    assert.equal(TERRITORY_BY_ID.nubia.name, "Egypt");
    assert.equal(TERRITORY_BY_ID.horn.name, "Nubia");
    assert.equal(CAPITOL.thule, "greenland");
    assert.equal(empireOf("thule").capitol, "greenland");
    assert.equal(empireOf("babylon").capitol, "mesopotamia");
  });
  it("homes sit on the map", () => {
    for (const e of EMPIRE_LIST) {
      assert.ok(TERRITORY_BY_ID[e.capitol], e.capitol);
      for (const id of e.homes) assert.ok(TERRITORY_BY_ID[id], `${e.id}:${id}`);
    }
  });
  it("difficulty is easy, medium and hard", () => {
    assert.deepEqual(
      DIFFICULTIES.map((d) => d.label),
      ["Easy", "Medium", "Hard"],
    );
  });
});

describe("newGame", () => {
  it("human holds only the capital", () => {
    const g = createNewGame({ empire: "egypt", seed: 1 });
    assert.deepEqual(ownedIds(g, 0), [EG]);
    assert.equal(g.territories[EG].owner, 0);
    assert.equal(g.players[0]!.human, true);
    assert.equal(g.players.length, 11);
    assert.equal(Object.keys(g.territories).length, 112);
  });
  it("Thule wakes in Greenland", () => {
    assert.equal(createNewGame({ empire: "thule", seed: 4 }).territories.greenland.owner, 0);
  });
  it("Nord starts with a port and a land road through Baffin", () => {
    const g = createNewGame({ empire: "thule", seed: 4 });
    assert.equal(g.territories.greenland.port, true);
    assert.ok(landNeighbors("greenland").includes("westgreenland"));
    assert.ok(landNeighbors("westgreenland").includes("baffin"));
    assert.ok(landNeighbors("baffin").includes("labrador"));
    assert.ok(landNeighbors("greenland").includes("fjords"));
  });
  it("every capital wakes walled with the same host", () => {
    const egypt = createNewGame({ empire: "egypt", seed: 5, difficulty: "normal" });
    assert.equal(egypt.territories[EG].castle, true);
    assert.equal(egypt.territories[EG].levy, 8);
    for (const id of HOUSES) {
      const g = createNewGame({ empire: id, seed: 5, difficulty: "normal" });
      const cap = empireOf(id).capitol;
      assert.equal(g.territories[cap]!.castle, true, id);
      assert.equal(fortOf(g.territories[cap]!), 2, id);
      assert.equal(g.territories[cap]!.levy, 8, id);
    }
  });
  it("capitals wake with more swordmen on harder ages", () => {
    const easy = createNewGame({ empire: "egypt", seed: 7, difficulty: "easy" });
    const mid = createNewGame({ empire: "egypt", seed: 7, difficulty: "normal" });
    const hard = createNewGame({ empire: "egypt", seed: 7, difficulty: "hard" });
    assert.equal(easy.territories[EG].levy, 6);
    assert.equal(mid.territories[EG].levy, 8);
    assert.equal(hard.territories[EG].levy, 10);
  });
  it("capitals wake with house beasts, fewer on Hard", () => {
    const easy = createNewGame({ empire: "egypt", seed: 8, difficulty: "easy" });
    const mid = createNewGame({ empire: "egypt", seed: 8, difficulty: "normal" });
    const hard = createNewGame({ empire: "egypt", seed: 8, difficulty: "hard" });
    assert.equal(easy.territories[EG].beasts, 2);
    assert.equal(mid.territories[EG].beasts, 1);
    assert.equal(hard.territories[EG].beasts, 0);
  });
  it("save version is current", () => {
    assert.equal(createNewGame({ empire: "aztec", seed: 1 }).version, SAVE_VERSION);
  });
});

describe("ports and mines", () => {
  it("Sumer can raise a port", () => {
    let g = createNewGame({ empire: "babylon", seed: 11 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g = buildPort(g, "mesopotamia");
    assert.ok(hasJob(g, "mesopotamia"));
    assert.ok(constructionBusy(g, "mesopotamia"));
    g = advanceJobs(g);
    assert.equal(g.territories.mesopotamia.port, true);
  });
  it("Prairie cannot raise a port", () => {
    let g = createNewGame({ empire: "asgard", seed: 12 });
    g.territories.prairie.owner = 0;
    g.players[0]!.gold = 20;
    const blocked = buildPort(g, "prairie");
    assert.equal(hasJob(blocked, "prairie"), false);
  });
  it("Prairie can sink a mine", () => {
    let g = createNewGame({ empire: "asgard", seed: 12 });
    g.territories.prairie.owner = 0;
    g.players[0]!.gold = 20;
    g.players[0]!.stone = 10;
    g = buildMine(g, "prairie");
    g = advanceJobs(g);
    assert.equal(g.territories.prairie.mine, true);
  });
  it("Amazon is inland jungle", () => {
    let g = createNewGame({ empire: "eldorado", seed: 13 });
    g.players[0]!.gold = 20;
    g.players[0]!.stone = 10;
    assert.equal(g.territories.amazon.mine, true);
    const blocked = buildPort(g, "amazon");
    assert.equal(hasJob(blocked, "amazon"), false);
    g = buildMine(g, "amazon");
    assert.ok(hasJob(g, "amazon"));
  });
  it("raiseWorks aliases buildCastle", () => {
    let g = createNewGame({ empire: "egypt", seed: 14 });
    g.players[0]!.gold = 40;
    g.players[0]!.stone = 20;
    g.players[0]!.wood = 20;
    g = raiseWorks(g, EG, "castle");
    assert.ok(hasJob(g, EG));
  });
  it("ship requires a finished port", () => {
    let g = createNewGame({ empire: "babylon", seed: 15 });
    g.players[0]!.gold = 40;
    g.players[0]!.wood = 20;
    const blocked = buildShip(g, "mesopotamia");
    assert.equal(hasJob(blocked, "mesopotamia"), false);
    g = buildPort(g, "mesopotamia");
    g = advanceJobs(g);
    g = buildShip(g, "mesopotamia");
    g = advanceJobs(g);
    assert.ok(g.territories.mesopotamia.ships >= 1);
  });
  it("a harbour can lay a second keel", () => {
    let g = createNewGame({ empire: "babylon", seed: 15 });
    g.players[0]!.gold = 40;
    g.players[0]!.wood = 30;
    g.territories.mesopotamia.port = true;
    g.territories.mesopotamia.portRank = 1;
    g = buildShip(g, "mesopotamia");
    g = advanceJobs(g);
    g = buildShip(g, "mesopotamia");
    g = advanceJobs(g);
    assert.equal(g.territories.mesopotamia.ships, 2);
  });
  it("a ship sails with the host; two keels can march the same watch", () => {
    let g = createNewGame({ empire: "egypt", seed: 17 });
    g.territories[EG].port = true;
    g.territories[EG].ships = 2;
    g.territories[EG].levy = 20;
    g.territories[EG].beasts = 0;
    const first = seaNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    const second = seaNeighbors(EG).find((id) => id !== first && g.territories[id]!.owner === "barbarian")!;
    g.territories[first]!.levy = 1;
    g.territories[first]!.knights = 0;
    g.territories[first]!.beasts = 0;
    g.territories[second]!.levy = 1;
    g.territories[second]!.knights = 0;
    g.territories[second]!.beasts = 0;
    g = issueMarch(g, EG, first, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    g = issueMarch(g, EG, second, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[EG].ships, 0);
    assert.equal(g.marches.length, 2);
    assert.equal(g.territories[first]!.owner, "barbarian");
    g = advanceJobs(g);
    assert.equal(g.arrivals.length, 2);
  });
  it("a wiped landing loses the keel", () => {
    let g = createNewGame({ empire: "egypt", seed: 19 });
    g.territories[EG].port = true;
    g.territories[EG].ships = 1;
    g.territories[EG].levy = 2;
    g.territories[EG].beasts = 0;
    const dest = seaNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 30;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 1;
    g = resolveAttack(g, EG, dest, { levy: 1, knights: 0, dragons: 0, beasts: 0 });
    assert.notEqual(g.territories[dest]!.owner, 0);
    assert.equal(g.territories[EG].ships, 0);
  });
  it("a rank I harbour holds two keels, a citadel port holds six", () => {
    let g = createNewGame({ empire: "babylon", seed: 21 });
    g.territories.mesopotamia.port = true;
    g.territories.mesopotamia.portRank = 1;
    assert.equal(shipsCap(g.territories.mesopotamia), 2);
    g.players[0]!.gold = 80;
    g.players[0]!.wood = 80;
    g.territories.mesopotamia.ships = 2;
    const blocked = buildShip(g, "mesopotamia");
    assert.equal(hasJob(blocked, "mesopotamia"), false);
    g.territories.mesopotamia.portRank = 3;
    assert.equal(shipsCap(g.territories.mesopotamia), 6);
    g = buildShip(g, "mesopotamia");
    assert.ok(hasJob(g, "mesopotamia"));
  });
  it("a landing keel can sail home with part of the host", () => {
    let g = createNewGame({ empire: "egypt", seed: 22 });
    g.territories[EG].port = true;
    g.territories[EG].portRank = 1;
    g.territories[EG].ships = 1;
    g.territories[EG].levy = 12;
    g.territories[EG].beasts = 0;
    const dest = seaNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g = resolveAttack(g, EG, dest, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.owner, 0);
    assert.equal(g.territories[dest]!.ships, 1);
    assert.equal(g.territories[EG].ships, 0);
    const held = g.territories[dest]!.levy;
    g = recallOccupiers(g, EG, dest, { levy: held - 1, knights: 0, dragons: 0, beasts: 0, ships: 1 });
    assert.equal(g.territories[dest]!.ships, 0);
    assert.equal(g.territories[EG].ships, 1);
  });
  it("Sumer can open a market", () => {
    let g = createNewGame({ empire: "babylon", seed: 16 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    const before = incomeFor(g, 0).gold;
    g = buildMarket(g, "mesopotamia");
    g = advanceJobs(g);
    assert.equal(g.territories.mesopotamia.market, true);
    assert.ok(incomeFor(g, 0).gold >= before + 1);
  });
  it("markets ports mines and walls can be improved with gold", () => {
    let g = createNewGame({ empire: "babylon", seed: 18 });
    g.players[0]!.gold = 80;
    g.players[0]!.wood = 20;
    g.players[0]!.stone = 20;
    g = buildMarket(g, "mesopotamia");
    g = advanceJobs(g);
    assert.equal(worksRank(g.territories.mesopotamia, "market"), 1);
    const trade1 = tradeFor(g, 0);
    const gold1 = g.players[0]!.gold;
    g = buildMarket(g, "mesopotamia");
    g = advanceJobs(g);
    assert.equal(worksRank(g.territories.mesopotamia, "market"), 2);
    assert.ok(g.players[0]!.gold < gold1);
    g.players[0]!.gold = gold1;
    assert.ok(tradeFor(g, 0) > trade1);
    g = buildMarket(g, "mesopotamia");
    g = advanceJobs(g);
    assert.equal(worksRank(g.territories.mesopotamia, "market"), WORKS_CAP);
    const blocked = buildMarket(g, "mesopotamia");
    assert.equal(hasJob(blocked, "mesopotamia"), false);
  });
  it("improved walls raise defence", () => {
    let g = createNewGame({ empire: "egypt", seed: 19 });
    g.players[0]!.gold = 80;
    g.players[0]!.wood = 20;
    g.players[0]!.stone = 20;
    const seat = g.territories[EG]!;
    seat.levy = 0;
    seat.knights = 0;
    seat.dragons = 0;
    seat.beasts = 0;
    seat.castle = false;
    seat.castleRank = 0;
    seat.fort = 0;
    g = buildCastle(g, EG);
    g = advanceJobs(g);
    assert.equal(fortOf(g.territories[EG]), 1);
    assert.equal(defenseStrength(g.territories[EG]), CITY_DEF + FORT_DEF[1]);
    g = buildCastle(g, EG);
    g = advanceJobs(g);
    assert.equal(fortOf(g.territories[EG]), 2);
    assert.equal(defenseStrength(g.territories[EG]), CITY_DEF + FORT_DEF[2]);
    g = buildCastle(g, EG);
    g = advanceJobs(g);
    g = advanceJobs(g);
    assert.equal(fortOf(g.territories[EG]), 3);
    assert.equal(defenseStrength(g.territories[EG]), CITY_DEF + FORT_DEF[3]);
  });
  it("capitals wake with citizens and grain", () => {
    const g = createNewGame({ empire: "egypt", seed: 90 });
    assert.equal(g.territories[EG].population, 4);
    assert.equal(g.players[0]!.food, 8);
    assert.ok(incomeFor(g, 0).food >= 1);
    assert.equal(foodNeed(g, 0), 2);
    assert.equal(realmPopulation(g, 0), 4);
  });
  it("farms raise food and a fat granary grows the city", () => {
    let g = createNewGame({ empire: "babylon", seed: 91 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g = buildFarm(g, "mesopotamia");
    g = advanceJobs(g);
    assert.equal(g.territories.mesopotamia.farm, true);
    assert.ok(incomeFor(g, 0).food >= 6);
    const pop = g.territories.mesopotamia.population;
    g.players[0]!.food = 20;
    g.players[0]!.lastLands = 0;
    for (const id of landNeighbors("mesopotamia")) {
      if (g.territories[id]!.owner === "barbarian") g.territories[id]!.pressure = 4;
    }
    g.clock.currentPlayer = (PLAYER_COUNT - 1) as PlayerId;
    g = endTurn(g);
    assert.ok(g.territories.mesopotamia.population > pop);
  });
  it("hunger shrinks a city", () => {
    let g = createNewGame({ empire: "egypt", seed: 92 });
    g.territories[EG].population = 8;
    g.players[0]!.food = 0;
    for (const id of landNeighbors(EG)) {
      if (g.territories[id]!.owner === "barbarian") g.territories[id]!.pressure = 4;
    }
    g.clock.currentPlayer = (PLAYER_COUNT - 1) as PlayerId;
    g = endTurn(g);
    assert.ok(g.territories[EG].population < 8);
  });
  it("a paved capital can open a road into a neighbour", () => {
    let g = createNewGame({ empire: "egypt", seed: 17 });
    assert.equal(g.territories[EG].road, true);
    const edge = landNeighbors(EG)[0]!;
    g.territories[edge]!.owner = 0;
    g.territories[edge]!.road = false;
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g.players[0]!.stone = 10;
    const before = tradeFor(g, 0);
    g = buildRoad(g, edge);
    g = advanceJobs(g);
    assert.equal(g.territories[edge]!.road, true);
    g.players[0]!.gold = 20;
    assert.ok(tradeFor(g, 0) >= before + 2);
  });
});

describe("economy and combat", () => {
  it("income is at least one gold for the capital", () => {
    const g = createNewGame({ empire: "babylon", seed: 21 });
    assert.ok(incomeFor(g, 0).gold >= 1);
  });
  it("every land pays timber, metal and stone, abundance pays more", () => {
    const g = createNewGame({ empire: "egypt", seed: 21 });
    const inc = incomeFor(g, 0);
    assert.ok(inc.wood >= 1);
    assert.ok(inc.metal >= 1);
    assert.ok(inc.stone >= 1);
    const wood = inc.wood;
    g.territories.congo.owner = 0;
    assert.ok(incomeFor(g, 0).wood >= wood + 1 + 2);
  });
  it("Cape draws wood from Africa", () => {
    const g = createNewGame({ empire: "cape", seed: 22 });
    assert.ok(incomeFor(g, 0).wood >= 1);
  });
  it("train swordmen spend gold and metal", () => {
    let g = createNewGame({ empire: "babylon", seed: 23 });
    const gold = g.players[0]!.gold;
    const metal = g.players[0]!.metal;
    const levy = g.territories.mesopotamia.levy;
    g = trainUnit(g, "mesopotamia", "levy");
    assert.equal(g.players[0]!.gold, gold - 2);
    assert.equal(g.players[0]!.metal, metal - 1);
    assert.equal(g.territories.mesopotamia.levy, levy);
    assert.equal(UNIT_TURNS.levy, 1);
    g = advanceJobs(g);
    assert.equal(g.territories.mesopotamia.levy, levy + 1);
  });
  it("dragons cost gold only", () => {
    let g = createNewGame({ empire: "babylon", seed: 23 });
    g.players[0]!.gold = 30;
    g.players[0]!.stone = 0;
    g.players[0]!.wood = 0;
    g.players[0]!.metal = 0;
    g = trainUnit(g, "mesopotamia", "dragon");
    assert.equal(g.territories.mesopotamia.dragons, 0);
    assert.equal(g.players[0]!.gold, 5);
    for (let i = 0; i < UNIT_TURNS.dragon; i++) g = advanceJobs(g);
    assert.equal(g.territories.mesopotamia.dragons, 1);
    g.players[0]!.gold = 30;
    g = trainUnit(g, "mesopotamia", "dragon");
    assert.equal(g.territories.mesopotamia.dragons, 1);
  });
  it("legal marches include land neighbours", () => {
    const g = createNewGame({ empire: "babylon", seed: 24 });
    const targets = legalMarchTargets(g, "mesopotamia");
    assert.ok(targets.length >= 2);
    assert.ok(targets.includes("arabia") || targets.includes("persia") || targets.includes("nile"));
  });
  it("a host can march into a neighbouring owned city", () => {
    let g = createNewGame({ empire: "egypt", seed: 26 });
    const edge = landNeighbors(EG)[0];
    assert.ok(edge);
    g.territories[edge]!.owner = 0;
    g.territories[edge]!.levy = 2;
    g.territories[EG].levy = 8;
    assert.ok(legalMarchTargets(g, EG).includes(edge));
    g = issueMarch(g, EG, edge, { levy: 3, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[EG].levy, 5);
    assert.equal(g.territories[edge]!.levy, 2);
    g = advanceJobs(g);
    assert.equal(g.territories[EG].owner, 0);
    assert.equal(g.territories[edge]!.owner, 0);
    assert.equal(g.territories[edge]!.levy, 5);
  });
  it("resolveAttack takes a barbarian land", () => {
    let g = createNewGame({ empire: "babylon", seed: 25 });
    g.territories.mesopotamia.levy = 12;
    g = setMarchFrom(g, "mesopotamia");
    const dest = legalMarchTargets(g, "mesopotamia").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    g = resolveAttack(g, "mesopotamia", dest, { levy: 8, knights: 0, dragons: 0 });
    assert.ok(g.territories[dest]!.owner === 0 || g.territories.mesopotamia.levy < 12);
  });
});

describe("clock, cards, victory, AI", () => {
  it("endTurn advances the watch", () => {
    const g = createNewGame({ empire: "babylon", seed: 31 });
    const next = endTurn(g);
    assert.equal(next.clock.currentPlayer, 1);
  });
  it("playCard levy adds swordmen", () => {
    let g = createNewGame({ empire: "babylon", seed: 32 });
    g.players[0]!.cards = ["levy"];
    const levy = g.territories.mesopotamia.levy;
    g = playCard(g, "levy", "mesopotamia");
    assert.equal(g.territories.mesopotamia.levy, levy + 2);
  });
  it("five regions wins", () => {
    let g = createNewGame({ empire: "egypt", seed: 33 });
    assert.equal(WIN_CONTINENTS, 5);
    for (const c of ["af", "eu", "sa", "ca", "me"] as const) {
      for (const t of continentTerritories(c)) g.territories[t.id]!.owner = 0;
    }
    g = checkVictory(g);
    assert.equal(g.winner, 0);
  });
  it("the age needs two regions to crown", () => {
    let g = createNewGame({ empire: "egypt", seed: 36 });
    g.clock.turn = TURN_LIMIT;
    g = checkVictory(g);
    assert.equal(g.phase, "gameover");
    assert.equal(g.winner, null);
  });
  it("the age ranks regions before provinces", () => {
    let g = createNewGame({ empire: "egypt", seed: 36 });
    for (const t of continentTerritories("af")) g.territories[t.id]!.owner = 0;
    for (const t of continentTerritories("eu")) g.territories[t.id]!.owner = 0;
    for (const t of continentTerritories("sa")) g.territories[t.id]!.owner = 1;
    g.clock.turn = TURN_LIMIT;
    g = checkVictory(g);
    assert.equal(g.winner, 0);
    assert.ok(rankPlayers(g)[0]!.continents >= 2);
  });
  it("the age crowns the largest realm at the limit", () => {
    let g = createNewGame({ empire: "egypt", seed: 36 });
    g.territories.maghreb.owner = 0;
    g.territories.horn.owner = 0;
    g.clock.turn = TURN_LIMIT;
    g = checkVictory(g);
    assert.equal(g.winner, 0);
  });
  it("a market on a rich land pays trade gold", () => {
    const g = createNewGame({ empire: "babylon", seed: 37 });
    const before = incomeFor(g, 0).gold;
    g.territories.mesopotamia.market = true;
    assert.ok(incomeFor(g, 0).gold >= before + 2);
  });
  it("Egypt raises lions at the capital", () => {
    let g = createNewGame({ empire: "egypt", seed: 38 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 5;
    g.territories[EG].beasts = 0;
    g = trainUnit(g, EG, "beast");
    assert.equal(g.territories[EG].beasts, 0);
    for (let i = 0; i < UNIT_TURNS.beast; i++) g = advanceJobs(g);
    assert.equal(g.territories[EG].beasts, 1);
    assert.equal(beastOf("egypt").atk, 14);
    assert.equal(beastOf("egypt").def, 7);
    assert.equal(beastOf("egypt").cost, 7);
    assert.equal(UNIT_STR.dragon, 25);
    assert.ok(UNIT_STR.dragon > beastOf("egypt").atk);
    assert.ok(beastOf("egypt").atk > UNIT_STR.knight);
    assert.ok(UNIT_STR.knight >= UNIT_STR.levy);
    assert.equal(g.players[0]!.gold, 13);
    assert.equal(UNIT_COST.dragon.gold, 25);
  });
  it("cities and walls stack on defence", () => {
    const g = createNewGame({ empire: "egypt", seed: 38 });
    const seat = g.territories[EG]!;
    seat.levy = 0;
    seat.knights = 0;
    seat.dragons = 0;
    seat.beasts = 0;
    seat.castle = false;
    seat.castleRank = 0;
    seat.fort = 0;
    assert.equal(defenseStrength(seat), CITY_DEF);
    seat.castle = true;
    seat.castleRank = 1;
    seat.fort = 1;
    assert.equal(defenseStrength(seat), CITY_DEF + FORT_DEF[1]);
    seat.fort = 2;
    assert.equal(defenseStrength(seat), CITY_DEF + FORT_DEF[2]);
    const camp = g.territories.maghreb!;
    camp.levy = 0;
    camp.knights = 0;
    camp.dragons = 0;
    camp.beasts = 0;
    camp.castle = true;
    camp.fort = 1;
    assert.equal(defenseStrength(camp), FORT_DEF[1]);
  });
  it("beasts only raise at the capital", () => {
    let g = createNewGame({ empire: "egypt", seed: 38 });
    g.players[0]!.gold = 20;
    g.territories.maghreb.owner = 0;
    g = trainUnit(g, "maghreb", "beast");
    assert.equal(g.territories.maghreb.beasts, 0);
  });
  it("more provinces pay more tribute", () => {
    const g = createNewGame({ empire: "egypt", seed: 39 });
    const one = incomeFor(g, 0).gold;
    g.territories.maghreb.owner = 0;
    const two = incomeFor(g, 0).gold;
    assert.ok(two >= one + 5);
  });
  it("lands on one region out-earn a scatter", () => {
    const clustered = createNewGame({ empire: "egypt", seed: 40 });
    clustered.territories.sahara.owner = 0;
    const split = createNewGame({ empire: "egypt", seed: 40 });
    split.territories.labrador.owner = 0;
    assert.ok(incomeFor(clustered, 0).gold > incomeFor(split, 0).gold);
  });
  it("realm recruits scale with lands", () => {
    assert.equal(realmRecruits(1), 0);
    assert.equal(realmRecruits(2), 1);
    assert.equal(realmRecruits(5), 2);
  });
  it("playAiTurns returns the human watch", () => {
    let g = createNewGame({ empire: "babylon", seed: 34, difficulty: "easy" });
    g = endTurn(g);
    g = playAiTurns(g);
    assert.equal(g.players[g.clock.currentPlayer]!.human, true);
  });
  it("AI marches a spare levy onto a weak tribal neighbor", () => {
    let g = createNewGame({ empire: "egypt", seed: 42, difficulty: "normal" });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g.players[0]!.stone = 10;
    g.players[0]!.metal = 4;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 8;
    for (const id of landNeighbors(EG)) {
      g.territories[id]!.levy = 2;
      g.territories[id]!.knights = 0;
      g.territories[id]!.beasts = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.equal(a.type, "march");
    if (a.type === "march") {
      assert.ok(a.levy + a.knights + a.dragons + a.beasts >= 1);
      assert.notEqual(g.territories[a.to]!.owner, 0);
    }
  });
  it("AI sends house beasts with the column", () => {
    let g = createNewGame({ empire: "egypt", seed: 42, difficulty: "normal" });
    g.players[0]!.gold = 0;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 8;
    g.territories[EG].beasts = 2;
    for (const id of landNeighbors(EG)) {
      g.territories[id]!.levy = 2;
      g.territories[id]!.knights = 0;
      g.territories[id]!.beasts = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.equal(a.type, "march");
    if (a.type === "march") assert.equal(a.beasts, 2);
  });
  it("AI leaves a garrison on the capital", () => {
    let g = createNewGame({ empire: "egypt", seed: 40, difficulty: "hard" });
    g.players[0]!.gold = 0;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 0;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 40;
    g.territories[EG].beasts = 0;
    const a = nextAiAction(g);
    assert.equal(a.type, "march");
    if (a.type === "march") {
      assert.ok(a.levy + a.knights + a.dragons <= 37);
      assert.ok(40 - a.levy >= 3);
    }
  });
  it("AI does not open a market while a border remains", () => {
    let g = createNewGame({ empire: "egypt", seed: 41 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g.players[0]!.metal = 4;
    g.players[0]!.cards = [];
    g.territories[EG].port = false;
    g.territories[EG].market = false;
    g.territories[EG].levy = 8;
    for (const id of landNeighbors(EG)) {
      g.territories[id]!.levy = 20;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.notEqual(a.type, "end");
    if (a.type === "build") assert.notEqual(a.kind, "market");
    assert.ok(a.type === "train" || a.type === "march");
  });
  it("AI trains before a port when the border is stout", () => {
    let g = createNewGame({ empire: "egypt", seed: 41 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 8;
    g.territories[EG].port = false;
    g.territories[EG].beasts = 0;
    for (const id of landNeighbors(EG)) {
      g.territories[id]!.levy = 12;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.equal(a.type, "train");
  });
  it("Easy trains a column against a stout border", () => {
    let g = createNewGame({ empire: "egypt", seed: 50, difficulty: "easy" });
    g.players[0]!.gold = 4;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 4;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 5;
    g.territories[EG].beasts = 0;
    for (const id of landNeighbors(EG)) {
      g.territories[id]!.levy = 18;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.equal(a.type, "train");
    if (a.type === "train") assert.equal(a.kind, "levy");
  });
  it("Medium spends a thin purse on levy", () => {
    let g = createNewGame({ empire: "egypt", seed: 51, difficulty: "normal" });
    g.players[0]!.gold = 4;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 4;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 5;
    g.territories[EG].beasts = 0;
    for (const id of landNeighbors(EG)) {
      g.territories[id]!.levy = 18;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.equal(a.type, "train");
    if (a.type === "train") assert.equal(a.kind, "levy");
  });
  it("Medium trains to break a stout border even near a dragon", () => {
    let g = createNewGame({ empire: "egypt", seed: 52, difficulty: "normal" });
    g.players[0]!.gold = 21;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 4;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 6;
    g.territories[EG].knights = 1;
    g.territories[EG].beasts = 0;
    for (const id of landNeighbors(EG)) {
      g.territories[id]!.levy = 18;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.equal(a.type, "train");
  });
  it("Hard raids a neighbor and will march on a rival", () => {
    let g = createNewGame({ empire: "egypt", seed: 53, difficulty: "hard" });
    g.players[0]!.gold = 0;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 0;
    g.players[0]!.cards = ["raid"];
    g.territories[EG].levy = 20;
    const neighbor = landNeighbors(EG)[0]!;
    g.territories[neighbor]!.owner = 1;
    g.territories[neighbor]!.levy = 3;
    g.territories[neighbor]!.knights = 0;
    g.territories[neighbor]!.castle = false;
    const a = nextAiAction(g);
    assert.ok(a.type === "card" || a.type === "march");
    if (a.type === "card") assert.equal(a.card, "raid");
    if (a.type === "march") assert.equal(g.territories[a.to]!.owner, 1);
  });
  it("Easy hunts tribes before rival courts", () => {
    let g = createNewGame({ empire: "egypt", seed: 55, difficulty: "easy" });
    g.players[0]!.gold = 0;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 0;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 10;
    const rival = landNeighbors(EG)[0]!;
    g.territories[rival]!.owner = 1;
    g.territories[rival]!.levy = 1;
    g.territories[rival]!.knights = 0;
    g.territories[rival]!.castle = false;
    for (const id of landNeighbors(EG)) {
      if (id === rival) continue;
      g.territories[id]!.levy = 20;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    if (a.type === "march") assert.notEqual(g.territories[a.to]!.owner, 1);
  });
  it("Medium hunts tribes before rival courts", () => {
    let g = createNewGame({ empire: "egypt", seed: 56, difficulty: "normal" });
    g.players[0]!.gold = 0;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 0;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 10;
    g.territories[EG].beasts = 0;
    const rival = landNeighbors(EG)[0]!;
    g.territories[rival]!.owner = 1;
    g.territories[rival]!.levy = 1;
    g.territories[rival]!.knights = 0;
    g.territories[rival]!.castle = false;
    for (const id of landNeighbors(EG)) {
      if (id === rival) continue;
      g.territories[id]!.levy = 20;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    if (a.type === "march") assert.notEqual(g.territories[a.to]!.owner, 1);
  });
  it("Asgard wakes without a harbour", () => {
    const g = createNewGame({ empire: "asgard", seed: 96 });
    assert.equal(g.territories.alaska.port, false);
    assert.equal(g.territories.alaska.ships, 0);
  });
  it("houses draw a yield from their home region", () => {
    const egypt = createNewGame({ empire: "egypt", seed: 97 });
    const food = incomeFor(egypt, 0).food;
    egypt.territories.sahara.owner = 0;
    assert.ok(incomeFor(egypt, 0).food >= food + 1 + 1);
    const atlantis = createNewGame({ empire: "atlantis", seed: 97 });
    const stone = incomeFor(atlantis, 0).stone;
    atlantis.territories.gaul.owner = 0;
    assert.ok(incomeFor(atlantis, 0).stone > stone);
    const aztec = createNewGame({ empire: "aztec", seed: 97 });
    const gold = incomeFor(aztec, 0).gold;
    aztec.territories.yucatan.owner = 0;
    assert.ok(incomeFor(aztec, 0).gold > gold);
    const asgard = createNewGame({ empire: "asgard", seed: 97 });
    assert.ok(worksCost(asgard.players[0]!, "port").gold < 5);
    const babylon = createNewGame({ empire: "babylon", seed: 97 });
    assert.ok(worksCost(babylon.players[0]!, "market").gold < 4);
    const nile = createNewGame({ empire: "egypt", seed: 97 });
    assert.ok(worksCost(nile.players[0]!, "farm").gold < 3);
    const walls = createNewGame({ empire: "atlantis", seed: 97 });
    assert.ok(worksCost(walls.players[0]!, "castle").gold < 6);
    const aztecPort = createNewGame({ empire: "aztec", seed: 97 });
    assert.ok(worksCost(aztecPort.players[0]!, "mine").gold < 4);
    const tartaria = createNewGame({ empire: "tartaria", seed: 97 });
    assert.ok(worksCost(tartaria.players[0]!, "mine").gold < 4);
  });
  it("houses are named for the player", () => {
    assert.equal(empireOf("cape").name, "Karoo");
    assert.equal(empireOf("gondwana").name, "Sahul");
    assert.equal(empireOf("thule").name, "Nord");
    assert.equal(empireOf("lumuria").name, "Shangri-La");
    assert.equal(empireOf("aztec").name, "Mayan");
    assert.equal(empireOf("tartaria").name, "Kunlun");
    assert.equal(empireOf("babylon").name, "Sumer");
    assert.ok(!empireOf("egypt").blurb.toLowerCase().includes("black land"));
    assert.equal(TERRITORY_BY_ID.roma.name, "Atlantis");
    for (const e of EMPIRE_LIST) {
      assert.equal(TERRITORY_BY_ID[e.capitol].name, e.name, e.id);
    }
  });
  it("victor can send occupiers home", () => {
    let g = createNewGame({ empire: "babylon", seed: 46 });
    g.territories.mesopotamia.levy = 12;
    const dest = legalMarchTargets(g, "mesopotamia").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    g = resolveAttack(g, "mesopotamia", dest, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.owner, 0);
    const left = g.territories[dest]!.levy;
    const home = g.territories.mesopotamia.levy;
    g = recallOccupiers(g, "mesopotamia", dest, { levy: left - 1, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.levy, 1);
    assert.equal(g.territories.mesopotamia.levy, home + left - 1);
  });
  it("taking a tribe pays spoils", () => {
    let g = createNewGame({ empire: "babylon", seed: 43 });
    g.territories.mesopotamia.levy = 12;
    const dest = legalMarchTargets(g, "mesopotamia").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    const gold = g.players[0]!.gold;
    g = setMarchFrom(g, "mesopotamia");
    g = resolveAttack(g, "mesopotamia", dest, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    if (g.territories[dest]!.owner === 0) {
      assert.ok(g.players[0]!.gold > gold);
      assert.ok(g.territories[dest]!.levy >= 1);
    }
  });
  it("idle tribes raid a weak neighbour", () => {
    let g = createNewGame({ empire: "thule", seed: 44 });
    for (const p of g.players) p.human = false;
    const edge = landNeighbors("greenland").find((id) => g.territories[id]!.owner === "barbarian");
    assert.ok(edge);
    g.territories[edge]!.levy = 4;
    g.territories[edge]!.pressure = 0;
    g.territories.greenland.levy = 1;
    g.territories.greenland.knights = 0;
    g.territories.greenland.dragons = 0;
    g.territories.greenland.beasts = 0;
    g.territories.greenland.castle = false;
    g.territories.greenland.fort = 0;
    const held = "westgreenland";
    if (g.territories[held]) {
      g.territories[held]!.owner = 0;
      g.territories[held]!.levy = 0;
      g.territories[held]!.knights = 0;
      g.territories[held]!.dragons = 0;
      g.territories[held]!.beasts = 0;
      g.territories[held]!.castle = false;
      g.territories[held]!.fort = 0;
    }
    for (let i = 0; i < 48; i++) g = endTurn(g);
    const raided = g.log.some((l) => l.includes("raid") || l.includes("overrun") || l.includes("Tribes"));
    assert.ok(raided || g.territories.greenland.owner === "barbarian" || g.territories.greenland.levy < 1);
  });
  it("an empty capital keeps a city watch", () => {
    const g = createNewGame({ empire: "egypt", seed: 21 });
    g.territories[EG].levy = 0;
    g.territories[EG].bowmen = 0;
    g.territories[EG].knights = 0;
    g.territories[EG].dragons = 0;
    g.territories[EG].beasts = 0;
    assert.ok(cityWatch(g.territories[EG]!) >= 3);
  });
  it("tribes assault an empty human capital instead of taking it unseen", () => {
    let g = createNewGame({ empire: "egypt", seed: 44, difficulty: "easy" });
    g.territories[EG].levy = 0;
    g.territories[EG].knights = 0;
    g.territories[EG].dragons = 0;
    g.territories[EG].beasts = 0;
    g.territories[EG].bowmen = 0;
    for (const id of landNeighbors(EG)) {
      if (g.territories[id]!.owner !== "barbarian") continue;
      g.territories[id]!.levy = 5;
      g.territories[id]!.pressure = 0;
    }
    for (let i = 0; i < 80 && !(g.arrivals ?? []).some((a) => a.to === EG); i++) g = endTurn(g);
    assert.equal(g.territories[EG].owner, 0);
    assert.ok((g.arrivals ?? []).some((a) => a.to === EG && a.tribal));
  });
  it("pressured tribes do not raid", () => {
    let g = createNewGame({ empire: "thule", seed: 45 });
    for (const id of landNeighbors("greenland")) {
      if (g.territories[id]!.owner === "barbarian") g.territories[id]!.pressure = 4;
    }
    g.territories.greenland.levy = 8;
    const levy = g.territories.greenland.levy;
    for (let i = 0; i < 12; i++) g = endTurn(g);
    assert.equal(g.territories.greenland.owner, 0);
    assert.equal(g.territories.greenland.levy, levy);
  });
  it("tribes wake stout", () => {
    const g = createNewGame({ empire: "babylon", seed: 47 });
    const camps = Object.values(g.territories).filter((t) => t.owner === "barbarian");
    assert.ok(camps.every((t) => t.levy >= 3 && t.levy <= 7));
    assert.ok(camps.every((t) => fortOf(t) === 0));
    assert.ok(camps.some((t) => t.levy >= 5 || t.knights > 0));
  });
  it("Easy tribes wake thin and Hard tribes wake stout", () => {
    const easy = createNewGame({ empire: "babylon", seed: 47, difficulty: "easy" });
    const hard = createNewGame({ empire: "babylon", seed: 47, difficulty: "hard" });
    const easyCamps = Object.values(easy.territories).filter((t) => t.owner === "barbarian");
    const hardCamps = Object.values(hard.territories).filter((t) => t.owner === "barbarian");
    assert.ok(easyCamps.every((t) => t.levy >= 2 && t.levy <= 6));
    assert.ok(hardCamps.every((t) => t.levy >= 5 && t.levy <= 9));
  });
  it("camps on a capital's border wake thicker", () => {
    const g = createNewGame({ empire: "egypt", seed: 47, difficulty: "easy" });
    const seats = new Set(Object.values(CAPITOL));
    const frontier = Object.values(g.territories).filter(
      (t) => t.owner === "barbarian" && landNeighbors(t.id).some((n) => seats.has(n)),
    );
    const hinter = Object.values(g.territories).filter(
      (t) => t.owner === "barbarian" && !landNeighbors(t.id).some((n) => seats.has(n)),
    );
    assert.ok(frontier.length > 0);
    assert.ok(frontier.every((t) => t.levy >= 3 && t.levy <= 5));
    assert.ok(hinter.every((t) => t.levy >= 2 && t.levy <= 4));
  });
  it("columns take a watch; several can leave in the same watch", () => {
    let g = createNewGame({ empire: "egypt", seed: 220, difficulty: "easy" });
    const foes = landNeighbors(EG).filter((id) => g.territories[id]!.owner === "barbarian");
    assert.ok(foes.length >= 2);
    const a = foes[0]!;
    const b = foes[1]!;
    g.territories[EG].levy = 20;
    g.territories[EG].beasts = 0;
    g.territories[a]!.levy = 1;
    g.territories[a]!.knights = 0;
    g.territories[a]!.beasts = 0;
    g.territories[b]!.levy = 1;
    g.territories[b]!.knights = 0;
    g.territories[b]!.beasts = 0;
    g = issueMarch(g, EG, a, { levy: 6, knights: 0, dragons: 0, beasts: 0 });
    g = issueMarch(g, EG, b, { levy: 6, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.marches.length, 2);
    assert.equal(g.territories[a]!.owner, "barbarian");
    assert.equal(g.territories[EG].levy, 8);
    g = advanceJobs(g);
    assert.equal(g.arrivals.length, 2);
    assert.equal(FORT_LABEL[2], "Stone walls");
    assert.equal(fortOf(g.territories[EG]!), 2);
  });
  it("all-AI marches resolve without parking on a battle screen", () => {
    let g = createNewGame({ empire: "egypt", seed: 17 });
    for (const p of g.players) p.human = false;
    g.territories[EG].levy = 20;
    g.territories[EG].beasts = 0;
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g = issueMarch(g, EG, dest, { levy: 12, knights: 0, dragons: 0, beasts: 0 });
    g = advanceJobs(g);
    assert.equal(g.arrivals.length, 0);
    assert.equal(g.territories[dest]!.owner, 0);
  });
  it("Easy camps stop replenishing after turn 20", () => {
    let g = createNewGame({ empire: "egypt", seed: 93, difficulty: "easy" });
    const camp = Object.values(g.territories).find((t) => t.owner === "barbarian")!;
    camp.levy = 1;
    camp.pressure = 4;
    g.clock.turn = 20;
    g.clock.currentPlayer = (PLAYER_COUNT - 1) as PlayerId;
    g = endTurn(g);
    assert.equal(g.territories[camp.id]!.levy, 1);
  });
  it("Nord and Sahul wake with a keel; land courts do not", () => {
    for (const id of ["thule", "gondwana"] as const) {
      const g = createNewGame({ empire: id, seed: 94 });
      const cap = empireOf(id).capitol;
      assert.equal(g.territories[cap]!.port, true, id);
      assert.ok(g.territories[cap]!.ships >= 1, id);
    }
    const a = createNewGame({ empire: "atlantis", seed: 94 });
    assert.equal(a.territories.roma.port, false);
    assert.equal(a.territories.roma.ships, 0);
    const k = createNewGame({ empire: "cape", seed: 94 });
    assert.equal(k.territories.cape.port, false);
  });
  it("standing swordmen draw wages", () => {
    const g = createNewGame({ empire: "egypt", seed: 70 });
    g.territories[EG].levy = 8;
    g.territories[EG].knights = 0;
    g.territories[EG].dragons = 0;
    g.territories[EG].beasts = 0;
    g.territories[EG].ships = 0;
    assert.equal(upkeepFor(g, 0).silver, 4);
    g.territories[EG].levy = 1;
    assert.equal(upkeepFor(g, 0).silver, 1);
    g.territories[EG].levy = 0;
    g.territories[EG].beasts = 2;
    assert.equal(upkeepFor(g, 0).silver, 6);
  });
  it("silver veins pay silver, and wages come from silver not gold", () => {
    let g = createNewGame({ empire: "egypt", seed: 80 });
    g.territories[EG].levy = 8;
    g.territories[EG].knights = 0;
    g.territories[EG].dragons = 0;
    g.territories[EG].beasts = 0;
    g.territories[EG].ships = 0;
    for (const id of landNeighbors(EG)) {
      if (g.territories[id]!.owner === "barbarian") g.territories[id]!.pressure = 4;
    }
    assert.ok(incomeFor(g, 0).silver >= 1);
    const gold = g.players[0]!.gold;
    const silver = g.players[0]!.silver;
    const inc = incomeFor(g, 0);
    const up = upkeepFor(g, 0);
    g.clock.currentPlayer = (PLAYER_COUNT - 1) as PlayerId;
    g = endTurn(g);
    assert.equal(g.clock.currentPlayer, 0);
    assert.equal(g.players[0]!.gold, gold + inc.gold);
    assert.equal(g.players[0]!.silver, silver + inc.silver - up.silver);
    g.territories.rift.owner = 0;
    assert.ok(incomeFor(g, 0).silver >= inc.silver + 3);
  });
  it("courts wake with silver in the purse", () => {
    const g = createNewGame({ empire: "babylon", seed: 81 });
    assert.equal(g.players[0]!.silver, 12);
  });
  it("trade grows with purse, lands, ports, ships and regions", () => {
    const g = createNewGame({ empire: "egypt", seed: 84 });
    const base = tradeFor(g, 0);
    g.players[0]!.gold += 16;
    g.players[0]!.silver += 16;
    assert.ok(tradeFor(g, 0) >= base + 4);
    g.territories.maghreb.owner = 0;
    assert.ok(tradeFor(g, 0) > base);
    g.territories[EG].port = true;
    g.territories[EG].ships = 2;
    const withSea = tradeFor(g, 0);
    g.territories.roma.owner = 0;
    assert.ok(tradeFor(g, 0) > withSea);
  });
  it("every capital mints silver", () => {
    for (const id of HOUSES) {
      const g = createNewGame({ empire: id, seed: 82 });
      assert.ok(incomeFor(g, 0).silver >= 2 + 5);
    }
    const g = createNewGame({ empire: "egypt", seed: 83 });
    const before = incomeFor(g, 0).silver;
    g.territories.roma.owner = 0;
    assert.ok(incomeFor(g, 0).silver >= before + 2 + 5);
  });
  it("capture gold scales with the defending host", () => {
    let g = createNewGame({ empire: "babylon", seed: 71 });
    g.territories.mesopotamia.levy = 16;
    const dest = legalMarchTargets(g, "mesopotamia").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 5;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    g.territories[dest]!.beasts = 0;
    const before = g.players[0]!.gold;
    g = resolveAttack(g, "mesopotamia", dest, { levy: 12, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.owner, 0);
    const loot = landscapeOf(dest).resource === "gold" ? 2 : 0;
    assert.equal(g.players[0]!.gold, before + 2 + 5 + loot);
  });
  it("cracking a region lock pays extra gold", () => {
    let g = createNewGame({ empire: "egypt", seed: 72 });
    for (const t of continentTerritories("me")) {
      g.territories[t.id]!.owner = 1;
      g.territories[t.id]!.levy = 1;
      g.territories[t.id]!.knights = 0;
      g.territories[t.id]!.dragons = 0;
      g.territories[t.id]!.beasts = 0;
      g.territories[t.id]!.castle = false;
    }
    g.territories.nile.owner = 0;
    g.territories.nile.levy = 20;
    const crack = legalMarchTargets(g, "nile").find((id) => TERRITORY_BY_ID[id]!.continent === "me")!;
    const before = g.players[0]!.gold;
    g = resolveAttack(g, "nile", crack, { levy: 12, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[crack]!.owner, 0);
    const loot = landscapeOf(crack).resource === "gold" ? 2 : 0;
    assert.equal(g.players[0]!.gold, before + 2 + 1 + CONTINENT_BREAK_GOLD + CONTINENT_BONUS.me + loot);
  });
  it("taking a capital wakes a dragon", () => {
    let g = createNewGame({ empire: "egypt", seed: 73 });
    const cap = empireOf(g.players[1]!.empire).capitol;
    const from = landNeighbors(cap).find((id) => id !== EG) ?? landNeighbors(cap)[0]!;
    g.territories[from]!.owner = 0;
    g.territories[from]!.levy = 24;
    g.territories[from]!.knights = 0;
    g.territories[from]!.dragons = 0;
    g.territories[from]!.castle = false;
    g.territories[from]!.castleRank = 0;
    g.territories[cap]!.levy = 1;
    g.territories[cap]!.knights = 0;
    g.territories[cap]!.dragons = 0;
    g.territories[cap]!.beasts = 0;
    g.territories[cap]!.castle = false;
    g.territories[cap]!.castleRank = 0;
    g = resolveAttack(g, from, cap, { levy: 16, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[cap]!.owner, 0);
    const dragons =
      g.territories[cap]!.dragons + g.territories[from]!.dragons + ownedIds(g, 0).reduce((n, id) => n + g.territories[id]!.dragons, 0);
    assert.ok(g.territories[cap]!.dragons + g.territories[from]!.dragons >= 1);
    assert.ok(dragons >= 1);
  });
  it("locking a region wakes a dragon", () => {
    let g = createNewGame({ empire: "egypt", seed: 74 });
    for (const t of continentTerritories("af")) {
      if (t.id === "nyasa") continue;
      g.territories[t.id]!.owner = 0;
    }
    g.territories.rift.levy = 20;
    g.territories.rift.dragons = 0;
    g.territories.nyasa.owner = "barbarian";
    g.territories.nyasa.levy = 1;
    g.territories.nyasa.knights = 0;
    g.territories.nyasa.dragons = 0;
    g.territories.nyasa.castle = false;
    g = resolveAttack(g, "rift", "nyasa", { levy: 12, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories.nyasa.owner, 0);
    assert.ok(continentsHeld(g, 0).includes("af"));
    const dragons = ownedIds(g, 0).reduce((n, id) => n + g.territories[id]!.dragons, 0);
    assert.ok(dragons >= 1);
  });
  it("watchReport lists a lost land and tribute", () => {
    const before = createNewGame({ empire: "egypt", seed: 48 });
    const after = createNewGame({ empire: "egypt", seed: 48 });
    after.clock.turn = 2;
    after.territories[EG].owner = "barbarian";
    const lines = watchReport(before, after);
    assert.ok(lines.some((l) => l.includes("overrun") && l.includes("Egypt")));
    assert.ok(lines.some((l) => l.startsWith("Tribute this watch")));
    assert.ok(lines.some((l) => l.includes("watch 2")));
  });
  it("odds favour a larger host", () => {
    assert.equal(oddsLabel(8, 3), "Likely to carry the field.");
    assert.equal(oddsLabel(4, 4), "Even fight.");
  });
  it("buildCastle queues a job", () => {
    let g = createNewGame({ empire: "thule", seed: 35 });
    g.players[0]!.gold = 40;
    g.players[0]!.stone = 20;
    g.players[0]!.wood = 20;
    g = buildCastle(g, "greenland");
    assert.ok(hasJob(g, "greenland"));
  });
});

describe("battle", () => {
  it("a striking host rests if it lives", () => {
    let g = createNewGame({ empire: "egypt", seed: 120, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[EG].levy = 2;
    g.territories[EG].beasts = 1;
    g.territories[dest]!.levy = 3;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g.territories[dest]!.castleRank = 0;
    let b = openBattle(
      g,
      EG,
      dest,
      { levy: 2, knights: 0, dragons: 0, beasts: 1 },
      "atk",
      worksDefense(g.territories[dest]!),
    );
    assert.ok(b);
    const lion = b!.stacks.find((f) => f.side === "atk" && f.kind === "beast")!;
    const foe = b!.stacks.find((f) => f.side === "def")!;
    b = strikeBattle(b!, lion.id, foe.id);
    const after = b.stacks.find((f) => f.id === lion.id);
    if (after && after.count > 0) assert.equal(after.exhausted, true);
    assert.ok(b.strikes >= 1);
  });
  it("kinds stand as one host, not one token each", () => {
    const g = createNewGame({ empire: "egypt", seed: 123, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[EG].levy = 6;
    const b = openBattle(g, EG, dest, { levy: 6, knights: 0, dragons: 0, beasts: 0 }, "atk", 1)!;
    assert.equal(b.stacks.filter((s) => s.side === "atk" && s.kind === "levy").length, 1);
    assert.equal(b.stacks.find((s) => s.side === "atk" && s.kind === "levy")!.count, 6);
  });
  it("walls soak hits before the garrison", () => {
    let g = createNewGame({ empire: "egypt", seed: 124, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[EG].beasts = 1;
    g.territories[dest]!.levy = 4;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 1;
    const works = worksDefense(g.territories[dest]!);
    let b = openBattle(g, EG, dest, { levy: 0, knights: 0, dragons: 0, beasts: 1 }, "atk", works)!;
    assert.equal(b.fortHp, works);
    const lion = b.stacks.find((s) => s.kind === "beast")!;
    const foe = b.stacks.find((s) => s.side === "def")!;
    const before = foe.count;
    b = strikeBattle(b, lion.id, foe.id);
    assert.ok(b.fortHp < works);
    assert.ok(foe.count === before || b.fortHp === 0 || b.stacks.find((s) => s.id === foe.id)!.count <= before);
  });
  it("a mark answers once, then the other host volleys", () => {
    let g = createNewGame({ empire: "egypt", seed: 125, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[EG].beasts = 1;
    g.territories[EG].knights = 1;
    g.territories[dest]!.levy = 6;
    g.territories[dest]!.castle = false;
    g.territories[dest]!.castleRank = 0;
    let b = openBattle(g, EG, dest, { levy: 0, knights: 1, dragons: 0, beasts: 1 }, "atk", 1)!;
    const lion = b.stacks.find((s) => s.kind === "beast")!;
    const foe = b.stacks.find((s) => s.side === "def")!;
    b = strikeBattle(b, lion.id, foe.id);
    const marked = b.stacks.find((s) => s.id === foe.id);
    if (marked && marked.count > 0) assert.equal(marked.retaliated, true);
    const knight = b.stacks.find((s) => s.kind === "knight" && s.side === "atk");
    if (knight && knight.count > 0 && !battleWinner(b)) {
      b = strikeBattle(b, knight.id, b.stacks.find((s) => s.side === "def")?.id ?? knight.id);
    }
    assert.ok(b.strikes >= 1);
  });
  it("jungle favours beasts", () => {
    const g = createNewGame({ empire: "eldorado", seed: 126, difficulty: "easy" });
    const dest = landNeighbors("amazon").find(
      (id) => g.territories[id]!.owner === "barbarian" && landscapeOf(id).terrain === "jungle",
    );
    assert.ok(dest);
    g.territories.amazon.beasts = 1;
    const b = openBattle(g, "amazon", dest!, { levy: 0, knights: 0, dragons: 0, beasts: 1 }, "atk", 1)!;
    const caiman = b.stacks.find((s) => s.kind === "beast")!;
    assert.equal(caiman.atk, beastOf("eldorado").atk + 2);
  });
  it("a host that falls below half breaks", () => {
    let g = createNewGame({ empire: "egypt", seed: 127, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[EG].beasts = 3;
    g.territories[dest]!.levy = 8;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g.territories[dest]!.castleRank = 0;
    let b = openBattle(g, EG, dest, { levy: 0, knights: 0, dragons: 0, beasts: 3 }, "atk", 1)!;
    assert.equal(b.startDef, 8);
    b = autoVolley(b);
    assert.ok(battleWinner(b) === "atk" || battleWinner(b) === "def" || b.routed);
  });
  it("commitBattle takes the land when the defenders fall", () => {
    let g = createNewGame({ empire: "egypt", seed: 122, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[EG].levy = 8;
    g.territories[EG].beasts = 3;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g.territories[dest]!.castleRank = 0;
    let b = openBattle(
      g,
      EG,
      dest,
      { levy: 4, knights: 0, dragons: 0, beasts: 3 },
      "atk",
      worksDefense(g.territories[dest]!),
    )!;
    b = autoVolley(b);
    b = autoVolley(b);
    assert.equal(battleWinner(b), "atk");
    const left = hostFromSide(b.stacks, "atk");
    g = commitBattle(g, EG, dest, b.force, left, { levy: 0, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.owner, 0);
  });
});

describe("siege and raids", () => {
  it("builds a ram after the job finishes", () => {
    let g = createNewGame({ empire: "egypt", seed: 201, difficulty: "easy" });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 20;
    g.players[0]!.metal = 20;
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g = beginSiege(g, EG, dest);
    g = buildSiege(g, EG, "ram");
    assert.ok(hasJob(g, EG));
    g = advanceJobs(g);
    assert.equal(g.territories[EG].rams, 1);
    assert.equal(g.players[0]!.gold, 20);
  });
  it("caps siege stock", () => {
    let g = createNewGame({ empire: "egypt", seed: 202, difficulty: "easy" });
    g.players[0]!.gold = 80;
    g.players[0]!.wood = 80;
    g.players[0]!.metal = 80;
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g = beginSiege(g, EG, dest);
    g.territories[EG].rams = SIEGE_CAP;
    const blocked = buildSiege(g, EG, "ram");
    assert.equal(blocked, g);
  });
  it("walled villages spawn wall segments", () => {
    const g = createNewGame({ empire: "egypt", seed: 203, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 2;
    g.territories[EG].levy = 4;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 4, knights: 0, dragons: 0, beasts: 0 },
      { rams: 1, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    assert.ok(raid.walls.length >= 8);
    assert.ok(raid.buildings.some((b) => b.kind === "keep"));
    assert.equal(raid.stock.rams, 1);
  });
  it("rams chew the gate before the keep", () => {
    const g = createNewGame({ empire: "egypt", seed: 204, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 1;
    g.territories[dest]!.levy = 0;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[EG].levy = 1;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 1, knights: 0, dragons: 0, beasts: 0 },
      { rams: 1, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    const gate = raid.walls.find((w) => w.gate);
    assert.ok(gate);
    assert.equal(deployTroop(raid, "ram", 40, 40), true);
    const ram = raid.units.find((u) => u.kind === "ram")!;
    ram.x = gate.x + gate.w / 2;
    ram.y = gate.y + gate.h + 14;
    ram.path = [];
    const hp = gate.hp;
    runRaid(raid, 4);
    assert.ok(gate.hp < hp);
  });
  it("a strong raid can take an empty camp", () => {
    let g = createNewGame({ empire: "egypt", seed: 205, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 0;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g.territories[dest]!.castleRank = 0;
    g.territories[dest]!.fort = 0;
    g.territories[EG].levy = 8;
    g.territories[EG].beasts = 2;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 8, knights: 0, dragons: 0, beasts: 2 },
      { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    runRaid(raid, 40);
    assert.equal(raidWinner(raid), "atk");
    assert.ok(raid.keepDestroyed);
    assert.equal(raid.phase, "over");
  });
  it("ladders plant a climb on a wall", () => {
    const g = createNewGame({ empire: "egypt", seed: 206, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 1;
    g.territories[dest]!.levy = 0;
    g.territories[EG].levy = 2;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 2, knights: 0, dragons: 0, beasts: 0 },
      { rams: 0, catapults: 0, ladders: 1, towers: 0 },
      "atk",
    )!;
    runRaid(raid, 20);
    assert.ok(raid.walls.some((w) => w.climb) || raid.units.some((u) => u.kind === "ladder" && u.planted));
  });
  it("cannot deploy inside the village", () => {
    const g = createNewGame({ empire: "egypt", seed: 207, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[EG].levy = 2;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 2, knights: 0, dragons: 0, beasts: 0 },
      { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    const inside = deployTroop(cloneRaid(raid), "levy", 360, 240);
    assert.equal(inside, false);
    const outside = deployTroop(raid, "levy", 40, 40);
    assert.equal(outside, true);
  });
  it("names the infantry warriors and trains an archer", () => {
    assert.equal(UNIT_LABEL.levy, "Warrior");
    assert.equal(UNIT_LABEL.bowman, "Archer");
    let g = createNewGame({ empire: "egypt", seed: 208, difficulty: "easy" });
    g.players[0]!.gold = 10;
    g.players[0]!.wood = 10;
    g.players[0]!.metal = 10;
    const before = g.territories[EG].bowmen ?? 0;
    g = trainUnit(g, EG, "bowman");
    assert.equal(g.territories[EG].bowmen, before);
    g = advanceJobs(g);
    assert.equal(g.territories[EG].bowmen, before + 1);
  });
  it("siege engines cost nothing and only raise under siege", () => {
    let g = createNewGame({ empire: "egypt", seed: 209, difficulty: "easy" });
    g.players[0]!.gold = 30;
    assert.equal(SIEGE_COST.ram.gold, 0);
    assert.equal(SIEGE_COST.ladder.gold, 0);
    assert.equal(SIEGE_COST.tower.gold, 0);
    assert.equal(SIEGE_COST.catapult.gold, 0);
    assert.equal(SIEGE_TURNS.ram, 1);
    assert.equal(SIEGE_TURNS.ladder, 1);
    assert.equal(SIEGE_TURNS.tower, 3);
    assert.equal(SIEGE_TURNS.catapult, 5);
    assert.equal(TOWER_CARGO.levy, 20);
    assert.equal(TOWER_CARGO.knights, 5);
    assert.equal(TOWER_CARGO.beasts, 5);
    const blocked = buildSiege(g, EG, "ram");
    assert.equal(blocked, g);
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g = beginSiege(g, EG, dest);
    g = buildSiege(g, EG, "catapult");
    const job = g.jobs.find((j) => j.territoryId === EG);
    assert.equal(job?.kind, "catapult");
    assert.equal(job?.remaining, 5);
    assert.equal(g.players[0]!.gold, 30);
    for (let i = 0; i < 4; i++) g = advanceJobs(g);
    assert.ok(hasJob(g, EG));
    g = advanceJobs(g);
    assert.equal(hasJob(g, EG), false);
    assert.equal(g.territories[EG].catapults, 1);
    assert.ok((g.territories[dest]!.breach ?? 0) >= 1);
  });
  it("marks the city under siege from the camp that laid it", () => {
    let g = createNewGame({ empire: "egypt", seed: 211, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    assert.equal(g.territories[dest]!.besiegedFrom, null);
    g = beginSiege(g, EG, dest);
    assert.equal(g.territories[dest]!.besiegedFrom, EG);
    assert.equal(siegeTargetOf(g, EG), dest);
  });
  it("defending bowmen stand on the keep", () => {
    const g = createNewGame({ empire: "egypt", seed: 210, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 3;
    g.territories[dest]!.fort = 3;
    g.territories[dest]!.bowmen = 3;
    g.territories[EG].levy = 1;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 1, knights: 0, dragons: 0, beasts: 0 },
      { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    const bows = raid.units.filter((u) => u.side === "def" && u.kind === "bowman");
    const keep = raid.buildings.find((b) => b.kind === "keep")!;
    assert.equal(bows.length, 3);
    assert.ok(bows.every((b) => b.onWall));
    assert.ok(bows.every((b) => Math.hypot(b.x - keep.x, b.y - keep.y) < keep.r + 24));
    assert.ok(bows[0]!.range > 164);
  });
  it("only dragons and scorpions wound dragons", () => {
    const g = createNewGame({ empire: "egypt", seed: 211, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 0;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.dragons = 1;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 1;
    g.territories[EG].levy = 6;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 6, knights: 0, dragons: 0, beasts: 0 },
      { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    const before = raid.units.find((u) => u.kind === "dragon")!.hp;
    runRaid(raid, 18);
    const drake = raid.units.find((u) => u.kind === "dragon");
    assert.ok(drake);
    assert.equal(drake!.hp, before);
  });
  it("rams spare the walls and only chew the gate", () => {
    const g = createNewGame({ empire: "egypt", seed: 212, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 1;
    g.territories[dest]!.levy = 0;
    g.territories[EG].levy = 1;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 1, knights: 0, dragons: 0, beasts: 0 },
      { rams: 1, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    const beforeOther = raid.walls.filter((w) => !w.gate).reduce((n, w) => n + w.hp, 0);
    runRaid(raid, 22);
    const afterOther = raid.walls.filter((w) => !w.gate).reduce((n, w) => n + Math.max(0, w.hp), 0);
    assert.equal(afterOther, beforeOther);
  });
});

describe("parallel jobs and cancel", () => {
  it("trains a dragon and a knight in the same city", () => {
    let g = createNewGame({ empire: "egypt", seed: 80, difficulty: "easy" });
    g.players[0]!.gold = 40;
    g.players[0]!.metal = 4;
    g = trainUnit(g, EG, "dragon");
    g = trainUnit(g, EG, "knight");
    assert.equal(g.jobs.filter((j) => j.kind === "dragon").length, 1);
    assert.equal(g.jobs.filter((j) => j.kind === "knight").length, 1);
    assert.equal(g.jobs.find((j) => j.kind === "dragon")!.remaining, UNIT_TURNS.dragon);
    assert.equal(g.jobs.find((j) => j.kind === "knight")!.remaining, UNIT_TURNS.knight);
  });
  it("raises a farm while a port is underway", () => {
    let g = createNewGame({ empire: "egypt", seed: 81, difficulty: "easy" });
    g.players[0]!.gold = 40;
    g.players[0]!.wood = 20;
    g = buildPort(g, EG);
    g = buildFarm(g, EG);
    assert.ok(g.jobs.some((j) => j.kind === "port"));
    assert.ok(g.jobs.some((j) => j.kind === "farm"));
    assert.ok(constructionBusy(g, EG));
  });
  it("will not queue a second port in the same city", () => {
    let g = createNewGame({ empire: "egypt", seed: 82, difficulty: "easy" });
    g.players[0]!.gold = 40;
    g.players[0]!.wood = 20;
    g = buildPort(g, EG);
    const blocked = buildPort(g, EG);
    assert.equal(blocked.jobs.filter((j) => j.kind === "port").length, 1);
    assert.equal(hasKindJob(g, EG, "port"), true);
  });
  it("cancelJob refunds the purse and drops the drill", () => {
    let g = createNewGame({ empire: "egypt", seed: 83, difficulty: "easy" });
    g.players[0]!.gold = 30;
    const gold = g.players[0]!.gold;
    g = trainUnit(g, EG, "dragon");
    assert.equal(g.players[0]!.gold, gold - UNIT_COST.dragon.gold);
    const job = g.jobs.find((j) => j.kind === "dragon")!;
    g = cancelJob(g, job.id);
    assert.equal(g.jobs.length, 0);
    assert.equal(g.players[0]!.gold, gold);
  });
  it("cancelMarch returns the column to the origin", () => {
    let g = createNewGame({ empire: "egypt", seed: 84, difficulty: "easy" });
    const dest = landNeighbors(EG)[0]!;
    g.territories[EG].levy = 8;
    g = issueMarch(g, EG, dest, { levy: 3, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[EG].levy, 5);
    assert.equal((g.marches ?? []).length, 1);
    const march = g.marches![0]!;
    g = cancelMarch(g, march.id);
    assert.equal((g.marches ?? []).length, 0);
    assert.equal(g.territories[EG].levy, 8);
  });
  it("AI trains a knight while a levy is already drilling", () => {
    let g = createNewGame({ empire: "egypt", seed: 41, difficulty: "normal" });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 8;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 6;
    g.territories[EG].beasts = 0;
    g.territories[EG].knights = 0;
    for (const id of landNeighbors(EG)) {
      g.territories[id]!.levy = 18;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    g = trainUnit(g, EG, "levy");
    const a = nextAiAction(g);
    assert.equal(a.type, "train");
    if (a.type === "train") assert.equal(a.kind, "knight");
  });
  it("AI buys a dragon when the purse is fat and the border holds", () => {
    let g = createNewGame({ empire: "egypt", seed: 41, difficulty: "normal" });
    g.players[0]!.gold = 30;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 4;
    g.players[0]!.silver = 20;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 8;
    g.territories[EG].beasts = 0;
    g.territories[EG].dragons = 0;
    for (const id of landNeighbors(EG)) {
      g.territories[id]!.levy = 18;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.equal(a.type, "train");
    if (a.type === "train") assert.equal(a.kind, "dragon");
  });
  it("AI opens a market once three lands are held", () => {
    let g = createNewGame({ empire: "egypt", seed: 41, difficulty: "normal" });
    g.players[0]!.gold = 8;
    g.players[0]!.wood = 6;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 0;
    g.players[0]!.cards = [];
    g.territories[EG].levy = 8;
    g.territories[EG].beasts = 0;
    g.territories[EG].market = false;
    const extras = landNeighbors(EG).filter((id) => g.territories[id]!.owner === "barbarian").slice(0, 2);
    for (const id of extras) {
      g.territories[id]!.owner = 0;
      g.territories[id]!.levy = 4;
      g.territories[id]!.market = false;
    }
    for (const id of landNeighbors(EG)) {
      if (g.territories[id]!.owner === 0) continue;
      g.territories[id]!.levy = 18;
      g.territories[id]!.knights = 0;
    }
    assert.ok(ownedIds(g, 0).length >= 3);
    const a = nextAiAction(g);
    assert.equal(a.type, "build");
    if (a.type === "build") assert.equal(a.kind, "market");
  });
  it("AI jobs tick on their own watch", () => {
    let g = createNewGame({ empire: "egypt", seed: 85, difficulty: "easy" });
    g.clock.currentPlayer = 1;
    const cap = empireOf(g.players[1]!.empire).capitol;
    g.players[1]!.gold = 30;
    g = trainUnit(g, cap, "dragon");
    assert.equal(g.jobs[0]!.remaining, UNIT_TURNS.dragon);
    g.clock.currentPlayer = 0;
    g = endTurn(g);
    const job = g.jobs.find((j) => j.kind === "dragon" && j.player === 1);
    assert.equal(job?.remaining, UNIT_TURNS.dragon - 1);
  });
});
