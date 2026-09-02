import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playAiTurns } from "./ai.ts";
import { nextAiAction } from "./ai.ts";
import { autoVolley, battleWinner, hostFromSide, openBattle, strikeBattle } from "./battle.ts";
import { EMPIRE_LIST, empireOf } from "./empires.ts";
import {
  advanceJobs,
  buildCastle,
  buildMarket,
  buildMine,
  buildPort,
  buildRoad,
  buildFarm,
  buildShip,
  checkVictory,
  commitBattle,
  constructionBusy,
  continentsHeld,
  createNewGame,
  defenseStrength,
  endTurn,
  foodNeed,
  hasJob,
  incomeFor,
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
  trainUnit,
  tradeFor,
  upkeepFor,
  watchReport,
  shipsCap,
  worksRank,
  worksCost,
  worksDefense,
} from "./engine.ts";
import { beastOf, landscapeOf } from "./landscape.ts";
import { CAPITOL, CITY_DEF, CONTINENT_BONUS, CONTINENT_BREAK_GOLD, HOUSES, PLAYER_COUNT, SAVE_VERSION, TRIBAL_DEF, TURN_LIMIT, UNIT_COST, UNIT_STR, WALL_DEF, WALL_IMPROVE, WIN_CONTINENTS, WORKS_CAP } from "./types.ts";
import { DIFFICULTIES } from "./campaign.ts";
import { TERRITORIES, TERRITORY_BY_ID, continentTerritories, landNeighbors, seaNeighbors } from "./world.ts";

describe("world", () => {
  it("has sixty-five provinces", () => {
    assert.equal(TERRITORIES.length, 65);
  });
  it("Malaya is Oceania", () => {
    assert.equal(TERRITORY_BY_ID.malaya.continent, "oc");
  });
  it("Steppe is Middle East", () => {
    assert.equal(TERRITORY_BY_ID.steppe.continent, "me");
  });
  it("Babylon is coastal", () => {
    assert.equal(TERRITORY_BY_ID.mesopotamia.coastal, true);
  });
  it("inland mines only on prairie amazon cerrado gobi", () => {
    for (const id of ["prairie", "amazon", "cerrado", "gobi"]) {
      assert.equal(TERRITORY_BY_ID[id]!.coastal, false, id);
    }
  });
  it("continents have land", () => {
    for (const c of ["na", "ca", "sa", "eu", "af", "me", "as", "oc"]) {
      assert.ok(continentTerritories(c).length >= 6, c);
    }
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
    assert.equal(landscapeOf("nile").wonder, "pyramids");
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
    assert.equal(beastOf("asgard").id, "buffalo");
    assert.equal(beastOf("egypt").id, "lion");
    assert.equal(beastOf("babylon").id, "elephant");
    assert.equal(beastOf("gondwana").id, "crocodile");
    assert.equal(beastOf("tartaria").id, "siberian-tiger");
    assert.equal(beastOf("patagonia").id, "grizzly");
    assert.equal(beastOf("thule").id, "polar-bear");
    assert.equal(beastOf("cape").id, "hippo");
    assert.equal(beastOf("cape").atk, 15);
    assert.equal(beastOf("cape").def, 10);
    assert.equal(beastOf("cape").cost, 9);
  });
});

describe("houses", () => {
  it("twelve thrones", () => {
    assert.equal(HOUSES.length, PLAYER_COUNT);
    assert.equal(EMPIRE_LIST.length, PLAYER_COUNT);
  });
  it("capitals match the seats", () => {
    assert.equal(CAPITOL.atlantis, "roma");
    assert.equal(CAPITOL.egypt, "nile");
    assert.equal(CAPITOL.thule, "greenland");
    assert.equal(empireOf("thule").capitol, "greenland");
    assert.equal(empireOf("babylon").capitol, "mesopotamia");
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
    assert.deepEqual(ownedIds(g, 0), ["nile"]);
    assert.equal(g.territories.nile.owner, 0);
    assert.equal(g.players[0]!.human, true);
    assert.equal(g.players.length, 12);
  });
  it("Thule wakes in Greenland", () => {
    assert.equal(createNewGame({ empire: "thule", seed: 4 }).territories.greenland.owner, 0);
  });
  it("Nord starts with a port and a land road to Labrador", () => {
    const g = createNewGame({ empire: "thule", seed: 4 });
    assert.equal(g.territories.greenland.port, true);
    assert.ok(landNeighbors("greenland").includes("labrador"));
    assert.ok(landNeighbors("greenland").includes("hudson"));
    assert.ok(landNeighbors("greenland").includes("fjords"));
  });
  it("every capital wakes walled with the same host", () => {
    const egypt = createNewGame({ empire: "egypt", seed: 5, difficulty: "normal" });
    assert.equal(egypt.territories.nile.castle, true);
    assert.equal(egypt.territories.nile.levy, 8);
    for (const id of HOUSES) {
      const g = createNewGame({ empire: id, seed: 5, difficulty: "normal" });
      const cap = empireOf(id).capitol;
      assert.equal(g.territories[cap]!.castle, true, id);
      assert.equal(g.territories[cap]!.levy, 8, id);
    }
  });
  it("capitals wake with more men on harder ages", () => {
    const easy = createNewGame({ empire: "egypt", seed: 7, difficulty: "easy" });
    const mid = createNewGame({ empire: "egypt", seed: 7, difficulty: "normal" });
    const hard = createNewGame({ empire: "egypt", seed: 7, difficulty: "hard" });
    assert.equal(easy.territories.nile.levy, 6);
    assert.equal(mid.territories.nile.levy, 8);
    assert.equal(hard.territories.nile.levy, 10);
  });
  it("capitals wake with house beasts, more on easier ages", () => {
    const easy = createNewGame({ empire: "egypt", seed: 8, difficulty: "easy" });
    const mid = createNewGame({ empire: "egypt", seed: 8, difficulty: "normal" });
    const hard = createNewGame({ empire: "egypt", seed: 8, difficulty: "hard" });
    assert.equal(easy.territories.nile.beasts, 3);
    assert.equal(mid.territories.nile.beasts, 2);
    assert.equal(hard.territories.nile.beasts, 1);
  });
  it("save version is current", () => {
    assert.equal(createNewGame({ empire: "aztec", seed: 1 }).version, SAVE_VERSION);
  });
});

describe("ports and mines", () => {
  it("Babylon can raise a port", () => {
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
    g = raiseWorks(g, "nile", "castle");
    assert.ok(hasJob(g, "nile"));
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
  it("a ship sails with the host and a second keel strikes again", () => {
    let g = createNewGame({ empire: "egypt", seed: 17 });
    g.territories.nile.port = true;
    g.territories.nile.ships = 2;
    g.territories.nile.levy = 20;
    g.territories.nile.beasts = 0;
    const first = seaNeighbors("nile").find((id) => g.territories[id]!.owner === "barbarian")!;
    const second = seaNeighbors("nile").find((id) => id !== first && g.territories[id]!.owner === "barbarian")!;
    g.territories[first]!.levy = 1;
    g.territories[first]!.knights = 0;
    g.territories[first]!.beasts = 0;
    g.territories[first]!.castle = false;
    g.territories[second]!.levy = 1;
    g.territories[second]!.knights = 0;
    g.territories[second]!.beasts = 0;
    g.territories[second]!.castle = false;
    g = resolveAttack(g, "nile", first, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[first]!.owner, 0);
    assert.equal(g.territories.nile.ships, 1);
    assert.equal(g.territories[first]!.ships, 1);
    g = resolveAttack(g, "nile", second, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[second]!.owner, 0);
    assert.equal(g.territories.nile.ships, 0);
    assert.equal(g.territories[second]!.ships, 1);
  });
  it("a wiped landing loses the keel", () => {
    let g = createNewGame({ empire: "egypt", seed: 19 });
    g.territories.nile.port = true;
    g.territories.nile.ships = 1;
    g.territories.nile.levy = 2;
    g.territories.nile.beasts = 0;
    const dest = seaNeighbors("nile").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 30;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 1;
    g = resolveAttack(g, "nile", dest, { levy: 1, knights: 0, dragons: 0, beasts: 0 });
    assert.notEqual(g.territories[dest]!.owner, 0);
    assert.equal(g.territories.nile.ships, 0);
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
    g.territories.nile.port = true;
    g.territories.nile.portRank = 1;
    g.territories.nile.ships = 1;
    g.territories.nile.levy = 12;
    g.territories.nile.beasts = 0;
    const dest = seaNeighbors("nile").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g = resolveAttack(g, "nile", dest, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.owner, 0);
    assert.equal(g.territories[dest]!.ships, 1);
    assert.equal(g.territories.nile.ships, 0);
    const held = g.territories[dest]!.levy;
    g = recallOccupiers(g, "nile", dest, { levy: held - 1, knights: 0, dragons: 0, beasts: 0, ships: 1 });
    assert.equal(g.territories[dest]!.ships, 0);
    assert.equal(g.territories.nile.ships, 1);
  });
  it("Babylon can open a market", () => {
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
    g.players[0]!.stone = 20;
    const seat = g.territories.nile!;
    seat.levy = 0;
    seat.knights = 0;
    seat.dragons = 0;
    seat.beasts = 0;
    seat.castle = false;
    seat.castleRank = 0;
    g = buildCastle(g, "nile");
    g = advanceJobs(g);
    g = advanceJobs(g);
    assert.equal(defenseStrength(g.territories.nile), CITY_DEF + WALL_DEF);
    g = buildCastle(g, "nile");
    g = advanceJobs(g);
    assert.equal(defenseStrength(g.territories.nile), CITY_DEF + WALL_DEF + WALL_IMPROVE);
  });
  it("capitals wake with citizens and grain", () => {
    const g = createNewGame({ empire: "egypt", seed: 90 });
    assert.equal(g.territories.nile.population, 4);
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
    g.clock.currentPlayer = 11;
    g = endTurn(g);
    assert.ok(g.territories.mesopotamia.population > pop);
  });
  it("hunger shrinks a city", () => {
    let g = createNewGame({ empire: "egypt", seed: 92 });
    g.territories.nile.population = 8;
    g.players[0]!.food = 0;
    for (const id of landNeighbors("nile")) {
      if (g.territories[id]!.owner === "barbarian") g.territories[id]!.pressure = 4;
    }
    g.clock.currentPlayer = 11;
    g = endTurn(g);
    assert.ok(g.territories.nile.population < 8);
  });
  it("a paved capital can open a road into a neighbour", () => {
    let g = createNewGame({ empire: "egypt", seed: 17 });
    assert.equal(g.territories.nile.road, true);
    const edge = landNeighbors("nile")[0]!;
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
  it("Cape draws wood from Africa", () => {
    const g = createNewGame({ empire: "cape", seed: 22 });
    assert.ok(incomeFor(g, 0).wood >= 1);
  });
  it("train men spend gold and metal", () => {
    let g = createNewGame({ empire: "babylon", seed: 23 });
    const gold = g.players[0]!.gold;
    const metal = g.players[0]!.metal;
    const levy = g.territories.mesopotamia.levy;
    g = trainUnit(g, "mesopotamia", "levy");
    assert.equal(g.players[0]!.gold, gold - 2);
    assert.equal(g.players[0]!.metal, metal - 1);
    assert.equal(g.territories.mesopotamia.levy, levy + 1);
  });
  it("dragons cost gold only", () => {
    let g = createNewGame({ empire: "babylon", seed: 23 });
    g.players[0]!.gold = 30;
    g.players[0]!.stone = 0;
    g.players[0]!.wood = 0;
    g.players[0]!.metal = 0;
    g = trainUnit(g, "mesopotamia", "dragon");
    assert.equal(g.territories.mesopotamia.dragons, 1);
    assert.equal(g.players[0]!.gold, 5);
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
    const edge = landNeighbors("nile")[0];
    assert.ok(edge);
    g.territories[edge]!.owner = 0;
    g.territories[edge]!.levy = 2;
    g.territories.nile.levy = 8;
    assert.ok(legalMarchTargets(g, "nile").includes(edge));
    g = resolveAttack(g, "nile", edge, { levy: 3, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories.nile.owner, 0);
    assert.equal(g.territories[edge]!.owner, 0);
    assert.equal(g.territories.nile.levy, 5);
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
  it("playCard levy adds men", () => {
    let g = createNewGame({ empire: "babylon", seed: 32 });
    g.players[0]!.cards = ["levy"];
    const levy = g.territories.mesopotamia.levy;
    g = playCard(g, "levy", "mesopotamia");
    assert.equal(g.territories.mesopotamia.levy, levy + 2);
  });
  it("five continents wins", () => {
    let g = createNewGame({ empire: "egypt", seed: 33 });
    assert.equal(WIN_CONTINENTS, 5);
    for (const c of ["af", "eu", "sa", "ca", "me"] as const) {
      for (const t of continentTerritories(c)) g.territories[t.id]!.owner = 0;
    }
    g = checkVictory(g);
    assert.equal(g.winner, 0);
  });
  it("the age needs two continents to crown", () => {
    let g = createNewGame({ empire: "egypt", seed: 36 });
    g.clock.turn = TURN_LIMIT;
    g = checkVictory(g);
    assert.equal(g.phase, "gameover");
    assert.equal(g.winner, null);
  });
  it("the age ranks continents before provinces", () => {
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
    g.territories.nile.beasts = 0;
    g = trainUnit(g, "nile", "beast");
    assert.equal(g.territories.nile.beasts, 1);
    assert.equal(beastOf("egypt").atk, 14);
    assert.equal(beastOf("egypt").def, 7);
    assert.equal(beastOf("egypt").cost, 7);
    assert.equal(UNIT_STR.dragon, 25);
    assert.ok(UNIT_STR.dragon > beastOf("egypt").atk);
    assert.ok(beastOf("egypt").atk > UNIT_STR.knight);
    assert.ok(UNIT_STR.knight > UNIT_STR.levy);
    assert.equal(g.players[0]!.gold, 13);
    assert.equal(UNIT_COST.dragon.gold, 25);
  });
  it("cities and walls stack on defence", () => {
    const g = createNewGame({ empire: "egypt", seed: 38 });
    const seat = g.territories.nile!;
    seat.levy = 0;
    seat.knights = 0;
    seat.dragons = 0;
    seat.beasts = 0;
    seat.castle = false;
    seat.castleRank = 0;
    assert.equal(defenseStrength(seat), CITY_DEF);
    seat.castle = true;
    seat.castleRank = 1;
    assert.equal(defenseStrength(seat), CITY_DEF + WALL_DEF);
    const camp = g.territories.maghreb!;
    camp.levy = 0;
    camp.knights = 0;
    camp.dragons = 0;
    camp.beasts = 0;
    camp.castle = false;
    assert.equal(defenseStrength(camp), TRIBAL_DEF);
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
  it("lands on one continent out-earn a scatter", () => {
    const clustered = createNewGame({ empire: "egypt", seed: 40 });
    clustered.territories.maghreb.owner = 0;
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
    g.territories.nile.levy = 8;
    for (const id of landNeighbors("nile")) {
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
    g.territories.nile.levy = 8;
    g.territories.nile.beasts = 2;
    for (const id of landNeighbors("nile")) {
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
    g.territories.nile.levy = 40;
    g.territories.nile.beasts = 0;
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
    g.territories.nile.port = false;
    g.territories.nile.market = false;
    g.territories.nile.levy = 8;
    for (const id of landNeighbors("nile")) {
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
    g.territories.nile.levy = 8;
    g.territories.nile.port = false;
    g.territories.nile.beasts = 0;
    for (const id of landNeighbors("nile")) {
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
    g.territories.nile.levy = 5;
    g.territories.nile.beasts = 0;
    for (const id of landNeighbors("nile")) {
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
    g.territories.nile.levy = 5;
    g.territories.nile.beasts = 0;
    for (const id of landNeighbors("nile")) {
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
    g.territories.nile.levy = 6;
    g.territories.nile.knights = 1;
    g.territories.nile.beasts = 0;
    for (const id of landNeighbors("nile")) {
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
    g.territories.nile.levy = 20;
    const neighbor = landNeighbors("nile")[0]!;
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
    g.territories.nile.levy = 10;
    const rival = landNeighbors("nile")[0]!;
    g.territories[rival]!.owner = 1;
    g.territories[rival]!.levy = 1;
    g.territories[rival]!.knights = 0;
    g.territories[rival]!.castle = false;
    for (const id of landNeighbors("nile")) {
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
    g.territories.nile.levy = 10;
    g.territories.nile.beasts = 0;
    const rival = landNeighbors("nile")[0]!;
    g.territories[rival]!.owner = 1;
    g.territories[rival]!.levy = 1;
    g.territories[rival]!.knights = 0;
    g.territories[rival]!.castle = false;
    for (const id of landNeighbors("nile")) {
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
  it("houses draw a yield from their home continent", () => {
    const egypt = createNewGame({ empire: "egypt", seed: 97 });
    const food = incomeFor(egypt, 0).food;
    egypt.territories.maghreb.owner = 0;
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
    assert.equal(empireOf("lumuria").name, "Lemuria");
    assert.ok(!empireOf("egypt").blurb.toLowerCase().includes("black land"));
    assert.equal(TERRITORY_BY_ID.roma.name, "Graecia");
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
    const edge = landNeighbors("greenland").find((id) => g.territories[id]!.owner === "barbarian");
    assert.ok(edge);
    g.territories[edge]!.levy = 4;
    g.territories[edge]!.pressure = 0;
    g.territories.greenland.levy = 1;
    g.territories.greenland.knights = 0;
    g.territories.greenland.dragons = 0;
    g.territories.greenland.beasts = 0;
    g.territories.greenland.castle = false;
    for (let i = 0; i < 48; i++) g = endTurn(g);
    const raided = g.log.some((l) => l.includes("raid") || l.includes("overrun"));
    assert.ok(raided || g.territories.greenland.owner === "barbarian" || g.territories.greenland.levy < 1);
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
    assert.ok(camps.every((t) => t.levy >= 4 && t.levy <= 6));
    assert.ok(camps.every((t) => !t.castle));
    assert.ok(camps.some((t) => t.levy >= 5 || t.knights > 0));
  });
  it("Easy tribes wake thin and Hard tribes wake stout", () => {
    const easy = createNewGame({ empire: "babylon", seed: 47, difficulty: "easy" });
    const hard = createNewGame({ empire: "babylon", seed: 47, difficulty: "hard" });
    const easyCamps = Object.values(easy.territories).filter((t) => t.owner === "barbarian");
    const hardCamps = Object.values(hard.territories).filter((t) => t.owner === "barbarian");
    assert.ok(easyCamps.every((t) => t.levy >= 1 && t.levy <= 3));
    assert.ok(hardCamps.every((t) => t.levy >= 7 && t.levy <= 9));
  });
  it("Easy camps stop replenishing after turn 30", () => {
    let g = createNewGame({ empire: "egypt", seed: 93, difficulty: "easy" });
    const camp = Object.values(g.territories).find((t) => t.owner === "barbarian")!;
    camp.levy = 1;
    camp.pressure = 4;
    g.clock.turn = 30;
    g.clock.currentPlayer = 11;
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
  it("standing men draw wages", () => {
    const g = createNewGame({ empire: "egypt", seed: 70 });
    g.territories.nile.levy = 8;
    g.territories.nile.knights = 0;
    g.territories.nile.dragons = 0;
    g.territories.nile.beasts = 0;
    g.territories.nile.ships = 0;
    assert.equal(upkeepFor(g, 0).silver, 4);
    g.territories.nile.levy = 1;
    assert.equal(upkeepFor(g, 0).silver, 1);
    g.territories.nile.levy = 0;
    g.territories.nile.beasts = 2;
    assert.equal(upkeepFor(g, 0).silver, 6);
  });
  it("silver veins pay silver, and wages come from silver not gold", () => {
    let g = createNewGame({ empire: "egypt", seed: 80 });
    g.territories.nile.levy = 8;
    g.territories.nile.knights = 0;
    g.territories.nile.dragons = 0;
    g.territories.nile.beasts = 0;
    g.territories.nile.ships = 0;
    for (const id of landNeighbors("nile")) {
      if (g.territories[id]!.owner === "barbarian") g.territories[id]!.pressure = 4;
    }
    assert.ok(incomeFor(g, 0).silver >= 1);
    const gold = g.players[0]!.gold;
    const silver = g.players[0]!.silver;
    const inc = incomeFor(g, 0);
    const up = upkeepFor(g, 0);
    g.clock.currentPlayer = 11;
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
  it("trade grows with purse, lands, ports, ships and continents", () => {
    const g = createNewGame({ empire: "egypt", seed: 84 });
    const base = tradeFor(g, 0);
    g.players[0]!.gold += 16;
    g.players[0]!.silver += 16;
    assert.ok(tradeFor(g, 0) >= base + 4);
    g.territories.maghreb.owner = 0;
    assert.ok(tradeFor(g, 0) > base);
    g.territories.nile.port = true;
    g.territories.nile.ships = 2;
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
  it("cracking a continent lock pays extra gold", () => {
    let g = createNewGame({ empire: "egypt", seed: 72 });
    for (const t of continentTerritories("me")) {
      g.territories[t.id]!.owner = 1;
      g.territories[t.id]!.levy = 1;
      g.territories[t.id]!.knights = 0;
      g.territories[t.id]!.dragons = 0;
      g.territories[t.id]!.beasts = 0;
      g.territories[t.id]!.castle = false;
    }
    g.territories.nile.levy = 20;
    const before = g.players[0]!.gold;
    g = resolveAttack(g, "nile", "arabia", { levy: 12, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories.arabia.owner, 0);
    const loot = landscapeOf("arabia").resource === "gold" ? 2 : 0;
    assert.equal(g.players[0]!.gold, before + 2 + 1 + CONTINENT_BREAK_GOLD + CONTINENT_BONUS.me + loot);
  });
  it("taking a capital wakes a dragon", () => {
    let g = createNewGame({ empire: "egypt", seed: 73 });
    const cap = empireOf(g.players[1]!.empire).capitol;
    const from = landNeighbors(cap).find((id) => id !== "nile") ?? landNeighbors(cap)[0]!;
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
  it("locking a continent wakes a dragon", () => {
    let g = createNewGame({ empire: "egypt", seed: 74 });
    for (const t of continentTerritories("af")) {
      if (t.id === "maghreb") continue;
      g.territories[t.id]!.owner = 0;
    }
    g.territories.nile.levy = 20;
    g.territories.nile.dragons = 0;
    g.territories.maghreb.owner = "barbarian";
    g.territories.maghreb.levy = 1;
    g.territories.maghreb.knights = 0;
    g.territories.maghreb.dragons = 0;
    g.territories.maghreb.castle = false;
    g = resolveAttack(g, "nile", "maghreb", { levy: 12, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories.maghreb.owner, 0);
    assert.ok(continentsHeld(g, 0).includes("af"));
    const dragons = ownedIds(g, 0).reduce((n, id) => n + g.territories[id]!.dragons, 0);
    assert.ok(dragons >= 1);
  });
  it("watchReport lists a lost land and tribute", () => {
    const before = createNewGame({ empire: "egypt", seed: 48 });
    const after = createNewGame({ empire: "egypt", seed: 48 });
    after.clock.turn = 2;
    after.territories.nile.owner = "barbarian";
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
    g = buildCastle(g, "greenland");
    assert.ok(hasJob(g, "greenland"));
  });
});

describe("battle", () => {
  it("a striking host rests if it lives", () => {
    let g = createNewGame({ empire: "egypt", seed: 120, difficulty: "easy" });
    const dest = landNeighbors("nile").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories.nile.levy = 2;
    g.territories.nile.beasts = 1;
    g.territories[dest]!.levy = 3;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g.territories[dest]!.castleRank = 0;
    let b = openBattle(
      g,
      "nile",
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
    const dest = landNeighbors("nile").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories.nile.levy = 6;
    const b = openBattle(g, "nile", dest, { levy: 6, knights: 0, dragons: 0, beasts: 0 }, "atk", 1)!;
    assert.equal(b.stacks.filter((s) => s.side === "atk" && s.kind === "levy").length, 1);
    assert.equal(b.stacks.find((s) => s.side === "atk" && s.kind === "levy")!.count, 6);
  });
  it("walls soak hits before the garrison", () => {
    let g = createNewGame({ empire: "egypt", seed: 124, difficulty: "easy" });
    const dest = landNeighbors("nile").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories.nile.beasts = 1;
    g.territories[dest]!.levy = 4;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 1;
    const works = worksDefense(g.territories[dest]!);
    let b = openBattle(g, "nile", dest, { levy: 0, knights: 0, dragons: 0, beasts: 1 }, "atk", works)!;
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
    const dest = landNeighbors("nile").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories.nile.beasts = 1;
    g.territories.nile.knights = 1;
    g.territories[dest]!.levy = 6;
    g.territories[dest]!.castle = false;
    g.territories[dest]!.castleRank = 0;
    let b = openBattle(g, "nile", dest, { levy: 0, knights: 1, dragons: 0, beasts: 1 }, "atk", 1)!;
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
    const dest = landNeighbors("nile").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories.nile.beasts = 3;
    g.territories[dest]!.levy = 8;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g.territories[dest]!.castleRank = 0;
    let b = openBattle(g, "nile", dest, { levy: 0, knights: 0, dragons: 0, beasts: 3 }, "atk", 1)!;
    assert.equal(b.startDef, 8);
    b = autoVolley(b);
    assert.ok(battleWinner(b) === "atk" || battleWinner(b) === "def" || b.routed);
  });
  it("commitBattle takes the land when the defenders fall", () => {
    let g = createNewGame({ empire: "egypt", seed: 122, difficulty: "easy" });
    const dest = landNeighbors("nile").find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories.nile.levy = 8;
    g.territories.nile.beasts = 3;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g.territories[dest]!.castleRank = 0;
    let b = openBattle(
      g,
      "nile",
      dest,
      { levy: 4, knights: 0, dragons: 0, beasts: 3 },
      "atk",
      worksDefense(g.territories[dest]!),
    )!;
    b = autoVolley(b);
    b = autoVolley(b);
    assert.equal(battleWinner(b), "atk");
    const left = hostFromSide(b.stacks, "atk");
    g = commitBattle(g, "nile", dest, b.force, left, { levy: 0, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.owner, 0);
  });
});
