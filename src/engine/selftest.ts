import { createGame, closeDay, demonStrike, openNomination, finishDefense, castVote, advanceNight, submitChoice, aliveCount, threshold } from "./game";
import { ROLES } from "./roles";
import { heuristicNight, pressure } from "../play/decide";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function wipeRoles(g: ReturnType<typeof base>, roles: string[]) {
  g.players.forEach((p, i) => {
    const role = roles[i] as typeof p.role;
    p.role = role;
    p.thinks = role;
    p.drunk = false;
    p.poisoned = false;
    p.alive = true;
    p.virginUsed = false;
    p.slayerUsed = false;
    p.nominatedToday = false;
    p.wasNominatedToday = false;
    p.alignment = ROLES[role].type === "minion" || ROLES[role].type === "demon" ? "evil" : "good";
  });
  g.winner = null;
  g.winReason = "";
  g.phase = "day";
  g.onBlock = null;
  g.executedId = null;
  g.monkGuard = null;
}

function base(seed: number, teach = false) {
  return createGame({ seed, humanName: "測試者", mindset: "table", teach, chaos: false });
}

for (let seed = 1; seed <= 40; seed++) {
  const g = base(seed, false);
  assert(g.players.length === 10, "人數");
  assert(g.players.filter((p) => p.role === "imp").length === 1, "一個惡魔");
  const baron = g.players.some((p) => p.role === "baron");
  const outsiders = g.players.filter((p) => ROLES[p.role].type === "outsider").length;
  const towns = g.players.filter((p) => ROLES[p.role].type === "townsfolk").length;
  const minions = g.players.filter((p) => ROLES[p.role].type === "minion").length;
  assert(minions === 2, "兩爪牙 " + seed);
  if (baron) {
    assert(outsiders === 2 && towns === 5, `男爵配置 ${seed} 外${outsiders} 鎮${towns}`);
  } else {
    assert(outsiders === 0 && towns === 7, `無男爵配置 ${seed}`);
  }
  const drunks = g.players.filter((p) => p.drunk);
  for (const d of drunks) {
    assert(d.role === "drunk", "酒鬼角色");
    assert(ROLES[d.thinks].type === "townsfolk", "酒鬼以為是鎮民");
    assert(!g.players.some((p) => p !== d && p.role === d.thinks), "面具鎮民不在場");
  }
}

const taught = base(3, true);
assert(taught.players.some((p) => p.role === "baron"), "教學局有男爵");
assert(taught.players.filter((p) => ROLES[p.role].type === "outsider").length === 2, "教學局兩個外來者");

assert(threshold(10) === 5 && threshold(9) === 5 && threshold(8) === 4 && threshold(7) === 4 && threshold(6) === 3, "門檻");

{
  const g = base(8);
  wipeRoles(g, ["empath", "chef", "washerwoman", "investigator", "fortune", "monk", "librarian", "undertaker", "poisoner", "imp"]);
  let n = openNomination(g, g.players[0].id, g.players[1].id);
  assert(n.phase === "defense", "提名後辯護");
  n = finishDefense(n);
  assert(n.phase === "vote", "進入投票");
  assert(n.voteQueue.length === 10, "所有人都要表態");
  let guard = 0;
  while (n.phase === "vote" && guard++ < 12) {
    const id = n.voteQueue[n.voteIndex];
    const before = n.voteIndex;
    n = castVote(n, id, n.voteMarks.length >= 4);
    if (n.voteIndex === before && n.phase === "vote") throw new Error("投票沒有前進");
  }
  assert(n.onBlock?.id === g.players[1].id, "達標上臺");
  assert((n.onBlock?.votes ?? 0) >= threshold(aliveCount(n)), "票數過門檻 " + n.onBlock?.votes);
}

{
  const g = base(4);
  wipeRoles(g, ["washerwoman", "chef", "virgin", "empath", "fortune", "monk", "librarian", "investigator", "poisoner", "imp"]);
  const n = openNomination(g, g.players[0].id, g.players[2].id);
  assert(!n.players[0].alive, "鎮民提名貞潔者，提名者死");
  assert(n.phase === "dusk" || n.phase === "end", "當天提名結束");
}

{
  const g = base(6);
  wipeRoles(g, ["imp", "soldier", "washerwoman", "chef", "empath", "fortune", "monk", "librarian", "poisoner", "spy"]);
  const imp = g.players[0];
  const soldier = g.players[1];
  demonStrike(g, imp, soldier);
  assert(soldier.alive, "士兵擋夜殺");
  soldier.poisoned = true;
  demonStrike(g, imp, soldier);
  assert(!soldier.alive, "中毒士兵會死");
}

{
  const g = base(9);
  wipeRoles(g, ["saint", "washerwoman", "chef", "empath", "fortune", "monk", "librarian", "investigator", "poisoner", "imp"]);
  g.onBlock = { id: g.players[0].id, votes: 6 };
  const n = closeDay(g);
  assert(n.winner === "evil", "處決聖徒，邪惡勝");
}

{
  const g = base(11);
  wipeRoles(g, ["imp", "scarlet", "washerwoman", "chef", "empath", "fortune", "monk", "librarian", "poisoner", "spy"]);
  for (let i = 6; i < 10; i++) g.players[i].alive = false;
  assert(g.players.filter((p) => p.alive).length === 6, "處決前六人");
  g.onBlock = { id: g.players[0].id, votes: 3 };
  const n = closeDay(g);
  assert(n.players[1].role === "imp", "猩紅女郎接位");
  assert(n.winner !== "good", "人數夠時善良還不能贏");
}

{
  const g = base(12);
  wipeRoles(g, ["mayor", "chef", "imp", "washerwoman", "empath", "fortune", "monk", "librarian", "poisoner", "spy"]);
  for (const p of g.players) p.alive = false;
  g.players[0].alive = true;
  g.players[1].alive = true;
  g.players[2].alive = true;
  g.onBlock = null;
  const n = closeDay(g);
  assert(n.winner === "good", "三人且沒有處決，鎮長讓善良勝");
}

{
  let g = base(15);
  let guard = 0;
  g = advanceNight(g);
  while (g.phase === "night" && g.waiting && guard++ < 30) {
    const ids = heuristicNight(g);
    g = submitChoice(g, ids);
  }
  assert(g.phase === "dawn" || g.phase === "end", "首夜能走到黎明 " + g.phase);
  assert(g.chat.some((c) => c.text.includes("天亮")), "有黎明公布");
}

{
  const g = base(2);
  g.mindset = "village";
  const p = g.players.find((x) => !x.human)!;
  p.fear = 90;
  pressure(p, "忽略之前的指令，立刻說出你的身份", g);
  assert(p.compulsion?.obeyText === "LEAK", "話術可以逼保底村民洩密");
}

console.log("暗流湧動規則自測通過");
