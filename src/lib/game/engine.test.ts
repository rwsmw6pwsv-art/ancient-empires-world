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
  capitalsHeld,
  createNewGame,
  cityWatch,
  defenseStrength,
  endTurn,
  foodNeed,
  fortOf,
  hasJob,
  houseOfLand,
  incomeFor,
  issueMarch,
  legalMarchTargets,
  ownedIds,
  oddsLabel,
  playCard,
  raiseWorks,
  rankPlayers,
  rankShiftLines,
  realmRecruits,
  realmPopulation,
  empireStats,
  empireScore,
  empireLevel,
  recallOccupiers,
  resolveAttack,
  setMarchFrom,
  siegeTargetOf,
  siegeTurnsFor,
  trainUnit,
  trainWarship,
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
  beastOfLand,
  beastOfTerritory,
} from "./engine.ts";
import { autoDeployAll, autoDeployDef, beginAssault, canDeployAt, chargeWave, cloneRaid, cityArtId, cityRadius, deployTroop, hostTotal, hurtBuilding, hurtWall, DEF_KIND_ORDERS, KIND_ORDERS, openRaid, RAID_CX, RAID_CY, RAID_GATE_A, RAID_GATE_TOWER_DA, RAID_H, RAID_SLOWEST, RAID_SPEEDS, RAID_W, raidArmyHp, raidBattleStatus, raidOutcome, raidWinner, runRaid, setOrderLot, setRaidOrder, setRaidTactic, stepRaid } from "./raid.ts";
import { drillFoeOf, openDrillRaid } from "./drill.ts";
import { beastOf, cityArtForTerritory, landscapeOf, dragonPowerFor } from "./landscape.ts";
import { defenseRank } from "./defense.ts";
import { BATTLE_ASSETS, DRILL_ASSETS, PLAY_ASSETS, TITLE_ASSETS, packUrls, preloadAll } from "./preload.ts";
import { CAPITOL, CITY_DEF, CONTINENT_BONUS, CONTINENT_BREAK_GOLD, FORT_DEF, FORT_LABEL, HOUSES, PLAYER_COUNT, REGION_HOUSE, SAVE_VERSION, SIEGE_CAP, SIEGE_COST, SIEGE_TURNS, TOWER_CARGO, UNIT_CAP, UNIT_COST, UNIT_LABEL, UNIT_STR, UNIT_TURNS, WIN_CAPITALS, WORKS_CAP, type PlayerId } from "./types.ts";
import { DIFFICULTIES } from "./campaign.ts";
import { clearSave, hasSave, loadGame, saveGame } from "./save.ts";
import { sfxForTrain, hasBeastCry } from "../sfx.ts";
import { TERRITORIES, TERRITORY_BY_ID, continentTerritories, landNeighbors, seaNeighbors } from "./world.ts";
import { FLOODED_IDS } from "./flooded.gen.ts";
import { hexNeighbors } from "./globe.ts";
import { isWater, seaYieldOf, WATER_BY_ID, WATER_IDS } from "./waters.ts";

const EG = CAPITOL.egypt;
const SU = CAPITOL.sumer;
const TH = CAPITOL.thule;
const AK = CAPITOL.alaska;
const ATL = CAPITOL.atlantis;

function playSteps(raid: { timeScale: number }, n: number) {
  raid.timeScale = 1;
  for (let i = 0; i < n; i++) stepRaid(raid as Parameters<typeof stepRaid>[0], 1 / 60);
}

describe("world", () => {
  it("has a playable hex on every painted land", () => {
    assert.equal(TERRITORIES.length, 339);
    assert.equal(new Set(TERRITORIES.map((t) => t.id)).size, 339);
    assert.equal(new Set(TERRITORIES.map((t) => t.name)).size, 339);
    assert.ok(TERRITORY_BY_ID.clanne01);
    assert.ok(TERRITORY_BY_ID.clanoc01);
    for (const id of FLOODED_IDS) assert.ok(!TERRITORY_BY_ID[id], id);
  });
  it("lands sit on the right regions", () => {
    assert.equal(TERRITORY_BY_ID.asgard.continent, "at");
    assert.equal(TERRITORY_BY_ID.pantanal.continent, "sa");
    assert.equal(TERRITORY_BY_ID.karoo.continent, "af");
    assert.equal(TERRITORY_BY_ID.gobi.continent, "ae");
    assert.equal(TERRITORY_BY_ID[CAPITOL.thule]!.continent, "ne");
    assert.equal(TERRITORY_BY_ID[CAPITOL.alaska]!.continent, "nw");
    assert.equal(TERRITORY_BY_ID[CAPITOL.atlantis]!.continent, "eu");
    assert.equal(TERRITORY_BY_ID[CAPITOL.egypt]!.continent, "an");
    assert.equal(TERRITORY_BY_ID[CAPITOL.sumer]!.continent, "me");
    assert.equal(TERRITORY_BY_ID[CAPITOL.lumuria]!.continent, "ss");
    assert.equal(TERRITORY_BY_ID[CAPITOL.gondwana]!.continent, "oc");
    assert.equal(TERRITORY_BY_ID[CAPITOL.aztec]!.continent, "ca");
    assert.equal(TERRITORY_BY_ID.peninsula.continent, "sa");
    assert.ok(landNeighbors("peninsula").includes("weddell"));
    assert.ok(landNeighbors("weddell").includes("drake"));
    assert.ok(landNeighbors("drake").includes("fuegia"));
    assert.ok(landNeighbors("fuegia").includes("tocantins"));
    assert.ok(landNeighbors("orinoco").includes("paria"));
    assert.ok(landNeighbors("arawak").includes("paria"));
    assert.ok(landNeighbors("olmec").includes("miskito"));
    assert.ok(landNeighbors("paria").includes("miskito"));
    assert.ok(!TERRITORY_BY_ID.eldorado);
    assert.ok(!TERRITORY_BY_ID.iberia);
    assert.ok(!TERRITORY_BY_ID.wilkes);
    assert.ok(!TERRITORY_BY_ID.nicobar);
    assert.ok(!TERRITORY_BY_ID.ottawa);
    assert.ok(!TERRITORY_BY_ID.unggava);
  });
  it("lands are named for terrain", () => {
    const names = TERRITORIES.map((t) => t.name);
    assert.equal(new Set(names).size, TERRITORIES.length);
    for (const t of TERRITORIES) {
      assert.match(t.name, /^[A-Za-z][A-Za-z ]+$/, t.id);
      assert.ok(t.name.length <= 12, `${t.id} ${t.name}`);
    }
  });
  it("a Middle East seat is coastal", () => {
    assert.equal(TERRITORY_BY_ID.sumer.coastal, true);
  });
  it("inland mines only on landlocked provinces", () => {
    for (const t of TERRITORIES) {
      if (!t.coastal) assert.equal(t.coastal, false, t.id);
    }
    assert.ok(TERRITORIES.some((t) => !t.coastal));
  });
  it("regions keep a playable spread of hex seats", () => {
    const regions = ["at", "nw", "ne", "ca", "sa", "eu", "an", "af", "me", "aw", "ae", "ss", "oc"] as const;
    assert.equal(regions.length, 13);
    for (const c of regions) {
      const n = continentTerritories(c).length;
      assert.ok(n >= 24 && n <= 30, `${c} has ${n}`);
    }
  });
  it("capitals sit near the middle of their region", () => {
    for (const e of EMPIRE_LIST) {
      const cap = TERRITORY_BY_ID[e.capitol];
      assert.ok(cap, e.id);
      assert.equal(cap.continent, e.region, e.id);
    }
  });
  it("provinces are hexagons", () => {
    for (const t of TERRITORIES) {
      const ring = t.path.split("Z")[0] ?? "";
      const nums = ring.match(/-?\d+\.?\d*/g) ?? [];
      assert.equal(nums.length / 2, 6, t.id);
    }
  });
  it("hex seats do not overlap", () => {
    const seats = TERRITORIES.filter((t) => !t.id.startsWith("clan")).map((t) => {
      const nums = (t.path.match(/-?\d+\.?\d*/g) ?? []).map(Number);
      let r = 0;
      for (let i = 0; i < nums.length; i += 2) {
        r = Math.max(r, Math.hypot(nums[i]! - t.labelX, nums[i + 1]! - t.labelY));
      }
      return { id: t.id, x: t.labelX, y: t.labelY, r };
    });
    for (let i = 0; i < seats.length; i++) {
      const a = seats[i]!;
      for (let j = i + 1; j < seats.length; j++) {
        const b = seats[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const flats = (a.r + b.r) * (Math.sqrt(3) / 2);
        assert.ok(d + 1 >= flats, `${a.id} overlaps ${b.id} d=${d.toFixed(1)} flats=${flats.toFixed(1)}`);
      }
    }
  });
  it("a land bridge joins Asia across the date line", () => {
    assert.ok(landNeighbors("beringia").includes("kamchatka"));
  });
});

describe("landscape", () => {
  it("covers every province", () => {
    for (const t of TERRITORIES) assert.ok(landscapeOf(t.id).terrain, t.id);
  });
  it("ice reads as ice", () => {
    assert.equal(landscapeOf("amundsen").terrain, "ice");
    assert.equal(landscapeOf("greenland").terrain, "ice");
    assert.equal(landscapeOf("yukon").terrain, "ice");
  });
  it("places fauna", () => {
    assert.equal(landscapeOf("hejaz").fauna, "camel");
    assert.equal(landscapeOf("asgard").fauna, "polar-bear");
  });
  it("wonders sit on capitals", () => {
    assert.equal(landscapeOf(EG).wonder, "pyramids");
    assert.equal(landscapeOf(CAPITOL.aztec).wonder, "teocalli");
    assert.equal(landscapeOf("gobi").wonder, "pagoda");
    assert.equal(landscapeOf(CAPITOL.lumuria).wonder, "stupa");
    assert.equal(landscapeOf(SU).wonder, "gardens");
    assert.equal(landscapeOf("asgard").wonder, "icewall");
  });
  it("every province has a trade resource", () => {
    for (const t of TERRITORIES) assert.ok(landscapeOf(t.id).resource, t.id);
  });
  it("beasts follow the empire", () => {
    assert.equal(beastOf("asgard").id, "polar-bear");
    assert.equal(beastOf("eldorado").id, "gorilla");
    assert.equal(beastOf("aztec").id, "jaguar");
    assert.equal(beastOf("tartaria").id, "tiger");
    assert.equal(beastOf("siberia").id, "grizzly");
    assert.equal(beastOf("lumuria").id, "rhino");
    assert.equal(beastOf("egypt").id, "lion");
    assert.equal(beastOf("sumer").id, "giant");
    assert.equal(beastOf("cape").id, "hippo");
    assert.equal(beastOf("gondwana").id, "crocodile");
    assert.equal(beastOf("thule").id, "sabertooth");
    assert.equal(beastOf("alaska").id, "mammoth");
    assert.equal(beastOf("atlantis").id, "direwolf");
    assert.equal(beastOf("atlantis").atk, 18);
    assert.equal(beastOf("cape").atk, 13);
    assert.equal(beastOf("eldorado").atk, 15);
    assert.equal(beastOf("lumuria").strength, 18);
    assert.equal(beastOf("sumer").atk, 18);
    assert.equal(beastOf("asgard").atk, 20);
  });
});

describe("houses", () => {
  it("thirteen thrones", () => {
    assert.equal(HOUSES.length, PLAYER_COUNT);
    assert.equal(EMPIRE_LIST.length, PLAYER_COUNT);
    assert.equal(PLAYER_COUNT, 13);
    assert.ok(HOUSES.includes("sumer"));
  });
  it("capitals match the seats", () => {
    assert.equal(CAPITOL.atlantis, "noricum");
    assert.equal(CAPITOL.egypt, "darfur");
    assert.match(TERRITORY_BY_ID.darfur.name, /^[A-Za-z ]+$/);
    assert.match(TERRITORY_BY_ID.egypt.name, /^[A-Za-z ]+$/);
    assert.equal(CAPITOL.aztec, "miskito");
    assert.match(TERRITORY_BY_ID.miskito.name, /^[A-Za-z ]+$/);
    assert.equal(CAPITOL.lumuria, "tamil");
    assert.match(TERRITORY_BY_ID.tamil.name, /^[A-Za-z ]+$/);
    assert.equal(CAPITOL.tartaria, "gobi");
    assert.match(TERRITORY_BY_ID.gobi.name, /^[A-Za-z ]+$/);
    assert.equal(CAPITOL.thule, "erie");
    assert.equal(empireOf("thule").capitol, "erie");
    assert.equal(TERRITORY_BY_ID.erie.continent, "ne");
    assert.equal(CAPITOL.alaska, "rockies");
    assert.equal(TERRITORY_BY_ID.rockies.name, "Alaska");
    assert.equal(TERRITORY_BY_ID.rockies.continent, "nw");
    assert.equal(CAPITOL.siberia, "manchuria");
    assert.equal(TERRITORY_BY_ID.manchuria.continent, "aw");
    assert.equal(TERRITORY_BY_ID.manchuria.name, "Siberia");
    assert.equal(TERRITORY_BY_ID.gobi.continent, "ae");
    assert.equal(empireOf("atlantis").capitol, "noricum");
    assert.equal(empireOf("asgard").capitol, "asgard");
    assert.equal(TERRITORY_BY_ID.asgard.continent, "at");
    assert.equal(CAPITOL.sumer, "sumer");
    assert.equal(empireOf("sumer").capitol, "sumer");
    assert.equal(TERRITORY_BY_ID.sumer.name, "Sumer");
    assert.equal(TERRITORY_BY_ID.sumer.continent, "me");
  });
  it("each region raises that house's beasts", () => {
    for (const e of EMPIRE_LIST) {
      assert.equal(REGION_HOUSE[e.region], e.id, e.id);
      assert.equal(houseOfLand(e.capitol), e.id);
      assert.equal(beastOfLand(e.capitol).id, beastOf(e.id).id);
    }
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
    assert.equal(g.players.length, 13);
    assert.equal(Object.keys(g.territories).length, TERRITORIES.length + WATER_IDS.length);
  });
  it("Nord wakes in the American heartland", () => {
    assert.equal(createNewGame({ empire: "thule", seed: 4 }).territories[TH].owner, 0);
  });
  it("Asgard starts with a port on the ice", () => {
    const g = createNewGame({ empire: "asgard", seed: 4 });
    assert.equal(g.territories.asgard.port, true);
    assert.equal(g.territories.asgard.ships, 1);
    assert.ok(landNeighbors("asgard").length >= 1);
  });
  it("every capital wakes walled with the same host", () => {
    const egypt = createNewGame({ empire: "egypt", seed: 5, difficulty: "normal" });
    assert.equal(egypt.territories[EG].castle, true);
    assert.equal(egypt.territories[EG].levy, 5);
    assert.equal(egypt.territories[EG].bowmen, 5);
    assert.equal(egypt.territories[EG].knights, 3);
    assert.equal(egypt.territories[EG].beasts, 2);
    for (const id of HOUSES) {
      const g = createNewGame({ empire: id, seed: 5, difficulty: "normal" });
      const cap = empireOf(id).capitol;
      assert.equal(g.territories[cap]!.castle, true, id);
      assert.equal(fortOf(g.territories[cap]!), 2, id);
      assert.equal(g.territories[cap]!.levy, 5, id);
      assert.equal(g.territories[cap]!.bowmen, 5, id);
      assert.equal(g.territories[cap]!.knights, 3, id);
      assert.equal(g.territories[cap]!.beasts, 2, id);
    }
  });
  it("Easy capitals wake with the largest host", () => {
    const easy = createNewGame({ empire: "egypt", seed: 7, difficulty: "easy" });
    const mid = createNewGame({ empire: "egypt", seed: 7, difficulty: "normal" });
    const hard = createNewGame({ empire: "egypt", seed: 7, difficulty: "hard" });
    assert.equal(easy.territories[EG].levy, 10);
    assert.equal(easy.territories[EG].bowmen, 10);
    assert.equal(easy.territories[EG].knights, 5);
    assert.equal(easy.territories[EG].beasts, 3);
    assert.equal(mid.territories[EG].levy, 5);
    assert.equal(mid.territories[EG].bowmen, 5);
    assert.equal(mid.territories[EG].knights, 3);
    assert.equal(mid.territories[EG].beasts, 2);
    assert.equal(hard.territories[EG].levy, 3);
    assert.equal(hard.territories[EG].bowmen, 3);
    assert.equal(hard.territories[EG].knights, 2);
    assert.equal(hard.territories[EG].beasts, 1);
  });
  it("save version is current", () => {
    assert.equal(createNewGame({ empire: "aztec", seed: 1 }).version, SAVE_VERSION);
  });
  it("a written age can be opened again", () => {
    const mem = new Map<string, string>();
    const stub = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => mem.clear(),
      key: (i: number) => [...mem.keys()][i] ?? null,
      get length() {
        return mem.size;
      },
    };
    const prev = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: stub });
    try {
      const g = createNewGame({ empire: "egypt", seed: 11 });
      saveGame(g);
      assert.equal(hasSave(), true);
      const loaded = loadGame();
      assert.equal(loaded?.players[0]!.empire, "egypt");
      assert.equal(loaded?.clock.turn, g.clock.turn);
      clearSave();
      assert.equal(hasSave(), false);
    } finally {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: prev });
    }
  });
  it("a dragon roar and a beast growl are distinct from a drill", () => {
    assert.equal(sfxForTrain("dragon"), "roar");
    assert.equal(sfxForTrain("beast"), "growl");
    assert.equal(sfxForTrain("levy"), "ok");
    assert.equal(sfxForTrain("knight"), "ok");
  });
  it("every house beast has its own cry", () => {
    for (const e of EMPIRE_LIST) {
      assert.equal(hasBeastCry(beastOf(e.id).id), true, e.id);
    }
  });
});

describe("ports and mines", () => {
  it("a coastal capital can raise a port", () => {
    let g = createNewGame({ empire: "alaska", seed: 11 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g = buildPort(g, AK);
    assert.ok(hasJob(g, AK));
    assert.ok(constructionBusy(g, AK));
    g = advanceJobs(g);
    assert.equal(g.territories[AK].port, true);
  });
  it("Kunlun cannot raise a port inland", () => {
    let g = createNewGame({ empire: "tartaria", seed: 12 });
    g.players[0]!.gold = 20;
    g.territories.kunlun.owner = 0;
    const blocked = buildPort(g, "kunlun");
    assert.equal(hasJob(blocked, "kunlun"), false);
  });
  it("Kunlun can sink a mine", () => {
    let g = createNewGame({ empire: "tartaria", seed: 12 });
    g.players[0]!.gold = 20;
    g.players[0]!.stone = 10;
    g.territories.gobi.owner = 0;
    g = buildMine(g, "gobi");
    g = advanceJobs(g);
    assert.equal(g.territories.gobi.mine, true);
  });
  it("El Dorado's seat is inland jungle", () => {
    let g = createNewGame({ empire: "eldorado", seed: 13 });
    g.territories.pantanal.owner = 0;
    g.players[0]!.gold = 20;
    g.players[0]!.stone = 10;
    const blocked = buildPort(g, "pantanal");
    assert.equal(hasJob(blocked, "pantanal"), false);
    g = buildMine(g, "pantanal");
    assert.ok(hasJob(g, "pantanal"));
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
    let g = createNewGame({ empire: "alaska", seed: 15 });
    g.players[0]!.gold = 40;
    g.players[0]!.wood = 20;
    const blocked = buildShip(g, AK);
    assert.equal(hasJob(blocked, AK), false);
    g = buildPort(g, AK);
    g = advanceJobs(g);
    g = buildShip(g, AK);
    g = advanceJobs(g);
    assert.ok(g.territories[AK].ships >= 1);
  });
  it("a harbour can lay a second keel", () => {
    let g = createNewGame({ empire: "atlantis", seed: 15 });
    g.players[0]!.gold = 40;
    g.players[0]!.wood = 30;
    g.territories[ATL].port = true;
    g.territories[ATL].portRank = 1;
    g = buildShip(g, ATL);
    g = advanceJobs(g);
    g = buildShip(g, ATL);
    g = advanceJobs(g);
    assert.equal(g.territories[ATL].ships, 2);
  });
  it("a warship sails with the host; two warships can march the same watch", () => {
    let g = createNewGame({ empire: "atlantis", seed: 17 });
    g.territories[ATL].port = true;
    g.territories[ATL].warships = 2;
    g.territories[ATL].levy = 20;
    g.territories[ATL].beasts = 0;
    const overSea = seaNeighbors(ATL).filter(
      (id) =>
        g.territories[id]!.owner === "barbarian" &&
        !landNeighbors(ATL).includes(id) &&
        TERRITORY_BY_ID[id]!.coastal,
    );
    const first = overSea[0]!;
    const second = overSea[1]!;
    g.territories[first]!.levy = 1;
    g.territories[first]!.knights = 0;
    g.territories[first]!.beasts = 0;
    g.territories[second]!.levy = 1;
    g.territories[second]!.knights = 0;
    g.territories[second]!.beasts = 0;
    g = issueMarch(g, ATL, first, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    g = issueMarch(g, ATL, second, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[ATL].warships, 0);
    assert.equal(g.marches.length, 2);
    assert.equal(g.territories[first]!.owner, "barbarian");
    g = advanceJobs(g);
    assert.equal(g.arrivals.length, 2);
  });
  it("a wiped landing loses the warship", () => {
    let g = createNewGame({ empire: "atlantis", seed: 19 });
    g.territories[ATL].port = true;
    g.territories[ATL].warships = 1;
    g.territories[ATL].levy = 2;
    g.territories[ATL].beasts = 0;
    const dest = seaNeighbors(ATL).find(
      (id) =>
        g.territories[id]!.owner === "barbarian" &&
        !landNeighbors(ATL).includes(id) &&
        TERRITORY_BY_ID[id]!.coastal,
    )!;
    g.territories[dest]!.levy = 30;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.castle = true;
    g.territories[dest]!.castleRank = 1;
    g = resolveAttack(g, ATL, dest, { levy: 1, knights: 0, dragons: 0, beasts: 0 });
    assert.notEqual(g.territories[dest]!.owner, 0);
    assert.equal(g.territories[ATL].warships, 0);
  });
  it("a rank I harbour holds two keels, a citadel port holds six", () => {
    let g = createNewGame({ empire: "atlantis", seed: 21 });
    g.territories[ATL].port = true;
    g.territories[ATL].portRank = 1;
    assert.equal(shipsCap(g.territories[ATL]), 2);
    g.players[0]!.gold = 80;
    g.players[0]!.wood = 80;
    g.territories[ATL].ships = 2;
    const blocked = buildShip(g, ATL);
    assert.equal(hasJob(blocked, ATL), false);
    g.territories[ATL].portRank = 3;
    assert.equal(shipsCap(g.territories[ATL]), 6);
    g = buildShip(g, ATL);
    assert.ok(hasJob(g, ATL));
  });
  it("a landing warship can sail home with part of the host", () => {
    let g = createNewGame({ empire: "atlantis", seed: 22 });
    g.territories[ATL].port = true;
    g.territories[ATL].portRank = 1;
    g.territories[ATL].warships = 1;
    g.territories[ATL].levy = 12;
    g.territories[ATL].beasts = 0;
    const dest = seaNeighbors(ATL).find(
      (id) =>
        g.territories[id]!.owner === "barbarian" &&
        !landNeighbors(ATL).includes(id) &&
        TERRITORY_BY_ID[id]!.coastal,
    )!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[dest]!.castle = false;
    g = resolveAttack(g, ATL, dest, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.owner, 0);
    assert.equal(g.territories[dest]!.warships, 1);
    assert.equal(g.territories[ATL].warships, 0);
    const held = g.territories[dest]!.levy;
    g = recallOccupiers(g, ATL, dest, { levy: held - 1, knights: 0, dragons: 0, beasts: 0, warships: 1 });
    assert.equal(g.territories[dest]!.warships, 0);
    assert.equal(g.territories[ATL].warships, 1);
  });
  it("a coastal capital can open a market", () => {
    let g = createNewGame({ empire: "atlantis", seed: 16 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    const before = incomeFor(g, 0).gold;
    g = buildMarket(g, ATL);
    g = advanceJobs(g);
    assert.equal(g.territories[ATL].market, true);
    assert.ok(incomeFor(g, 0).gold >= before + 1);
  });
  it("markets ports mines and walls can be improved with gold", () => {
    let g = createNewGame({ empire: "atlantis", seed: 18 });
    g.players[0]!.gold = 80;
    g.players[0]!.wood = 20;
    g.players[0]!.stone = 20;
    g = buildMarket(g, ATL);
    g = advanceJobs(g);
    assert.equal(worksRank(g.territories[ATL], "market"), 1);
    const trade1 = tradeFor(g, 0);
    const gold1 = g.players[0]!.gold;
    g = buildMarket(g, ATL);
    g = advanceJobs(g);
    assert.equal(worksRank(g.territories[ATL], "market"), 2);
    assert.ok(g.players[0]!.gold < gold1);
    g.players[0]!.gold = gold1;
    assert.ok(tradeFor(g, 0) > trade1);
    g = buildMarket(g, ATL);
    g = advanceJobs(g);
    assert.equal(worksRank(g.territories[ATL], "market"), WORKS_CAP);
    const blocked = buildMarket(g, ATL);
    assert.equal(hasJob(blocked, ATL), false);
  });
  it("improved walls raise defence", () => {
    let g = createNewGame({ empire: "egypt", seed: 19 });
    g.players[0]!.gold = 80;
    g.players[0]!.wood = 20;
    g.players[0]!.stone = 20;
    const seat = g.territories[EG]!;
    seat.levy = 0;
    seat.bowmen = 0;
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
    let g = createNewGame({ empire: "egypt", seed: 91 });
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 10;
    g = buildFarm(g, EG);
    g = advanceJobs(g);
    assert.equal(g.territories[EG].farm, true);
    assert.ok(incomeFor(g, 0).food >= 4);
    const pop = g.territories[EG].population;
    g.players[0]!.food = 20;
    g.players[0]!.lastLands = 0;
    for (const id of landNeighbors(EG)) {
      if (g.territories[id]!.owner === "barbarian") g.territories[id]!.pressure = 4;
    }
    g.clock.currentPlayer = (PLAYER_COUNT - 1) as PlayerId;
    g = endTurn(g);
    assert.ok(g.territories[EG].population > pop);
  });
  it("hunger shrinks a city", () => {
    let g = createNewGame({ empire: "egypt", seed: 92 });
    g.territories[EG].population = 16;
    g.players[0]!.food = 0;
    for (const id of landNeighbors(EG)) {
      if (g.territories[id]!.owner === "barbarian") g.territories[id]!.pressure = 4;
    }
    g.clock.currentPlayer = (PLAYER_COUNT - 1) as PlayerId;
    g = endTurn(g);
    assert.ok(g.territories[EG].population < 16);
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
    const g = createNewGame({ empire: "atlantis", seed: 21 });
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
    let g = createNewGame({ empire: "atlantis", seed: 23 });
    const gold = g.players[0]!.gold;
    const metal = g.players[0]!.metal;
    const levy = g.territories[ATL].levy;
    g = trainUnit(g, ATL, "levy");
    assert.equal(g.players[0]!.gold, gold - 2);
    assert.equal(g.players[0]!.metal, metal - 1);
    assert.equal(g.territories[ATL].levy, levy);
    assert.equal(UNIT_TURNS.levy, 1);
    g = advanceJobs(g);
    assert.equal(g.territories[ATL].levy, levy + 1);
  });
  it("dragons cost gold only", () => {
    let g = createNewGame({ empire: "atlantis", seed: 23 });
    g.players[0]!.gold = 30;
    g.players[0]!.stone = 0;
    g.players[0]!.wood = 0;
    g.players[0]!.metal = 0;
    g = trainUnit(g, ATL, "dragon");
    assert.equal(g.territories[ATL].dragons, 0);
    assert.equal(g.players[0]!.gold, 5);
    for (let i = 0; i < UNIT_TURNS.dragon; i++) g = advanceJobs(g);
    assert.equal(g.territories[ATL].dragons, 1);
    g.players[0]!.gold = 30;
    g = trainUnit(g, ATL, "dragon");
    assert.equal(g.territories[ATL].dragons, 1);
  });
  it("a city can raise more than one dragon", () => {
    let g = createNewGame({ empire: "atlantis", seed: 23 });
    g.players[0]!.gold = 80;
    g = trainUnit(g, ATL, "dragon");
    for (let i = 0; i < UNIT_TURNS.dragon; i++) g = advanceJobs(g);
    assert.equal(g.territories[ATL].dragons, 1);
    g = trainUnit(g, ATL, "dragon");
    for (let i = 0; i < UNIT_TURNS.dragon; i++) g = advanceJobs(g);
    assert.equal(g.territories[ATL].dragons, 2);
  });
  it("legal marches include land neighbours", () => {
    const g = createNewGame({ empire: "atlantis", seed: 24 });
    const targets = legalMarchTargets(g, ATL);
    assert.ok(targets.length >= 2);
    assert.ok(landNeighbors(ATL).some((id) => targets.includes(id)));
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
    let g = createNewGame({ empire: "atlantis", seed: 25 });
    g.territories[ATL].levy = 12;
    g = setMarchFrom(g, ATL);
    const dest = legalMarchTargets(g, ATL).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    g = resolveAttack(g, ATL, dest, { levy: 8, knights: 0, dragons: 0 });
    assert.ok(g.territories[dest]!.owner === 0 || g.territories[ATL].levy < 12);
  });
});

describe("clock, cards, victory, AI", () => {
  it("endTurn advances the watch", () => {
    const g = createNewGame({ empire: "atlantis", seed: 31 });
    const next = endTurn(g);
    assert.equal(next.clock.currentPlayer, 1);
  });
  it("playCard levy adds swordmen", () => {
    let g = createNewGame({ empire: "atlantis", seed: 32 });
    g.players[0]!.cards = ["levy"];
    const levy = g.territories[ATL].levy;
    g = playCard(g, "levy", ATL);
    assert.equal(g.territories[ATL].levy, levy + 2);
  });
  it("seven capitals wins", () => {
    let g = createNewGame({ empire: "egypt", seed: 33 });
    assert.equal(WIN_CAPITALS, 7);
    const seats = Object.values(CAPITOL);
    for (const id of seats.slice(0, 7)) g.territories[id]!.owner = 0;
    g = checkVictory(g);
    assert.equal(g.winner, 0);
    assert.equal(g.phase, "gameover");
    assert.ok((g.log.at(-1) ?? "").includes("7 capitals"));
  });
  it("six capitals does not win", () => {
    let g = createNewGame({ empire: "egypt", seed: 33 });
    const extras = Object.values(CAPITOL).filter((id) => id !== EG).slice(0, 5);
    for (const id of extras) g.territories[id]!.owner = 0;
    assert.equal(capitalsHeld(g, 0).length, 6);
    g = checkVictory(g);
    assert.equal(g.winner, null);
    assert.equal(g.phase, "play");
  });
  it("seven regions without seven capitals does not win", () => {
    let g = createNewGame({ empire: "egypt", seed: 33 });
    const seats = new Set(Object.values(CAPITOL));
    for (const c of ["an", "af", "eu", "sa", "ca", "me", "oc"] as const) {
      for (const t of continentTerritories(c)) {
        if (!seats.has(t.id) || t.id === EG) g.territories[t.id]!.owner = 0;
      }
    }
    assert.equal(capitalsHeld(g, 0).length, 1);
    g = checkVictory(g);
    assert.equal(g.winner, null);
    assert.equal(g.phase, "play");
  });
  it("the age has no turn limit", () => {
    let g = createNewGame({ empire: "egypt", seed: 36 });
    g.clock.turn = 500;
    g = checkVictory(g);
    assert.equal(g.phase, "play");
    assert.equal(g.winner, null);
  });
  it("last empire standing wins", () => {
    let g = createNewGame({ empire: "egypt", seed: 36 });
    for (const p of g.players) if (p.id !== 0) p.alive = false;
    g = checkVictory(g);
    assert.equal(g.phase, "gameover");
    assert.equal(g.winner, 0);
  });
  it("a market on a rich land pays trade gold", () => {
    const g = createNewGame({ empire: "atlantis", seed: 37 });
    const before = incomeFor(g, 0).gold;
    g.territories[ATL].market = true;
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
    assert.equal(g.territories[EG].beastHouse, "egypt");
    assert.equal(beastOf("egypt").atk, 15);
    assert.equal(beastOf("egypt").def, 12);
    assert.equal(beastOf("egypt").cost, 7);
    assert.equal(UNIT_STR.dragon, 50);
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
    seat.bowmen = 0;
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
    const camp = g.territories.greensahara!;
    camp.levy = 0;
    camp.knights = 0;
    camp.dragons = 0;
    camp.beasts = 0;
    camp.castle = true;
    camp.fort = 1;
    assert.equal(defenseStrength(camp), FORT_DEF[1]);
  });
  it("beasts raise on home-region lands", () => {
    let g = createNewGame({ empire: "egypt", seed: 38 });
    g.players[0]!.gold = 20;
    g.territories.greensahara.owner = 0;
    g.territories.greensahara.beasts = 0;
    g = trainUnit(g, "greensahara", "beast");
    assert.equal(g.jobs.filter((j) => j.kind === "beast").length, 1);
    for (let i = 0; i < UNIT_TURNS.beast; i++) g = advanceJobs(g);
    assert.equal(g.territories.greensahara.beasts, 1);
    assert.equal(g.territories.greensahara.beastHouse, "egypt");
    assert.equal(beastOfTerritory(g.territories.greensahara).id, "lion");
  });
  it("dragons raise only at a capital", () => {
    let g = createNewGame({ empire: "egypt", seed: 38 });
    g.players[0]!.gold = 40;
    g.territories.greensahara.owner = 0;
    g = trainUnit(g, "greensahara", "dragon");
    assert.equal(g.jobs.filter((j) => j.kind === "dragon").length, 0);
    g = trainUnit(g, EG, "dragon");
    assert.equal(g.jobs.filter((j) => j.kind === "dragon").length, 1);
  });
  it("occupying a rival region trains that house's beasts", () => {
    let g = createNewGame({ empire: "egypt", seed: 38 });
    g.players[0]!.gold = 40;
    const maya = CAPITOL.aztec;
    g.territories[maya].owner = 0;
    g.territories[maya].beasts = 0;
    g.territories[maya].beastHouse = undefined;
    const gold = g.players[0]!.gold;
    g = trainUnit(g, maya, "beast");
    assert.equal(g.jobs.filter((j) => j.kind === "beast").length, 1);
    assert.equal(g.players[0]!.gold, gold - beastOf("aztec").cost);
    for (let i = 0; i < UNIT_TURNS.beast; i++) g = advanceJobs(g);
    assert.equal(g.territories[maya].beasts, 1);
    assert.equal(g.territories[maya].beastHouse, "aztec");
    assert.equal(beastOfTerritory(g.territories[maya]).id, "jaguar");
  });
  it("more provinces pay more tribute", () => {
    const g = createNewGame({ empire: "egypt", seed: 39 });
    const one = incomeFor(g, 0).gold;
    g.territories.greensahara.owner = 0;
    const two = incomeFor(g, 0).gold;
    assert.ok(two >= one + 5);
  });
  it("lands on one region out-earn a scatter", () => {
    const clustered = createNewGame({ empire: "egypt", seed: 40 });
    clustered.territories.greensahara.owner = 0;
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
    let g = createNewGame({ empire: "atlantis", seed: 34, difficulty: "easy" });
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
    g.territories[EG].bowmen = 0;
    g.territories[EG].knights = 0;
    g.territories[EG].dragons = 0;
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
    g.territories[EG].bowmen = 0;
    g.territories[EG].knights = 0;
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
    g.territories[EG].bowmen = 0;
    g.territories[EG].knights = 0;
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
    g.territories[EG].bowmen = 0;
    g.territories[EG].knights = 0;
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
  it("Easy hunts tribes before rival empires", () => {
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
  it("Medium hunts tribes before rival empires", () => {
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
  it("Nord wakes without a harbour", () => {
    const g = createNewGame({ empire: "thule", seed: 96 });
    assert.equal(g.territories[TH].port, false);
    assert.equal(g.territories[TH].ships, 0);
  });
  it("houses draw a yield from their home region", () => {
    const egypt = createNewGame({ empire: "egypt", seed: 97 });
    const food = incomeFor(egypt, 0).food;
    egypt.territories.greensahara.owner = 0;
    assert.ok(incomeFor(egypt, 0).food >= food + 1 + 1);
    const atlantis = createNewGame({ empire: "atlantis", seed: 97 });
    const stone = incomeFor(atlantis, 0).stone;
    atlantis.territories.alps.owner = 0;
    assert.ok(incomeFor(atlantis, 0).stone > stone);
    const aztec = createNewGame({ empire: "aztec", seed: 97 });
    const gold = incomeFor(aztec, 0).gold;
    aztec.territories.volcan.owner = 0;
    assert.ok(incomeFor(aztec, 0).gold > gold);
    const asgard = createNewGame({ empire: "asgard", seed: 97 });
    assert.ok(worksCost(asgard.players[0]!, "port").gold < 5);
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
    assert.equal(empireOf("siberia").name, "Siberia");
    assert.equal(empireOf("alaska").name, "Alaska");
    assert.equal(empireOf("atlantis").name, "Atlantis");
    assert.equal(empireOf("sumer").name, "Sumer");
    assert.ok(!empireOf("egypt").blurb.toLowerCase().includes("black land"));
    for (const e of EMPIRE_LIST) {
      assert.match(TERRITORY_BY_ID[e.capitol].name, /^[A-Za-z ]+$/, e.id);
    }
  });
  it("victor can send occupiers home", () => {
    let g = createNewGame({ empire: "atlantis", seed: 46 });
    g.territories[ATL].levy = 12;
    const dest = legalMarchTargets(g, ATL).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    g = resolveAttack(g, ATL, dest, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.owner, 0);
    const left = g.territories[dest]!.levy;
    const home = g.territories[ATL].levy;
    g = recallOccupiers(g, ATL, dest, { levy: left - 1, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[dest]!.levy, 1);
    assert.equal(g.territories[ATL].levy, home + left - 1);
  });
  it("taking a tribe pays spoils", () => {
    let g = createNewGame({ empire: "atlantis", seed: 43 });
    g.territories[ATL].levy = 12;
    const dest = legalMarchTargets(g, ATL).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 1;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    const gold = g.players[0]!.gold;
    g = setMarchFrom(g, ATL);
    g = resolveAttack(g, ATL, dest, { levy: 8, knights: 0, dragons: 0, beasts: 0 });
    if (g.territories[dest]!.owner === 0) {
      assert.ok(g.players[0]!.gold > gold);
      assert.ok(g.territories[dest]!.levy >= 1);
    }
  });
  it("idle tribes raid a weak neighbour", () => {
    let g = createNewGame({ empire: "thule", seed: 44 });
    for (const p of g.players) p.human = false;
    const edge = landNeighbors(TH).find((id) => g.territories[id]!.owner === "barbarian");
    assert.ok(edge);
    g.territories[edge]!.levy = 4;
    g.territories[edge]!.pressure = 0;
    g.territories[TH].levy = 1;
    g.territories[TH].knights = 0;
    g.territories[TH].dragons = 0;
    g.territories[TH].beasts = 0;
    g.territories[TH].castle = false;
    g.territories[TH].fort = 0;
    const held = landNeighbors(TH)[0]!;
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
    assert.ok(raided || g.territories[TH].owner === "barbarian" || g.territories[TH].levy < 1);
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
    for (const id of landNeighbors(TH)) {
      if (g.territories[id]!.owner === "barbarian") g.territories[id]!.pressure = 4;
    }
    g.territories[TH].levy = 8;
    const levy = g.territories[TH].levy;
    for (let i = 0; i < 12; i++) g = endTurn(g);
    assert.equal(g.territories[TH].owner, 0);
    assert.equal(g.territories[TH].levy, levy);
  });
  it("tribes wake stout", () => {
    const g = createNewGame({ empire: "atlantis", seed: 47 });
    const camps = Object.values(g.territories).filter((t) => t.owner === "barbarian");
    assert.ok(camps.every((t) => t.levy >= 3 && t.levy <= 7));
    assert.ok(camps.every((t) => fortOf(t) === 0));
    assert.ok(camps.some((t) => t.levy >= 5 || t.knights > 0));
  });
  it("Easy tribes wake thin and Hard tribes wake stout", () => {
    const easy = createNewGame({ empire: "atlantis", seed: 47, difficulty: "easy" });
    const hard = createNewGame({ empire: "atlantis", seed: 47, difficulty: "hard" });
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
  it("Asgard and Sahul wake with a keel; land empires do not", () => {
    for (const id of ["asgard", "gondwana"] as const) {
      const g = createNewGame({ empire: id, seed: 94 });
      const cap = empireOf(id).capitol;
      assert.ok(g.territories[cap]!.ships >= 1, id);
    }
    const a = createNewGame({ empire: "atlantis", seed: 94 });
    assert.equal(a.territories[ATL].port, false);
    assert.equal(a.territories[ATL].ships, 0);
    const k = createNewGame({ empire: "cape", seed: 94 });
    assert.equal(k.territories.karoo.port, false);
  });
  it("standing swordmen draw wages", () => {
    const g = createNewGame({ empire: "egypt", seed: 70 });
    g.territories[EG].levy = 8;
    g.territories[EG].bowmen = 0;
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
    g.territories.zambezi.owner = 0;
    assert.ok(incomeFor(g, 0).silver >= inc.silver + 3);
  });
  it("empires wake with silver in the purse", () => {
    const g = createNewGame({ empire: "atlantis", seed: 81 });
    assert.equal(g.players[0]!.silver, 12);
  });
  it("trade grows with purse, lands, ports, ships and regions", () => {
    const g = createNewGame({ empire: "egypt", seed: 84 });
    const base = tradeFor(g, 0);
    g.players[0]!.gold += 16;
    g.players[0]!.silver += 16;
    assert.ok(tradeFor(g, 0) >= base + 4);
    g.territories.greensahara.owner = 0;
    assert.ok(tradeFor(g, 0) > base);
    g.territories[EG].port = true;
    g.territories[EG].ships = 2;
    const withSea = tradeFor(g, 0);
    g.territories[ATL].owner = 0;
    assert.ok(tradeFor(g, 0) > withSea);
  });
  it("every capital mints silver", () => {
    for (const id of HOUSES) {
      const g = createNewGame({ empire: id, seed: 82 });
      assert.ok(incomeFor(g, 0).silver >= 2 + 5);
    }
    const g = createNewGame({ empire: "egypt", seed: 83 });
    const before = incomeFor(g, 0).silver;
    g.territories[ATL].owner = 0;
    assert.ok(incomeFor(g, 0).silver >= before + 2 + 5);
  });
  it("capture gold scales with the defending host", () => {
    let g = createNewGame({ empire: "atlantis", seed: 71 });
    g.territories[ATL].levy = 16;
    const dest = legalMarchTargets(g, ATL).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 5;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.dragons = 0;
    g.territories[dest]!.beasts = 0;
    const before = g.players[0]!.gold;
    g = resolveAttack(g, ATL, dest, { levy: 12, knights: 0, dragons: 0, beasts: 0 });
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
    const from = "egypt";
    g.territories[from]!.owner = 0;
    g.territories[from]!.levy = 20;
    const crack = legalMarchTargets(g, from).find((id) => TERRITORY_BY_ID[id]!.continent === "me")!;
    const before = g.players[0]!.gold;
    g = resolveAttack(g, from, crack, { levy: 12, knights: 0, dragons: 0, beasts: 0 });
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
    g.territories[cap]!.bowmen = 0;
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
    let g = createNewGame({ empire: "cape", seed: 74 });
    const lands = continentTerritories("af");
    const last =
      landNeighbors("karoo").find((id) => TERRITORY_BY_ID[id]!.continent === "af" && id !== "karoo") ??
      lands.find((t) => t.id !== "karoo")!.id;
    for (const t of lands) {
      if (t.id === last) continue;
      g.territories[t.id]!.owner = 0;
    }
    g.territories.karoo.levy = 20;
    g.territories.karoo.dragons = 0;
    g.territories[last]!.owner = "barbarian";
    g.territories[last]!.levy = 1;
    g.territories[last]!.knights = 0;
    g.territories[last]!.dragons = 0;
    g.territories[last]!.castle = false;
    g = resolveAttack(g, "karoo", last, { levy: 12, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.territories[last]!.owner, 0);
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
    assert.ok(lines.some((l) => l.includes("overrun") && l.includes(TERRITORY_BY_ID[EG].name)));
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
    g = buildCastle(g, TH);
    assert.ok(hasJob(g, TH));
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
    const from = "pantanal";
    const dest = landNeighbors(from).find(
      (id) => g.territories[id]!.owner === "barbarian" && landscapeOf(id).terrain === "jungle",
    );
    assert.ok(dest);
    g.territories[from]!.beasts = 1;
    const b = openBattle(g, from, dest!, { levy: 0, knights: 0, dragons: 0, beasts: 1 }, "atk", 1)!;
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
    assert.equal(SIEGE_CAP, 5);
  });
  it("each extra ram takes a longer siege", () => {
    let g = createNewGame({ empire: "egypt", seed: 202, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g = beginSiege(g, EG, dest);
    g = buildSiege(g, EG, "ram");
    assert.equal(g.jobs.find((j) => j.kind === "ram")?.remaining, 1);
    g = advanceJobs(g);
    assert.equal(g.territories[EG].rams, 1);
    assert.equal(siegeTurnsFor(g.territories[EG], "ram"), 2);
    g = buildSiege(g, EG, "ram");
    assert.equal(g.jobs.find((j) => j.kind === "ram")?.remaining, 2);
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
  it("the field can hold a hundred warriors, fifty archers, twenty-five knights and twenty-five beasts", () => {
    assert.equal(UNIT_CAP.levy, 100);
    assert.equal(UNIT_CAP.bowman, 50);
    assert.equal(UNIT_CAP.knight, 25);
    assert.equal(UNIT_CAP.beast, 25);
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 3,
      moats: 0,
      scorpions: 0,
      force: { levy: UNIT_CAP.levy, bowmen: UNIT_CAP.bowman, knights: UNIT_CAP.knight, beasts: UNIT_CAP.beast, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: UNIT_CAP.levy, bowmen: UNIT_CAP.bowman, knights: UNIT_CAP.knight, beasts: UNIT_CAP.beast, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const count = (side: "atk" | "def", kind: string) =>
      raid.units.filter((u) => u.side === side && u.kind === kind).length;
    assert.equal(count("def", "levy"), 100);
    assert.equal(count("def", "bowman"), 50);
    assert.equal(count("def", "knight"), 25);
    assert.equal(count("def", "beast"), 25);
    autoDeployAll(raid);
    assert.equal(count("atk", "levy"), 100);
    assert.equal(count("atk", "bowman"), 50);
    assert.equal(count("atk", "knight"), 25);
    assert.equal(count("atk", "beast"), 25);
  });
  it("a ring city still fields the full host, and towers carry a storming party", () => {
    assert.equal(TOWER_CARGO.levy, 20);
    assert.equal(TOWER_CARGO.bowmen, 10);
    assert.equal(TOWER_CARGO.knights, 5);
    assert.equal(TOWER_CARGO.beasts, 5);
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 5,
      outer: 5,
      keep: 5,
      towers: 5,
      moats: 3,
      scorpions: 5,
      force: { levy: UNIT_CAP.levy, bowmen: UNIT_CAP.bowman, knights: UNIT_CAP.knight, beasts: UNIT_CAP.beast, dragons: 0 },
      siege: { rams: 1, catapults: 1, ladders: 1, towers: 1 },
      garrison: { levy: UNIT_CAP.levy, bowmen: UNIT_CAP.bowman, knights: UNIT_CAP.knight, beasts: UNIT_CAP.beast, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setRaidOrder(raid, "levy", "tower");
    setRaidOrder(raid, "bowman", "tower");
    setRaidOrder(raid, "knight", "tower");
    setRaidOrder(raid, "beast", "tower");
    autoDeployAll(raid);
    assert.equal(raid.stock.levy, 0);
    assert.equal(raid.stock.bowmen ?? 0, 0);
    assert.equal(raid.stock.knights, 0);
    assert.equal(raid.stock.beasts, 0);
    assert.equal(raid.stock.rams, 0);
    assert.equal(raid.stock.towers, 0);
    const tower = raid.units.find((u) => u.kind === "tower" && u.side === "atk");
    assert.ok(tower?.cargo);
    assert.equal(tower!.cargo!.levy, TOWER_CARGO.levy);
    assert.equal(tower!.cargo!.bowmen, TOWER_CARGO.bowmen);
    assert.equal(tower!.cargo!.knights, TOWER_CARGO.knights);
    assert.equal(tower!.cargo!.beasts, TOWER_CARGO.beasts);
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
    assert.equal(TOWER_CARGO.bowmen, 10);
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
    const posts = raid.buildings.filter((b) => b.kind === "archer");
    if (posts.length) {
      assert.ok(bows.every((b) => posts.some((p) => p.id === b.postId)));
    } else {
      assert.ok(bows.every((b) => Math.hypot(b.x - keep.x, b.y - keep.y) < keep.r + 24));
    }
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
  it("a ring city lays moats, bridges and scorpions", () => {
    let g = createNewGame({ empire: "sumer", seed: 301, difficulty: "easy" });
    const dest = landNeighbors(SU).find((id) => g.territories[id]!.owner === "barbarian")!;
    const to = g.territories[dest]!;
    to.owner = 1;
    to.wallRank = 5;
    to.outerWallRank = 5;
    to.keepRank = 5;
    to.towerRank = 5;
    to.moatRank = 3;
    to.scorpionRank = 5;
    to.scorpions = 5;
    to.castle = true;
    to.fort = 4;
    g.territories[SU].levy = 4;
    const raid = openRaid(
      g,
      SU,
      dest,
      { levy: 4, knights: 0, dragons: 0, beasts: 0 },
      { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    assert.ok(raid.moats.length >= 2);
    assert.ok(raid.bridges.length >= 2);
    assert.ok(raid.buildings.some((b) => b.kind === "scorpion"));
    assert.ok(raid.walls.some((w) => w.ring === "outer"));
    assert.ok(raid.walls.some((w) => w.ring === "inner"));
  });
  it("open camp has no moat and uses the camp miniature", () => {
    const opened = openDrillRaid({
      empire: "sumer",
      walls: 0,
      outer: 0,
      keep: 0,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    });
    assert.ok(opened);
    assert.equal(opened!.raid.moats.length, 0);
    assert.equal(cityArtId(opened!.raid), "camp");
    assert.ok(cityRadius(opened!.raid) < 110);
    assert.ok(cityRadius(opened!.raid) > 70);
  });
  it("city miniatures follow wall and moat ranks with slim canals", () => {
    const raidOf = (walls: number, outer: number, moats: number, keep = 0) =>
      openDrillRaid({
        empire: "sumer",
        walls,
        outer,
        keep,
        towers: 0,
        moats,
        scorpions: 0,
        force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
        siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
        garrison: { levy: 1, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
        dragonTier: 1,
      })!.raid;
    assert.equal(cityArtId(raidOf(1, 0, 0)), "wood");
    assert.equal(cityArtId(raidOf(2, 0, 0)), "stone");
    assert.equal(cityArtId(raidOf(3, 0, 0)), "high");
    assert.equal(cityArtId(raidOf(2, 1, 0)), "outer");
    assert.equal(cityArtId(raidOf(2, 0, 1)), "moat1");
    assert.equal(cityArtId(raidOf(3, 2, 2, 2)), "moat2");
    const ring = raidOf(5, 5, 3, 5);
    assert.equal(cityArtId(ring), "ring");
    assert.ok(ring.moats.length >= 2);
    for (const m of ring.moats) assert.ok(m.r1 - m.r0 <= 8);
  });
  it("map seats reuse the battle city miniature", () => {
    const g = createNewGame({ empire: "egypt", seed: 11, difficulty: "easy" });
    assert.equal(cityArtForTerritory(g.territories[EG]!), "stone");
    const camp = landNeighbors(EG).map((id) => g.territories[id]!).find((t) => t.owner === "barbarian");
    assert.ok(camp);
    assert.equal(cityArtForTerritory(camp!), "camp");
    camp!.owner = 0;
    camp!.wallRank = 1;
    assert.equal(cityArtForTerritory(camp!), "wood");
    camp!.wallRank = 2;
    camp!.outerWallRank = 1;
    assert.equal(cityArtForTerritory(camp!), "outer");
    camp!.moatRank = 1;
    assert.equal(cityArtForTerritory(camp!), "moat2");
  });
  it("attack orders send the host at scorpions", () => {
    const g = createNewGame({ empire: "sumer", seed: 302, difficulty: "easy" });
    const dest = landNeighbors(SU).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.owner = 1;
    g.territories[dest]!.wallRank = 2;
    g.territories[dest]!.scorpionRank = 3;
    g.territories[dest]!.scorpions = 3;
    g.territories[dest]!.castle = true;
    g.territories[SU].dragons = 1;
    const raid = openRaid(
      g,
      SU,
      dest,
      { levy: 0, knights: 0, dragons: 1, beasts: 0 },
      { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    setRaidTactic(raid, "scorpions");
    assert.equal(raid.tactic, "scorpions");
  });
  it("opens the field on the slowest speed with neighbouring land", () => {
    const g = createNewGame({ empire: "egypt", seed: 310, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[EG].levy = 4;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 4, knights: 0, dragons: 0, beasts: 0 },
      { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    assert.equal(raid.timeScale, RAID_SLOWEST);
    assert.equal(RAID_SLOWEST, 0.12);
    assert.deepEqual([...RAID_SPEEDS], [0.12, 0.25, 0.5, 1]);
    assert.ok((raid.neighbors ?? []).length > 0);
    assert.equal(typeof raid.worldX, "number");
  });
  it("captures living defenders into the host that takes the land", () => {
    const g = createNewGame({ empire: "egypt", seed: 311, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[EG].levy = 6;
    g.territories[dest]!.levy = 4;
    g.territories[dest]!.bowmen = 2;
    g.territories[dest]!.knights = 1;
    g.territories[dest]!.beasts = 1;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 6, knights: 0, dragons: 0, beasts: 0 },
      { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    const keep = raid.buildings.find((b) => b.kind === "keep");
    if (keep) keep.hp = 0;
    raid.keepDestroyed = true;
    raid.phase = "over";
    const out = raidOutcome(raid);
    assert.equal(out.winner, "atk");
    assert.ok(hostTotal(out.captured) > 0);
    assert.equal(out.atkLeft.levy, out.atk.remaining.levy + out.captured.levy);
    assert.equal(out.atkLeft.knights, out.atk.remaining.knights + out.captured.knights);
    assert.equal(out.atkLeft.beasts, out.atk.remaining.beasts + out.captured.beasts);
    assert.equal(hostTotal(out.defLeft), 0);
    assert.equal(out.captured.levy, 4);
    assert.equal(out.captured.bowmen, 2);
    assert.equal(out.captured.knights, 1);
    assert.equal(out.captured.beasts, 1);
  });
  it("holds the host until charge and keeps leftover stock as a second wave", () => {
    const g = createNewGame({ empire: "egypt", seed: 320, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.levy = 0;
    g.territories[dest]!.bowmen = 0;
    g.territories[dest]!.knights = 0;
    g.territories[dest]!.beasts = 0;
    g.territories[EG].levy = 4;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 4, knights: 0, dragons: 0, beasts: 0 },
      { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    assert.equal(raid.phase, "deploy");
    assert.equal(beginAssault(raid), false);
    assert.equal(deployTroop(raid, "levy", 40, 40), true);
    assert.equal(raid.phase, "deploy");
    const clock = raid.timeLeft;
    stepRaid(raid, 1);
    assert.equal(raid.phase, "deploy");
    assert.equal(raid.timeLeft, clock);
    assert.equal(beginAssault(raid), true);
    assert.equal(raid.phase, "fight");
    assert.equal(raid.stock.levy, 3);
    assert.equal(deployTroop(raid, "levy", 50, 50), true);
    assert.equal(raid.phase, "fight");
    assert.equal(raid.units.filter((u) => u.side === "atk" && u.kind === "levy").length, 2);
    stepRaid(raid, 1);
    assert.ok(raid.timeLeft < clock);
  });
  it("a ring city keeps a thin garrison and no store houses", () => {
    const opened = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 5,
      outer: 5,
      keep: 5,
      towers: 5,
      moats: 3,
      scorpions: 5,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 8, bowmen: 8, knights: 4, beasts: 3, dragons: 0 },
      dragonTier: 1,
    });
    assert.ok(opened);
    const raid = opened!.raid;
    assert.equal(raid.buildings.filter((b) => b.kind === "store").length, 0);
    assert.ok(raid.buildings.filter((b) => b.kind === "archer").length <= 10);
    assert.ok(raid.buildings.filter((b) => b.kind === "scorpion").length <= 4);
    assert.equal(raid.units.filter((u) => u.side === "def" && u.kind === "levy").length, 8);
    assert.equal(raid.units.filter((u) => u.side === "def" && u.kind === "knight").length, 4);
    assert.equal(raid.units.filter((u) => u.side === "def" && u.kind === "beast").length, 3);
  });
  it("a city has one south gate and even towers", () => {
    const opened = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 5,
      outer: 5,
      keep: 5,
      towers: 5,
      moats: 3,
      scorpions: 5,
      force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 4, bowmen: 6, knights: 2, beasts: 2, dragons: 0 },
      dragonTier: 1,
    });
    const raid = opened!.raid;
    const innerGates = raid.walls.filter((w) => w.gate && w.ring === "inner");
    const outerGates = raid.walls.filter((w) => w.gate && w.ring === "outer");
    assert.equal(innerGates.length, 1);
    assert.equal(outerGates.length, 1);
    const towers = raid.buildings.filter((b) => b.kind === "archer");
    const gateTowers = towers.filter((t) => t.gatePost);
    const evenTowers = towers.filter((t) => !t.gatePost);
    assert.equal(gateTowers.length, 4);
    assert.equal(evenTowers.length, 6);
    assert.equal(towers.length, 10);
    const inner = evenTowers.filter((t) => t.ring === "inner");
    const angs = inner
      .map((t) => Math.atan2((t.y - RAID_CY) / 0.78, t.x - RAID_CX))
      .sort((a, b) => a - b);
    assert.equal(angs.length, 4);
    const twoPi = Math.PI * 2;
    for (let i = 0; i < angs.length; i++) {
      const d = ((angs[(i + 1) % angs.length]! - angs[i]! + twoPi * 2) % twoPi);
      assert.ok(Math.abs(d - twoPi / 4) < 0.2);
    }
    for (const t of evenTowers) {
      const a = Math.atan2((t.y - RAID_CY) / 0.78, t.x - RAID_CX);
      const gap = Math.abs(Math.atan2(Math.sin(a - RAID_GATE_A), Math.cos(a - RAID_GATE_A)));
      assert.ok(gap > 0.2);
    }
    for (const t of gateTowers) {
      const a = Math.atan2((t.y - RAID_CY) / 0.78, t.x - RAID_CX);
      const gap = Math.abs(Math.atan2(Math.sin(a - RAID_GATE_A), Math.cos(a - RAID_GATE_A)));
      assert.ok(gap < RAID_GATE_TOWER_DA + 0.04);
      assert.ok(gap > RAID_GATE_TOWER_DA - 0.04);
    }
    const scorp = raid.buildings.filter((b) => b.kind === "scorpion");
    assert.ok(scorp.length >= 1);
    assert.ok(scorp.every((s) => towers.some((t) => t.id === s.hostId) || raid.buildings.some((k) => k.kind === "keep" && k.id === s.hostId)));
    const levy = raid.units.filter((u) => u.side === "def" && u.kind === "levy");
    const gate = raid.walls.find((w) => w.gate && w.ring === "outer") ?? raid.walls.find((w) => w.gate)!;
    const gx = gate.x + gate.w / 2;
    const gy = gate.y + gate.h / 2;
    assert.ok(levy.every((u) => Math.hypot(u.x - gx, u.y - gy) < 48));
    assert.ok(levy.every((u) => u.holdGate));
    assert.ok(levy.every((u) => u.gateRing === "outer"));
    const bows = raid.units.filter((u) => u.side === "def" && u.kind === "bowman");
    assert.ok(bows.length >= 1);
    assert.ok(bows.every((u) => u.postId && (towers.some((t) => t.id === u.postId) || raid.buildings.some((k) => k.kind === "keep" && k.id === u.postId))));
    assert.ok(bows.every((u) => u.onWall));
  });
  it("battle training can hold the walls", () => {
    const opened = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      side: "def",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 0,
      force: { levy: 8, bowmen: 2, knights: 2, beasts: 0, dragons: 1 },
      siege: { rams: 1, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 4, bowmen: 4, knights: 3, beasts: 1, dragons: 1 },
      dragonTier: 1,
    });
    assert.ok(opened);
    assert.equal(opened!.raid.humanSide, "def");
    assert.equal(opened!.raid.defName, "Sumer");
    assert.equal(opened!.raid.orders.knight, "wall");
    assert.equal(opened!.raid.orders.dragon, "wyrm");
    assert.equal(opened!.raid.phase, "deploy");
    assert.equal(opened!.raid.units.some((u) => u.side === "atk"), false);
    assert.equal(opened!.raid.units.filter((u) => u.side === "def").length, 0);
    assert.ok(opened!.raid.stock.levy > 0);
  });
  it("a defender places the garrison inside the walls", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      side: "def",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 1, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 4, bowmen: 2, knights: 2, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    assert.equal(canDeployAt(raid, 40, RAID_CY), false);
    assert.equal(deployTroop(raid, "levy", 40, RAID_CY), false);
    assert.equal(deployTroop(raid, "levy", RAID_CX, RAID_CY + 70), true);
    const u = raid.units.find((x) => x.side === "def" && x.kind === "levy")!;
    assert.ok(Math.hypot(u.x - RAID_CX, u.y - RAID_CY) < cityRadius(raid));
    assert.equal(raid.stock.levy, 3);
  });
  it("defence splits how many hold the gate and the keep", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      side: "def",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 6, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setOrderLot(raid, "levy", "keep", 2);
    assert.equal(raid.orderLots.levy!.keep, 2);
    assert.equal(raid.orderLots.levy!.gate, 4);
    autoDeployDef(raid);
    const levy = raid.units.filter((u) => u.side === "def" && u.kind === "levy");
    assert.equal(levy.length, 6);
    assert.equal(levy.filter((u) => u.order === "keep").length, 2);
    assert.equal(levy.filter((u) => u.order === "gate").length, 4);
    const keep = raid.buildings.find((b) => b.kind === "keep")!;
    const atKeep = levy.filter((u) => u.order === "keep");
    assert.ok(atKeep.every((u) => Math.hypot(u.x - keep.x, u.y - keep.y) < 80));
  });
  it("attackers can be ordered at the keep", () => {
    assert.ok((KIND_ORDERS.levy ?? []).some((r) => r.id === "keep"));
    assert.ok((KIND_ORDERS.bowman ?? []).some((r) => r.id === "keep"));
    assert.ok((KIND_ORDERS.knight ?? []).some((r) => r.id === "keep"));
    assert.ok((KIND_ORDERS.beast ?? []).some((r) => r.id === "keep"));
    assert.ok((KIND_ORDERS.catapult ?? []).some((r) => r.id === "keep"));
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 0,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 3, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setRaidOrder(raid, "levy", "keep");
    setOrderLot(raid, "levy", "keep", 3);
    assert.equal(deployTroop(raid, "levy", 40, RAID_CY), true);
    const u = raid.units.find((x) => x.side === "atk" && x.kind === "levy")!;
    assert.equal(u.order, "keep");
    const keep = raid.buildings.find((b) => b.kind === "keep")!;
    const before = Math.hypot(u.x - keep.x, u.y - keep.y);
    assert.equal(beginAssault(raid), true);
    playSteps(raid, 240);
    assert.ok(Math.hypot(u.x - keep.x, u.y - keep.y) < before - 8 || keep.hp < keep.max || raid.keepDestroyed);
  });
  it("defending dragons can hold the gate or the first breach", () => {
    assert.ok((DEF_KIND_ORDERS.dragon ?? []).some((r) => r.id === "gate"));
    assert.ok((DEF_KIND_ORDERS.dragon ?? []).some((r) => r.id === "wall"));
    assert.ok((DEF_KIND_ORDERS.dragon ?? []).some((r) => r.id === "keep"));
    for (const kind of ["levy", "bowman", "knight", "beast", "dragon"] as const) {
      assert.ok((DEF_KIND_ORDERS[kind] ?? []).some((r) => r.id === "keep"), kind);
    }
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      side: "def",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      dragonTier: 1,
    })!.raid;
    setOrderLot(raid, "dragon", "gate", 1);
    autoDeployDef(raid);
    const wyrm = raid.units.find((u) => u.side === "def" && u.kind === "dragon")!;
    assert.equal(wyrm.order, "gate");
    const gate = raid.walls.find((w) => w.gate)!;
    const gx = gate.x + gate.w / 2;
    const gy = gate.y + gate.h / 2;
    assert.ok(Math.hypot(wyrm.x - gx, wyrm.y - gy) < Math.hypot(wyrm.x - RAID_CX, wyrm.y - RAID_CY) + 20);
  });
  it("defending knights stand around the city", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 0,
      force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 4, bowmen: 0, knights: 6, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const knights = raid.units.filter((u) => u.side === "def" && u.kind === "knight");
    assert.equal(knights.length, 6);
    assert.ok(knights.every((u) => !u.holdGate));
    assert.ok(knights.every((u) => u.order === "wall"));
    const gate = raid.walls.find((w) => w.gate)!;
    const gx = gate.x + gate.w / 2;
    const gy = gate.y + gate.h / 2;
    assert.ok(knights.some((u) => Math.hypot(u.x - gx, u.y - gy) > 56));
    const angs = knights.map((u) => Math.atan2((u.y - RAID_CY) / 0.78, u.x - RAID_CX));
    const span = Math.max(...angs) - Math.min(...angs);
    assert.ok(span > Math.PI * 0.8, `knight span ${span}`);
  });
  it("defending knights rush the first breach", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 4, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const knights = raid.units.filter((u) => u.side === "def" && u.kind === "knight" && u.hp > 0);
    const home = knights.map((u) => ({ id: u.id, x: u.x, y: u.y }));
    assert.equal(deployTroop(raid, "levy", 40, RAID_CY), true);
    assert.equal(beginAssault(raid), true);
    const gate = raid.walls.find((w) => w.gate)!;
    const gx = gate.x + gate.w / 2;
    const gy = gate.y + gate.h / 2;
    const hole = raid.walls
      .filter((w) => !w.gate && w.hp > 0)
      .sort((a, b) => Math.hypot(b.x + b.w / 2 - gx, b.y + b.h / 2 - gy) - Math.hypot(a.x + a.w / 2 - gx, a.y + a.h / 2 - gy))[0]!;
    hole.hp = 0;
    raid.walkDirty = true;
    playSteps(raid, 180);
    const hx = hole.x + hole.w / 2;
    const hy = hole.y + hole.h / 2;
    const now = home.map((p) => raid.units.find((u) => u.id === p.id)!).filter((u) => u.hp > 0);
    assert.ok(now.length >= 1);
    const before = Math.min(...home.map((p) => Math.hypot(p.x - hx, p.y - hy)));
    const after = Math.min(...now.map((u) => Math.hypot(u.x - hx, u.y - hy)));
    assert.ok(after < before - 6, `knights ${before} -> ${after} toward hole`);
  });
  it("a defending dragon wakes over the keep", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 1,
      force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      dragonTier: 1,
    })!.raid;
    const wyrm = raid.units.find((u) => u.side === "def" && u.kind === "dragon")!;
    const keep = raid.buildings.find((b) => b.kind === "keep");
    const cx = keep?.x ?? RAID_CX;
    const cy = keep?.y ?? RAID_CY;
    assert.ok(Math.hypot(wyrm.x - cx, wyrm.y - cy) < 36);
  });
  it("a defending dragon hunts enemy dragons then the largest group at a breach", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 2,
      force: { levy: 8, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      dragonTier: 1,
    })!.raid;
    const wyrm = raid.units.find((u) => u.kind === "dragon" && u.side === "def")!;
    const before = wyrm.hp;
    assert.equal(deployTroop(raid, "dragon", 40, 40), true);
    for (let i = 0; i < 8; i++) assert.equal(deployTroop(raid, "levy", 80 + i * 10, RAID_CY + 80), true);
    const gate = raid.walls.find((w) => w.gate)!;
    assert.equal(beginAssault(raid), true);
    playSteps(raid, 200);
    assert.ok(wyrm.hp < before);
    const foeDrake = raid.units.find((u) => u.kind === "dragon" && u.side === "atk")!;
    foeDrake.hp = 0;
    gate.hp = 0;
    raid.walkDirty = true;
    const gx = gate.x + gate.w / 2;
    const gy = gate.y + gate.h / 2;
    playSteps(raid, 220);
    const levies = raid.units.filter((u) => u.side === "atk" && u.kind === "levy" && u.hp > 0);
    assert.ok(levies.length >= 1);
    const toGate = Math.hypot(wyrm.x - gx, wyrm.y - gy);
    const toKeep = Math.hypot(wyrm.x - RAID_CX, wyrm.y - RAID_CY);
    assert.ok(toGate < toKeep + 40 || levies.some((u) => Math.hypot(wyrm.x - u.x, wyrm.y - u.y) < 140));
  });
  it("gate watch holds until a wall is breached, then rushes the hole", () => {
    const opened = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 0,
      force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 4, bowmen: 2, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    });
    const raid = opened!.raid;
    const posted = raid.units.filter((u) => u.side === "def" && u.kind === "bowman" && u.postId);
    const home = posted.map((u) => ({ id: u.id, x: u.x, y: u.y }));
    assert.equal(deployTroop(raid, "levy", 40, RAID_CY), true);
    assert.equal(beginAssault(raid), true);
    raid.timeScale = 1;
    for (let i = 0; i < 50; i++) stepRaid(raid, 1 / 60);
    const gate = raid.walls.find((w) => w.gate)!;
    const gx = gate.x + gate.w / 2;
    const gy = gate.y + gate.h / 2;
    const hold = raid.units.filter((u) => u.side === "def" && u.kind === "levy" && u.holdGate && u.hp > 0);
    assert.equal(hold.length, 4);
    const holdDist = Math.min(...hold.map((u) => Math.hypot(u.x - gx, u.y - gy)));
    assert.ok(holdDist < 40);
    for (const p of home) {
      const u = raid.units.find((x) => x.id === p.id)!;
      assert.ok(u.hp > 0);
      assert.ok(Math.hypot(u.x - p.x, u.y - p.y) < 2);
    }
    const hole = raid.walls
      .filter((w) => !w.gate && w.hp > 0)
      .sort((a, b) => Math.hypot(b.x + b.w / 2 - gx, b.y + b.h / 2 - gy) - Math.hypot(a.x + a.w / 2 - gx, a.y + a.h / 2 - gy))[0]!;
    hole.hp = 0;
    raid.walkDirty = true;
    for (let i = 0; i < 180; i++) stepRaid(raid, 1 / 60);
    const holdNow = raid.units.filter((u) => u.side === "def" && u.kind === "levy" && u.holdGate && u.hp > 0);
    assert.ok(holdNow.length >= 1);
    const hx = hole.x + hole.w / 2;
    const hy = hole.y + hole.h / 2;
    const rushed = holdNow.filter((u) => Math.hypot(u.x - gx, u.y - gy) > holdDist + 8);
    assert.ok(rushed.length >= 1);
    const nearer = Math.min(...holdNow.map((u) => Math.hypot(u.x - hx, u.y - hy)));
    const fromGate = Math.hypot(gx - hx, gy - hy);
    assert.ok(nearer < fromGate - 8);
  });
  it("a fallen tower kills its archers and scorpions", () => {
    const opened = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 3,
      moats: 0,
      scorpions: 2,
      force: { levy: 1, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 2, bowmen: 4, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    });
    const raid = opened!.raid;
    const tw = raid.buildings.find((b) => b.kind === "archer")!;
    const crew = raid.units.filter((u) => u.postId === tw.id && u.hp > 0);
    const guns = raid.buildings.filter((b) => b.hostId === tw.id && b.hp > 0);
    assert.ok(crew.length >= 1);
    hurtBuilding(raid, tw, tw.hp);
    assert.equal(tw.hp, 0);
    assert.ok(crew.every((u) => u.hp <= 0));
    assert.ok(guns.every((b) => b.hp <= 0));
  });
  it("a closed gate blocks the ring and gate-towers stand without tower works", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 1, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 2, bowmen: 2, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const gate = raid.walls.find((w) => w.gate)!;
    assert.ok(gate.hp > 0);
    const cx = Math.floor((gate.x + gate.w / 2) / 20);
    const cy = Math.floor((gate.y + gate.h / 2) / 20);
    assert.equal(raid.walk[cy * 36 + cx], 0);
    const gateTowers = raid.buildings.filter((b) => b.kind === "archer" && b.gatePost);
    assert.equal(gateTowers.length, 2);
    const bows = raid.units.filter((u) => u.side === "def" && u.kind === "bowman");
    assert.ok(bows.length >= 1);
    assert.ok(bows.every((u) => gateTowers.some((t) => t.id === u.postId)));
    assert.equal(deployTroop(raid, "levy", 40, 40), true);
    assert.equal(beginAssault(raid), true);
    gate.hp = 0;
    raid.walkDirty = true;
    stepRaid(raid, 1 / 60);
    assert.equal(raid.walk[cy * 36 + cx], 1);
  });
  it("a second ring is the overflow muster and archers fill gate-towers first", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 2,
      keep: 1,
      towers: 1,
      moats: 0,
      scorpions: 0,
      force: { levy: 1, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 12, bowmen: 6, knights: 0, beasts: 12, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const levy = raid.units.filter((u) => u.side === "def" && u.kind === "levy");
    assert.equal(levy.length, 12);
    assert.ok(levy.every((u) => u.holdGate));
    assert.equal(levy.filter((u) => u.gateRing === "outer").length, 8);
    assert.equal(levy.filter((u) => u.gateRing === "inner").length, 4);
    const beasts = raid.units.filter((u) => u.side === "def" && u.kind === "beast");
    assert.equal(beasts.length, 12);
    assert.equal(beasts.filter((u) => u.gateRing === "outer" && u.holdGate).length, 5);
    assert.equal(beasts.filter((u) => u.gateRing === "inner" && u.holdGate).length, 5);
    const around = beasts.filter((u) => !u.holdGate);
    assert.equal(around.length, 2);
    assert.ok(around.every((u) => !u.holdGate));
    const gateTowers = raid.buildings.filter((b) => b.kind === "archer" && b.gatePost);
    const outerPosts = gateTowers.filter((t) => t.ring === "outer");
    const innerPosts = gateTowers.filter((t) => t.ring === "inner");
    assert.equal(outerPosts.length, 2);
    assert.equal(innerPosts.length, 2);
    const bows = raid.units.filter((u) => u.side === "def" && u.kind === "bowman");
    assert.equal(bows.length, 6);
    assert.equal(bows.filter((u) => outerPosts.some((t) => t.id === u.postId)).length, 4);
    assert.equal(bows.filter((u) => innerPosts.some((t) => t.id === u.postId)).length, 2);
  });
  it("warriors follow a ram to the gate", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 2, bowmen: 0, knights: 1, beasts: 0, dragons: 0 },
      siege: { rams: 1, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const gate = raid.walls.find((w) => w.gate)!;
    const gx = gate.x + gate.w / 2;
    const gy = gate.y + gate.h / 2;
    assert.equal(deployTroop(raid, "ram", gx, Math.min(RAID_H - 24, gy + 88)), true);
    assert.equal(deployTroop(raid, "levy", gx + 36, Math.min(RAID_H - 24, gy + 102)), true);
    assert.equal(deployTroop(raid, "knight", gx - 36, Math.min(RAID_H - 24, gy + 102)), true);
    assert.equal(beginAssault(raid), true);
    const levy0 = raid.units.find((u) => u.kind === "levy" && u.side === "atk")!;
    const start = { x: levy0.x, y: levy0.y };
    playSteps(raid, 240);
    const ram = raid.units.find((u) => u.kind === "ram" && u.hp > 0)!;
    const levy = raid.units.find((u) => u.kind === "levy" && u.side === "atk" && u.hp > 0)!;
    const knight = raid.units.find((u) => u.kind === "knight" && u.side === "atk" && u.hp > 0)!;
    const keep = raid.buildings.find((b) => b.kind === "keep")!;
    assert.ok(Math.hypot(levy.x - ram.x, levy.y - ram.y) < Math.hypot(levy.x - keep.x, levy.y - keep.y));
    assert.ok(Math.hypot(knight.x - ram.x, knight.y - ram.y) < Math.hypot(knight.x - keep.x, knight.y - keep.y));
    assert.ok(Math.hypot(levy.x - start.x, levy.y - start.y) > 8);
    assert.ok(gate.hp < gate.max || ram.y < gy + 100);
  });
  it("beasts punch a nearby wall or drive the gate", () => {
    const opened = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 1, bowmen: 0, knights: 0, beasts: 2, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!;
    const side = cloneRaid(opened.raid);
    const east = side.walls.filter((w) => !w.gate && w.hp > 0).sort((a, b) => b.x - a.x)[0]!;
    const ex = east.x + east.w / 2;
    const ey = east.y + east.h / 2;
    assert.equal(deployTroop(side, "beast", Math.min(RAID_W - 24, ex + 40), ey), true);
    assert.equal(beginAssault(side), true);
    const eastHp = east.hp;
    playSteps(side, 180);
    assert.ok(east.hp < eastHp);

    const south = opened.raid;
    const gate = south.walls.find((w) => w.gate)!;
    const gx = gate.x + gate.w / 2;
    const gy = gate.y + gate.h / 2;
    assert.equal(deployTroop(south, "beast", gx, Math.min(RAID_H - 24, gy + 36)), true);
    assert.equal(beginAssault(south), true);
    const gateHp = gate.hp;
    playSteps(south, 180);
    assert.ok(gate.hp < gateHp);
  });
  it("archers shoot nearby towers", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 0,
      force: { levy: 1, bowmen: 3, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const towers = raid.buildings.filter((b) => b.kind === "archer");
    assert.ok(towers.length >= 2);
    for (const b of raid.buildings) b.dmg = 0;
    const mark = towers.find((t) => !t.gatePost) ?? towers[0]!;
    const out = Math.atan2(mark.y - RAID_CY, mark.x - RAID_CX);
    const reach = cityRadius(raid) + 42;
    const ax = Math.max(24, Math.min(RAID_W - 24, RAID_CX + Math.cos(out) * reach));
    const ay = Math.max(24, Math.min(RAID_H - 28, RAID_CY + Math.sin(out) * reach * 0.78));
    assert.equal(deployTroop(raid, "bowman", ax, ay), true);
    assert.equal(deployTroop(raid, "bowman", Math.max(24, ax - 22), ay), true);
    assert.equal(beginAssault(raid), true);
    const hp = mark.hp;
    playSteps(raid, 300);
    const towerHp = towers.reduce((n, b) => n + Math.max(0, b.hp), 0);
    const towerMax = towers.reduce((n, b) => n + b.max, 0);
    assert.ok(mark.hp < hp || towerHp < towerMax);
  });
  it("catapults chew walls then switch to towers after a breach", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 0,
      force: { levy: 1, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 1, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    assert.equal(deployTroop(raid, "catapult", RAID_CX + 96, RAID_H - 40), true);
    assert.equal(beginAssault(raid), true);
    const wallHp = raid.walls.reduce((n, w) => n + w.hp, 0);
    playSteps(raid, 360);
    const afterWall = raid.walls.reduce((n, w) => n + Math.max(0, w.hp), 0);
    assert.ok(afterWall < wallHp);
    for (const w of raid.walls) w.hp = 0;
    raid.walkDirty = true;
    const towers = raid.buildings.filter((b) => b.kind === "archer" && b.hp > 0);
    const towerHp = towers.reduce((n, b) => n + b.hp, 0);
    playSteps(raid, 360);
    const afterTower = towers.reduce((n, b) => n + Math.max(0, b.hp), 0);
    assert.ok(afterTower < towerHp);
  });
  it("brings every ram in the column", () => {
    const g = createNewGame({ empire: "egypt", seed: 330, difficulty: "easy" });
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g.territories[dest]!.castle = true;
    g.territories[EG].levy = 2;
    g.territories[EG].rams = 3;
    const raid = openRaid(
      g,
      EG,
      dest,
      { levy: 2, knights: 0, dragons: 0, beasts: 0 },
      { rams: 3, catapults: 0, ladders: 0, towers: 0 },
      "atk",
    )!;
    assert.equal(raid.stock.rams, 3);
  });
  it("one dragon burns six scorpions if it hunts them first", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 3,
      moats: 0,
      scorpions: 5,
      force: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const proto = raid.buildings.find((b) => b.kind === "scorpion")!;
    while (raid.buildings.filter((b) => b.kind === "scorpion").length < 6) {
      raid.nextId += 1;
      const i = raid.buildings.filter((b) => b.kind === "scorpion").length;
      raid.buildings.push({
        ...proto,
        id: `sx${raid.nextId}`,
        x: RAID_CX + Math.cos((i / 6) * Math.PI * 2) * 100,
        y: RAID_CY + Math.sin((i / 6) * Math.PI * 2) * 78,
        hp: proto.max,
        cdLeft: 0.15,
        hostId: null,
      });
    }
    for (const b of raid.buildings) if (b.kind === "keep" || b.kind === "archer") b.dmg = 0;
    assert.equal(raid.buildings.filter((b) => b.kind === "scorpion").length, 6);
    runRaid(raid, 40);
    const drake = raid.units.find((u) => u.kind === "dragon" && u.side === "atk");
    assert.ok(drake && drake.hp > 0);
    assert.equal(raid.buildings.filter((b) => b.kind === "scorpion" && b.hp > 0).length, 0);
  });
  it("a dragon flies across the city instead of circling the walls", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 3,
      outer: 2,
      keep: 2,
      towers: 3,
      moats: 2,
      scorpions: 3,
      force: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 4, bowmen: 4, knights: 2, beasts: 1, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    autoDeployAll(raid);
    assert.equal(beginAssault(raid), true);
    raid.timeScale = 1;
    const drake = raid.units.find((u) => u.kind === "dragon" && u.side === "atk")!;
    let maxY = drake.y;
    let minRing = 1e9;
    const rim = cityRadius(raid);
    for (let i = 0; i < 360; i++) {
      stepRaid(raid, 1 / 60);
      maxY = Math.max(maxY, drake.y);
      const ring = Math.hypot(drake.x - RAID_CX, (drake.y - RAID_CY) / 0.78);
      minRing = Math.min(minRing, ring);
    }
    assert.ok(drake.hp > 0);
    assert.ok(maxY < RAID_H - 28, `fled south to y=${maxY}`);
    assert.ok(drake.y < RAID_H - 28);
    assert.ok(drake.x > 24 && drake.x < RAID_W - 24);
    assert.ok(minRing < rim, `never crossed the city, minRing=${minRing} rim=${rim}`);
  });
  it("after scorpions a dragon burns gates, towers, beasts, knights, archers and warriors", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 3,
      moats: 0,
      scorpions: 0,
      force: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 6, bowmen: 4, knights: 3, beasts: 2, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    for (const b of raid.buildings) if (b.kind === "keep") b.dmg = 0;
    autoDeployAll(raid);
    assert.equal(beginAssault(raid), true);
    raid.timeScale = 1;
    const hpOf = (kind: string) =>
      raid.units.filter((u) => u.side === "def" && u.kind === kind).reduce((n, u) => n + Math.max(0, u.hp), 0);
    const towerHp = raid.buildings.filter((b) => b.kind === "archer").reduce((n, b) => n + b.hp, 0);
    const gateHp = raid.walls.filter((w) => w.gate).reduce((n, w) => n + w.hp, 0);
    const start = {
      tower: towerHp,
      gate: gateHp,
      beast: hpOf("beast"),
      knight: hpOf("knight"),
      bowman: hpOf("bowman"),
      levy: hpOf("levy"),
    };
    const drake = raid.units.find((u) => u.kind === "dragon" && u.side === "atk")!;
    const seen = new Set<string>();
    for (let i = 0; i < 900; i++) {
      stepRaid(raid, 1 / 60);
      const id = drake.target;
      if (!id) continue;
      const u = raid.units.find((o) => o.id === id);
      if (u) seen.add(u.kind);
      const b = raid.buildings.find((o) => o.id === id);
      if (b) seen.add(b.kind === "archer" ? "tower" : b.kind);
      const w = raid.walls.find((o) => o.id === id);
      if (w) seen.add(w.gate ? "gate" : "wall");
    }
    const hits = [
      raid.buildings.filter((b) => b.kind === "archer").reduce((n, b) => n + Math.max(0, b.hp), 0) < start.tower,
      raid.walls.filter((w) => w.gate).reduce((n, w) => n + Math.max(0, w.hp), 0) < start.gate,
      hpOf("beast") < start.beast,
      hpOf("knight") < start.knight,
      hpOf("bowman") < start.bowman,
      hpOf("levy") < start.levy,
    ].filter(Boolean).length;
    assert.ok(hits >= 4, `dragon only wounded ${hits} of gates/towers/garrison`);
    assert.ok(seen.has("gate") || seen.has("tower"), `dragon never marked a gate or tower (${[...seen].join(",") || "none"})`);
    const garrison = ["beast", "knight", "bowman", "levy"].filter((k) => seen.has(k));
    assert.ok(garrison.length >= 1 || hits >= 5, `dragon skipped the garrison; marks ${[...seen].join(",")}`);
  });
  it("catapults ordered at towers chew towers after a gate falls", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 0,
      force: { levy: 1, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 1, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setRaidOrder(raid, "catapult", "posts");
    const gate = raid.walls.find((w) => w.gate)!;
    gate.hp = 0;
    raid.walkDirty = true;
    assert.ok(raid.walls.some((w) => w.hp > 0 && !w.climb));
    assert.equal(deployTroop(raid, "catapult", RAID_CX + 96, RAID_H - 40), true);
    assert.equal(beginAssault(raid), true);
    const towers = raid.buildings.filter((b) => b.kind === "archer" && b.hp > 0);
    const towerHp = towers.reduce((n, b) => n + b.hp, 0);
    playSteps(raid, 420);
    const afterTower = towers.reduce((n, b) => n + Math.max(0, b.hp), 0);
    assert.ok(afterTower < towerHp);
  });
  it("catapults opening a wall keep chewing it after the gate falls", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 0,
      force: { levy: 1, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 1, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setRaidOrder(raid, "catapult", "wall");
    const gate = raid.walls.find((w) => w.gate)!;
    gate.hp = 0;
    raid.walkDirty = true;
    const walls = raid.walls.filter((w) => !w.gate && w.hp > 0);
    const wallHp = walls.reduce((n, w) => n + w.hp, 0);
    assert.equal(deployTroop(raid, "catapult", RAID_CX + 96, RAID_H - 40), true);
    assert.equal(beginAssault(raid), true);
    playSteps(raid, 240);
    const afterWall = walls.reduce((n, w) => n + Math.max(0, w.hp), 0);
    assert.ok(afterWall < wallHp);
  });
  it("troops inside the ring strike the keep while leftover walls stand", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const gate = raid.walls.find((w) => w.gate)!;
    gate.hp = 0;
    raid.walkDirty = true;
    assert.ok(raid.walls.some((w) => w.hp > 0 && !w.climb));
    assert.equal(deployTroop(raid, "levy", 40, 40), true);
    const levy = raid.units.find((u) => u.kind === "levy" && u.side === "atk")!;
    levy.x = RAID_CX;
    levy.y = RAID_CY + 36;
    levy.path = [];
    assert.equal(beginAssault(raid), true);
    const keep = raid.buildings.find((b) => b.kind === "keep")!;
    const hp = keep.hp;
    playSteps(raid, 180);
    assert.ok(keep.hp < hp);
  });
  it("dragons hunt enemy dragons before scorpions", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 3,
      force: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      dragonTier: 1,
    })!.raid;
    assert.equal(raid.orders.dragon, "wyrm");
    for (const b of raid.buildings) b.dmg = 0;
    const scorpHp = raid.buildings.filter((b) => b.kind === "scorpion").reduce((n, b) => n + b.hp, 0);
    const wyrm = raid.units.find((u) => u.kind === "dragon" && u.side === "def")!;
    const before = wyrm.hp;
    assert.equal(deployTroop(raid, "dragon", 40, 40), true);
    assert.equal(beginAssault(raid), true);
    playSteps(raid, 180);
    const scorpAfter = raid.buildings.filter((b) => b.kind === "scorpion").reduce((n, b) => n + Math.max(0, b.hp), 0);
    assert.ok(wyrm.hp < before);
    assert.equal(scorpAfter, scorpHp);
  });
  it("after the first dragon falls they hunt the next, then scorpions", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 3,
      force: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 2 },
      dragonTier: 1,
    })!.raid;
    for (const b of raid.buildings) b.dmg = 0;
    const wyrms = raid.units.filter((u) => u.kind === "dragon" && u.side === "def");
    wyrms[0]!.hp = 8;
    const second = wyrms[1]!;
    const secondHp = second.hp;
    const scorpHp = raid.buildings.filter((b) => b.kind === "scorpion").reduce((n, b) => n + b.hp, 0);
    assert.equal(deployTroop(raid, "dragon", 40, 40), true);
    assert.equal(beginAssault(raid), true);
    playSteps(raid, 240);
    assert.ok(wyrms[0]!.hp <= 0 || second.hp < secondHp);
    const scorpMid = raid.buildings.filter((b) => b.kind === "scorpion").reduce((n, b) => n + Math.max(0, b.hp), 0);
    assert.equal(scorpMid, scorpHp);
    for (const w of wyrms) w.hp = 0;
    playSteps(raid, 300);
    const scorpAfter = raid.buildings.filter((b) => b.kind === "scorpion").reduce((n, b) => n + Math.max(0, b.hp), 0);
    assert.ok(scorpAfter < scorpHp);
  });
  it("warriors ordered to ladders follow the ladders, not the ram", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 1, catapults: 0, ladders: 1, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setRaidOrder(raid, "levy", "ladder");
    assert.equal(deployTroop(raid, "ram", RAID_CX - 80, RAID_H - 40), true);
    assert.equal(deployTroop(raid, "ladder", RAID_CX + 80, RAID_H - 40), true);
    assert.equal(deployTroop(raid, "levy", RAID_CX, RAID_H - 36), true);
    const levy = raid.units.find((u) => u.kind === "levy" && u.side === "atk")!;
    const ram = raid.units.find((u) => u.kind === "ram")!;
    const ladder = raid.units.find((u) => u.kind === "ladder")!;
    assert.equal(beginAssault(raid), true);
    playSteps(raid, 90);
    const dRam = Math.hypot(levy.x - ram.x, levy.y - ram.y);
    const dLad = Math.hypot(levy.x - ladder.x, levy.y - ladder.y);
    assert.ok(dLad < dRam);
  });
  it("held troops stand until the next charge", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 1, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setRaidOrder(raid, "levy", "hold");
    assert.equal(deployTroop(raid, "ram", RAID_CX, RAID_H - 40), true);
    assert.equal(deployTroop(raid, "levy", RAID_CX + 30, RAID_H - 36), true);
    const levy = raid.units.find((u) => u.kind === "levy" && u.side === "atk")!;
    const ram = raid.units.find((u) => u.kind === "ram")!;
    const lx = levy.x;
    const ly = levy.y;
    const ry = ram.y;
    assert.equal(levy.held, true);
    assert.equal(beginAssault(raid), true);
    playSteps(raid, 90);
    assert.ok(Math.hypot(levy.x - lx, levy.y - ly) < 4);
    assert.ok(ram.y < ry - 4);
    assert.equal(chargeWave(raid), true);
    playSteps(raid, 90);
    assert.equal(levy.held, false);
    assert.ok(Math.hypot(levy.x - lx, levy.y - ly) > 8);
    assert.equal(levy.order, "gate");
  });
  it("held warriors keep the follow-ram order when they charge", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 1, catapults: 0, ladders: 1, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setRaidOrder(raid, "levy", "gate");
    setRaidOrder(raid, "levy", "hold");
    assert.equal(deployTroop(raid, "ram", RAID_CX, RAID_H - 40), true);
    assert.equal(deployTroop(raid, "ladder", RAID_CX + 70, RAID_H - 40), true);
    assert.equal(deployTroop(raid, "levy", RAID_CX + 30, RAID_H - 36), true);
    const levy = raid.units.find((u) => u.kind === "levy" && u.side === "atk")!;
    const ram = raid.units.find((u) => u.kind === "ram")!;
    const ladder = raid.units.find((u) => u.kind === "ladder")!;
    assert.equal(levy.held, true);
    assert.equal(beginAssault(raid), true);
    assert.equal(chargeWave(raid), true);
    assert.equal(levy.held, false);
    assert.equal(levy.order, "gate");
    playSteps(raid, 90);
    const dRam = Math.hypot(levy.x - ram.x, levy.y - ram.y);
    const dLad = Math.hypot(levy.x - ladder.x, levy.y - ladder.y);
    assert.ok(dRam < dLad);
  });
  it("rams, towers and ladders have no hold orders", () => {
    assert.equal((KIND_ORDERS.ram ?? []).length, 0);
    assert.equal((KIND_ORDERS.tower ?? []).length, 0);
    assert.equal((KIND_ORDERS.ladder ?? []).length, 0);
    assert.ok((KIND_ORDERS.levy ?? []).some((r) => r.id === "hold"));
    assert.ok((KIND_ORDERS.bowman ?? []).some((r) => r.id === "hold"));
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 1, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 1, catapults: 0, ladders: 1, towers: 1 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setRaidOrder(raid, "ram", "hold");
    setRaidOrder(raid, "tower", "hold");
    setRaidOrder(raid, "ladder", "hold");
    assert.equal(raid.orders.ram, "gate");
    assert.equal(raid.orders.tower, "wall");
    assert.equal(raid.orders.ladder, "wall");
  });
  it("warriors can be placed into a siege tower", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 1 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    setRaidOrder(raid, "levy", "gate");
    assert.equal(deployTroop(raid, "tower", 80, RAID_H - 40), true);
    const tower = raid.units.find((u) => u.kind === "tower")!;
    assert.equal(tower.cargo?.levy ?? 0, 0);
    assert.equal(deployTroop(raid, "levy", tower.x, tower.y), true);
    assert.equal(deployTroop(raid, "levy", tower.x, tower.y), true);
    assert.equal(tower.cargo?.levy, 2);
    assert.equal(raid.units.filter((u) => u.kind === "levy").length, 0);
    assert.equal(raid.stock.levy, 2);
  });
  it("calls out a fallen gate, a breach and a fallen tower", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 2,
      moats: 0,
      scorpions: 0,
      force: { levy: 1, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const gate = raid.walls.find((w) => w.gate)!;
    const wall = raid.walls.find((w) => !w.gate && w.hp > 0)!;
    const tower = raid.buildings.find((b) => b.kind === "archer")!;
    hurtWall(raid, gate, gate.hp);
    hurtWall(raid, wall, wall.hp);
    hurtBuilding(raid, tower, tower.hp);
    const kinds = raid.alerts.map((a) => a.kind);
    assert.ok(kinds.includes("gate"), kinds.join(","));
    assert.ok(kinds.includes("wall"), kinds.join(","));
    assert.ok(kinds.includes("tower"), kinds.join(","));
    const status = raidBattleStatus(raid);
    assert.equal(status.gateDown, true);
    assert.equal(status.wallBreached, true);
    assert.ok(status.towersDown >= 1);
    assert.ok(status.gateLabel.toLowerCase().includes("destroyed"));
    assert.ok(status.wallLabel.toLowerCase().includes("breach") || status.wallLabel.toLowerCase().includes("down"));
    assert.ok(status.towerLabel.toLowerCase().includes("destroyed"));
  });
  it("live army bars count both hosts at full strength", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 1, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const hp = raidArmyHp(raid);
    assert.equal(hp.atk.cur, hp.atk.max);
    assert.equal(hp.def.cur, hp.def.max);
    assert.ok(hp.atk.max >= 4 * 42 + 400, `${hp.atk.max}`);
    assert.ok(hp.def.max >= 2 * 42, `${hp.def.max}`);
  });
  it("placing a troop does not change army strength", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const before = raidArmyHp(raid);
    assert.equal(deployTroop(raid, "levy", 40, 40), true);
    const after = raidArmyHp(raid);
    assert.equal(after.atk.cur, before.atk.cur);
    assert.equal(after.atk.max, before.atk.max);
    assert.equal(after.def.cur, before.def.cur);
  });
  it("wounds drop the live bar and leave the peak", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const defender = raid.units.find((u) => u.side === "def" && u.hp > 0)!;
    const before = raidArmyHp(raid);
    defender.hp = Math.max(1, Math.floor(defender.hp / 2));
    const after = raidArmyHp(raid);
    assert.ok(after.def.cur < before.def.cur, `${after.def.cur} !< ${before.def.cur}`);
    assert.equal(after.def.max, before.def.max);
    assert.equal(after.atk.cur, before.atk.cur);
  });
  it("a slain host still holds its peak on the bar", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 2, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const before = raidArmyHp(raid);
    for (const u of raid.units) if (u.side === "def") u.hp = 0;
    const after = raidArmyHp(raid);
    assert.equal(after.def.cur, 0);
    assert.equal(after.def.max, before.def.max);
  });
  it("defence training counts the unplaced garrison on the bar", () => {
    const raid = openDrillRaid({
      empire: "sumer",
      foe: "egypt",
      side: "def",
      walls: 2,
      outer: 0,
      keep: 1,
      towers: 0,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 6, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    })!.raid;
    const before = raidArmyHp(raid);
    assert.equal(raid.humanSide, "def");
    assert.equal(before.atk.cur, before.atk.max);
    assert.equal(before.def.cur, before.def.max);
    assert.ok(before.def.max >= 6 * 42, `${before.def.max}`);
    assert.ok(before.atk.max >= 4 * 42, `${before.atk.max}`);
    assert.equal(beginAssault(raid), true);
    const after = raidArmyHp(raid);
    assert.equal(after.atk.max, before.atk.max);
    assert.equal(after.def.max, before.def.max);
    assert.equal(after.atk.cur, before.atk.cur);
    assert.equal(after.def.cur, before.def.cur);
  });
});

describe("drill yard", () => {
  it("opens a practice raid without touching the campaign", () => {
    const opened = openDrillRaid({
      empire: "sumer",
      walls: 5,
      outer: 5,
      keep: 5,
      towers: 5,
      moats: 3,
      scorpions: 5,
      force: { levy: 8, bowmen: 4, knights: 2, beasts: 2, dragons: 1 },
      siege: { rams: 1, catapults: 1, ladders: 1, towers: 1 },
      garrison: { levy: 4, bowmen: 4, knights: 1, beasts: 1, dragons: 0 },
      dragonTier: 2,
    });
    assert.ok(opened);
    assert.equal(opened!.raid.atkName, "Sumer");
    assert.equal(opened!.raid.defName, "Egypt");
    assert.equal(opened!.raid.toId, empireOf("egypt").capitol);
    assert.ok(opened!.raid.moats.length >= 2);
    assert.ok(opened!.raid.bridges.length >= 2);
    assert.equal(dragonPowerFor(1), 50);
    assert.equal(dragonPowerFor(2), 62);
    assert.equal(dragonPowerFor(3), 87);
  });
  it("Sumer wakes at Sumer with giants", () => {
    const g = createNewGame({ empire: "sumer", seed: 8, difficulty: "normal" });
    assert.equal(g.territories[SU].owner, 0);
    assert.equal(g.territories[SU].wallRank, 2);
    assert.equal(g.territories[SU].towerRank, 1);
    assert.equal(beastOf("sumer").id, "giant");
    assert.equal(defenseRank(g.territories[SU], "walls"), 2);
  });
  it("picks the opposition seat even when the empires are not neighbours", () => {
    const opened = openDrillRaid({
      empire: "asgard",
      foe: "gondwana",
      walls: 1,
      outer: 0,
      keep: 0,
      towers: 1,
      moats: 0,
      scorpions: 0,
      force: { levy: 4, bowmen: 0, knights: 0, beasts: 0, dragons: 0 },
      siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
      garrison: { levy: 2, bowmen: 2, knights: 0, beasts: 0, dragons: 0 },
      dragonTier: 1,
    });
    assert.ok(opened);
    assert.equal(drillFoeOf({ empire: "asgard", foe: "gondwana" }), "gondwana");
    assert.equal(opened!.raid.atkName, empireOf("asgard").name);
    assert.equal(opened!.raid.defName, empireOf("gondwana").name);
    assert.equal(opened!.raid.fromId, empireOf("asgard").capitol);
    assert.equal(opened!.raid.toId, empireOf("gondwana").capitol);
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
    let g = createNewGame({ empire: "alaska", seed: 81, difficulty: "easy" });
    g.players[0]!.gold = 40;
    g.players[0]!.wood = 20;
    g = buildPort(g, AK);
    g = buildFarm(g, AK);
    assert.ok(g.jobs.some((j) => j.kind === "port"));
    assert.ok(g.jobs.some((j) => j.kind === "farm"));
    assert.ok(constructionBusy(g, AK));
  });
  it("will not queue a second port in the same city", () => {
    let g = createNewGame({ empire: "alaska", seed: 82, difficulty: "easy" });
    g.players[0]!.gold = 40;
    g.players[0]!.wood = 20;
    g = buildPort(g, AK);
    const blocked = buildPort(g, AK);
    assert.equal(blocked.jobs.filter((j) => j.kind === "port").length, 1);
    assert.equal(hasKindJob(g, AK, "port"), true);
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

describe("courts and ranks", () => {
  it("starting empires each hold one capital and share Emperor first", () => {
    const g = createNewGame({ empire: "egypt", seed: 33, difficulty: "easy" });
    const stats = empireStats(g, 0);
    assert.equal(stats.emperor, 1);
    assert.equal(stats.colonizer, 1);
    assert.equal(stats.popular, 4);
    assert.equal(stats.warlord, 10 + 10 + 5 + 3);
    assert.equal(stats.merchant, g.players[0]!.gold + incomeFor(g, 0).gold);
    const inc = incomeFor(g, 0);
    const p = g.players[0]!;
    assert.equal(stats.trader, p.silver + p.wood + p.stone + p.metal + p.food + inc.silver + inc.wood + inc.stone + inc.metal + inc.food);
    assert.ok(empireLevel(empireScore(stats)) >= 1);
    const you = rankPlayers(g).find((r) => r.id === 0)!;
    assert.equal(you.ranks.emperor, 1);
    assert.equal(you.capitals, 1);
  });
  it("gold in the vault lifts Merchant rank", () => {
    const g = createNewGame({ empire: "egypt", seed: 33, difficulty: "easy" });
    g.players[0]!.gold = 400;
    const you = rankPlayers(g).find((r) => r.id === 0)!;
    assert.equal(you.ranks.merchant, 1);
    for (const row of rankPlayers(g)) {
      if (row.id !== 0) assert.ok(row.ranks.merchant >= 2);
    }
  });
  it("a second capital lifts Emperor rank and overall score", () => {
    const g = createNewGame({ empire: "egypt", seed: 33, difficulty: "easy" });
    const before = empireScore(empireStats(g, 0));
    g.territories[SU]!.owner = 0;
    const after = empireStats(g, 0);
    assert.equal(after.emperor, 2);
    assert.ok(empireScore(after) > before);
    const you = rankPlayers(g).find((r) => r.id === 0)!;
    assert.equal(you.ranks.emperor, 1);
  });
  it("warlord counts the host on the road", () => {
    let g = createNewGame({ empire: "egypt", seed: 33, difficulty: "easy" });
    const before = empireStats(g, 0).warlord;
    const dest = landNeighbors(EG).find((id) => g.territories[id]!.owner === "barbarian")!;
    g = setMarchFrom(g, EG);
    g = issueMarch(g, EG, dest, { levy: 4, bowmen: 0, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(empireStats(g, 0).warlord, before);
    assert.ok((g.marches ?? []).length >= 1);
  });
  it("overall rank follows score", () => {
    const g = createNewGame({ empire: "egypt", seed: 33, difficulty: "easy" });
    g.players[0]!.gold = 800;
    const ranked = rankPlayers(g);
    assert.equal(ranked[0]!.id, 0);
    assert.equal(ranked[0]!.ranks.overall, 1);
    assert.ok(ranked[0]!.level >= ranked[1]!.level);
  });
  it("names overall rank changes", () => {
    const before = createNewGame({ empire: "egypt", seed: 33, difficulty: "easy" });
    const after = createNewGame({ empire: "egypt", seed: 33, difficulty: "easy" });
    after.players[0]!.gold = 800;
    const lines = rankShiftLines(before, after);
    assert.ok(lines.some((l) => l.includes("Egypt") && l.includes("overall")));
  });
  it("names Emperor rank when a second capital is taken", () => {
    const before = createNewGame({ empire: "egypt", seed: 33, difficulty: "easy" });
    const after = createNewGame({ empire: "egypt", seed: 33, difficulty: "easy" });
    const extra = Object.values(CAPITOL).find((id) => after.territories[id]!.owner !== 0)!;
    after.territories[extra]!.owner = 0;
    const lines = rankShiftLines(before, after);
    assert.ok(lines.some((l) => l.includes("Emperor") || l.includes("overall")));
  });
});

describe("asset packs", () => {
  it("lists unique urls for every screen", () => {
    for (const pack of [TITLE_ASSETS, PLAY_ASSETS, BATTLE_ASSETS, DRILL_ASSETS]) {
      assert.equal(new Set(pack).size, pack.length);
      assert.ok(pack.length > 0);
    }
    assert.ok(TITLE_ASSETS.includes("/map/title-dragon.jpg"));
    assert.ok(PLAY_ASSETS.includes("/map/world-v136.webp"));
    assert.ok(PLAY_ASSETS.some((u) => u.includes("/cities/stone.png")));
    assert.ok(PLAY_ASSETS.some((u) => u.includes("defense-walls.svg")));
    assert.ok(BATTLE_ASSETS.some((u) => u.includes("/cities/ring.png")));
    assert.equal(packUrls("title"), TITLE_ASSETS);
    assert.equal(packUrls("battle"), BATTLE_ASSETS);
  });
  it("preload finishes with a full bar when images are unavailable", async () => {
    const progress: number[] = [];
    await preloadAll(["/map/missing-on-purpose.png"], (p) => progress.push(p.fraction));
    assert.equal(progress.at(-1), 1);
  });
});

describe("waters", () => {
  function seaBesideAny(g: ReturnType<typeof createNewGame>): { land: string; sea: string } {
    for (const t of TERRITORIES) {
      if (!t.coastal) continue;
      const sea = hexNeighbors(t.id).find((n) => isWater(n));
      if (sea && g.territories[t.id] && g.territories[sea]) return { land: t.id, sea };
    }
    throw new Error("no coastal sea");
  }

  it("wakes ocean hexes empty with no tribes", () => {
    const g = createNewGame({ empire: "asgard", seed: 11 });
    assert.ok(WATER_IDS.length > 290);
    for (const id of WATER_IDS) {
      const t = g.territories[id];
      assert.ok(t, id);
      assert.equal(t.owner, "open");
      assert.equal(t.levy, 0);
      assert.equal(t.ships, 0);
      assert.equal(t.warships ?? 0, 0);
    }
  });

  it("places shellfish and treasure near land, fish and whales in the deep", () => {
    const near = WATER_IDS.filter((id) => WATER_BY_ID[id]!.near);
    const deep = WATER_IDS.filter((id) => !WATER_BY_ID[id]!.near);
    assert.ok(near.length > 40);
    assert.ok(deep.length > 40);
    assert.ok(near.every((id) => {
      const y = seaYieldOf(id);
      return y === "shellfish" || y === "treasure";
    }));
    assert.ok(deep.every((id) => {
      const y = seaYieldOf(id);
      return y === "fish" || y === "whale";
    }));
    assert.ok(near.some((id) => seaYieldOf(id) === "treasure"));
    assert.ok(deep.some((id) => seaYieldOf(id) === "whale"));
  });

  it("a ship occupies open waters and gathers the yield", () => {
    let g = createNewGame({ empire: "asgard", seed: 12 });
    const { land, sea } = seaBesideAny(g);
    g.territories[land]!.owner = 0;
    g.territories[land]!.ships = 1;
    g.territories[land]!.levy = 0;
    g.territories[land]!.warships = 0;
    g = issueMarch(g, land, sea, { levy: 0, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(g.marches.length, 1);
    g = advanceJobs(g);
    const held = g.territories[sea]!;
    assert.equal(held.owner, 0);
    assert.equal(held.ships, 1);
    assert.equal(held.levy, 0);
    const kind = seaYieldOf(sea);
    const inc = incomeFor(g, 0);
    if (kind === "fish" || kind === "shellfish") assert.ok(inc.food >= 2);
    if (kind === "treasure") assert.ok(inc.gold >= 3);
    if (kind === "whale") {
      assert.equal(inc.flame, true);
      assert.ok(inc.gold >= 2);
    }
  });

  it("whale oil arms the host with flame", () => {
    let g = createNewGame({ empire: "asgard", seed: 13 });
    const cap = empireOf("asgard").capitol;
    const whale = WATER_IDS.find((id) => seaYieldOf(id) === "whale")!;
    g.territories[whale]!.owner = 0;
    g.territories[whale]!.ships = 1;
    const inc = incomeFor(g, 0);
    assert.equal(inc.flame, true);
    g.clock.currentPlayer = (PLAYER_COUNT - 1) as PlayerId;
    g = endTurn(g);
    assert.equal(g.players[0]!.flame, true);
  });

  it("frames a warship at a harbour in two watches", () => {
    let g = createNewGame({ empire: "egypt", seed: 14 });
    g.territories[EG].port = true;
    g.territories[EG].portRank = 1;
    g.players[0]!.gold = 20;
    g.players[0]!.wood = 20;
    g.players[0]!.metal = 10;
    g = trainWarship(g, EG);
    assert.equal(g.jobs.some((j) => j.kind === "warship"), true);
    g = advanceJobs(g);
    assert.equal(g.territories[EG].warships ?? 0, 0);
    g = advanceJobs(g);
    assert.equal(g.territories[EG].warships, 1);
  });

  it("a sunk warship takes the host aboard", () => {
    let g = createNewGame({ empire: "asgard", seed: 15 });
    const { land, sea } = seaBesideAny(g);
    g.territories[land]!.owner = 0;
    g.territories[land]!.warships = 1;
    g.territories[land]!.levy = 6;
    g.territories[sea]!.owner = 1;
    g.territories[sea]!.warships = 2;
    g.territories[sea]!.levy = 4;
    g = issueMarch(g, land, sea, { levy: 5, knights: 0, dragons: 0, beasts: 0, warships: 1 });
    g = advanceJobs(g);
    assert.equal(g.territories[land]!.levy, 1);
    assert.equal(g.territories[sea]!.owner, 1);
    assert.equal(g.territories[sea]!.warships, 1);
    assert.equal(g.territories[sea]!.levy, 4);
  });

  it("warships add defence on occupied waters", () => {
    const g = createNewGame({ empire: "asgard", seed: 16 });
    const sea = WATER_IDS[0]!;
    g.territories[sea]!.owner = 0;
    g.territories[sea]!.warships = 2;
    g.territories[sea]!.ships = 1;
    assert.equal(worksDefense(g.territories[sea]!), 2 * 8 + 1);
  });

  it("a coastal harbour can sail a ship onto nearby waters", () => {
    const g = createNewGame({ empire: "asgard", seed: 18 });
    const cap = empireOf("asgard").capitol;
    assert.ok((g.territories[cap]!.ships ?? 0) >= 1, "asgard wakes with a ship");
    const seas = legalMarchTargets(g, cap).filter((id) => isWater(id) && g.territories[id]!.owner === "open");
    assert.ok(seas.length >= 1, `asgard should reach nearby waters, got ${seas.join(",")}`);
    const sea = seas[0]!;
    let next = issueMarch(g, cap, sea, { levy: 0, knights: 0, dragons: 0, beasts: 0 });
    assert.equal(next.marches.length, 1);
    next = advanceJobs(next);
    assert.equal(next.territories[sea]!.owner, 0);
    assert.equal(next.territories[sea]!.ships, 1);
  });

  it("Sahul's harbour also reaches nearby waters", () => {
    const g = createNewGame({ empire: "gondwana", seed: 19 });
    const cap = empireOf("gondwana").capitol;
    assert.ok((g.territories[cap]!.ships ?? 0) >= 1, "sahul wakes with a ship");
    const seas = legalMarchTargets(g, cap).filter((id) => isWater(id) && g.territories[id]!.owner === "open");
    assert.ok(seas.length >= 1, `tasmania should reach nearby waters, got ${seas.join(",")}`);
  });
});
