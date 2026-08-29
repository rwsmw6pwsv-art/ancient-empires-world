import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playAiTurns } from "./ai.ts";
import { nextAiAction } from "./ai.ts";
import { EMPIRE_LIST, empireOf } from "./empires.ts";
import {
  advanceJobs,
  buildCastle,
  buildMarket,
  buildMine,
  buildPort,
  buildShip,
  checkVictory,
  constructionBusy,
  continentsHeld,
  createNewGame,
  defenseStrength,
  endTurn,
  hasJob,
  incomeFor,
  legalMarchTargets,
  ownedIds,
  oddsLabel,
  playCard,
  raiseWorks,
  rankPlayers,
  realmRecruits,
  recallOccupiers,
  resolveAttack,
  setMarchFrom,
  trainUnit,
  watchReport,
} from "./engine.ts";
import { beastOf, landscapeOf } from "./landscape.ts";
import { CAPITOL, CITY_DEF, HOUSES, PLAYER_COUNT, SAVE_VERSION, TRIBAL_DEF, UNIT_COST, UNIT_STR, WALL_DEF, WIN_CONTINENTS } from "./types.ts";
import { DIFFICULTIES } from "./campaign.ts";
import { TERRITORIES, TERRITORY_BY_ID, continentTerritories, landNeighbors } from "./world.ts";

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
    assert.equal(beastOf("atlantis").atk, 10);
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
    assert.equal(beastOf("cape").atk, 9);
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
  it("center thrones wake with walls and extra levy", () => {
    const a = createNewGame({ empire: "atlantis", seed: 5 });
    assert.equal(a.territories.roma.castle, true);
    assert.ok(a.territories.roma.levy >= 8);
    const b = createNewGame({ empire: "babylon", seed: 5 });
    assert.equal(b.territories.mesopotamia.castle, true);
    const e = createNewGame({ empire: "eldorado", seed: 5 });
    assert.equal(e.territories.amazon.castle, true);
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
  it("two continents wins", () => {
    let g = createNewGame({ empire: "egypt", seed: 33 });
    assert.equal(WIN_CONTINENTS, 2);
    for (const t of continentTerritories("af")) g.territories[t.id]!.owner = 0;
    for (const t of continentTerritories("eu")) g.territories[t.id]!.owner = 0;
    g = checkVictory(g);
    assert.equal(g.winner, 0);
  });
  it("the age needs two continents to crown", () => {
    let g = createNewGame({ empire: "egypt", seed: 36 });
    g.clock.turn = 100;
    g = checkVictory(g);
    assert.equal(g.phase, "gameover");
    assert.equal(g.winner, null);
  });
  it("the age ranks continents before provinces", () => {
    let g = createNewGame({ empire: "egypt", seed: 36 });
    for (const t of continentTerritories("af")) g.territories[t.id]!.owner = 0;
    for (const t of continentTerritories("eu")) g.territories[t.id]!.owner = 0;
    for (const t of continentTerritories("sa")) g.territories[t.id]!.owner = 1;
    g.clock.turn = 100;
    g = checkVictory(g);
    assert.equal(g.winner, 0);
    assert.ok(rankPlayers(g)[0]!.continents >= 2);
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
    g = trainUnit(g, "nile", "beast");
    assert.equal(g.territories.nile.beasts, 1);
    assert.equal(beastOf("egypt").atk, 8);
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
    assert.equal(defenseStrength(seat), CITY_DEF);
    seat.castle = true;
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
    split.territories.india.owner = 0;
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
  it("AI leaves a garrison on the capital", () => {
    let g = createNewGame({ empire: "egypt", seed: 40, difficulty: "hard" });
    g.players[0]!.gold = 0;
    g.players[0]!.wood = 0;
    g.players[0]!.stone = 0;
    g.players[0]!.metal = 0;
    g.players[0]!.cards = [];
    g.territories.nile.levy = 40;
    const a = nextAiAction(g);
    assert.equal(a.type, "march");
    if (a.type === "march") {
      assert.ok(a.levy + a.knights + a.dragons <= 38);
      assert.ok(40 - a.levy >= 2);
    }
  });
  it("AI raises a port before a market", () => {
    let g = createNewGame({ empire: "egypt", seed: 41 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g.players[0]!.metal = 0;
    g.players[0]!.cards = [];
    g.territories.nile.port = false;
    g.territories.nile.market = false;
    for (const id of landNeighbors("nile")) {
      g.territories[id]!.levy = 20;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.equal(a.type, "build");
    if (a.type === "build") assert.equal(a.kind, "port");
  });
  it("AI trains before a port when the border is stout", () => {
    let g = createNewGame({ empire: "egypt", seed: 41 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g.players[0]!.cards = [];
    g.territories.nile.levy = 8;
    g.territories.nile.port = false;
    for (const id of landNeighbors("nile")) {
      g.territories[id]!.levy = 12;
      g.territories[id]!.knights = 0;
      g.territories[id]!.castle = false;
    }
    const a = nextAiAction(g);
    assert.equal(a.type, "train");
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
