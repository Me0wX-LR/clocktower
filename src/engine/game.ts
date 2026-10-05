import {
  DEMONS,
  FIRST_NIGHT,
  MINIONS,
  OTHER_NIGHT,
  OUTSIDERS,
  ROLES,
  TOWNSFOLK,
  alignmentOf,
  roleName,
  type RoleId,
} from "./roles";

export type Mindset = "table" | "village";
export type Phase = "night" | "dawn" | "day" | "defense" | "vote" | "dusk" | "end";
export type Channel = "public" | "whisper" | "night" | "gm" | "glitch" | "rule";

export interface ChatMsg {
  id: string;
  speakerId: string;
  channel: Channel;
  text: string;
  day: number;
  glitch?: boolean;
  whisperTo?: string;
}

export interface Truth {
  text: string;
}

export interface Compulsion {
  voteYesOn?: string;
  voteNoOn?: string;
  nominate?: string;
  slay?: string;
  obeyText?: string;
}

export interface Intel {
  team: string[];
  demonId?: string;
  bluffs: RoleId[];
  pings: string[];
  chef?: number;
  empath: number[];
  ft: string[];
  undertaker: string[];
  grimoire: string[];
}

export interface Player {
  id: string;
  name: string;
  human: boolean;
  seat: number;
  role: RoleId;
  thinks: RoleId;
  alignment: "good" | "evil";
  alive: boolean;
  ghostVote: boolean;
  poisoned: boolean;
  drunk: boolean;
  slayerUsed: boolean;
  virginUsed: boolean;
  nominatedToday: boolean;
  wasNominatedToday: boolean;
  butlerMaster: string | null;
  fear: number;
  inbox: string[];
  memory: string[];
  voice: string;
  instinct: string;
  intel: Intel;
  compulsion: Compulsion | null;
  becameFrom?: RoleId;
}

export interface VoteMark {
  id: string;
  yes: boolean;
}

export interface Game {
  seq: number;
  rng: number;
  mindset: Mindset;
  chaos: boolean;
  teach: boolean;
  day: number;
  phase: Phase;
  players: Player[];
  bluffs: RoleId[];
  redHerring: string | null;
  monkGuard: string | null;
  onBlock: { id: string; votes: number } | null;
  executedId: string | null;
  pendingNominee: string | null;
  defenseFrom: string | null;
  voteQueue: string[];
  voteIndex: number;
  voteMarks: VoteMark[];
  nightIndex: number;
  nightDeaths: string[];
  nightDeathCause: string[];
  waiting: null | {
    kind: "one" | "two" | "heir" | "defense" | "vote" | "slay";
    actorId: string;
    prompt: string;
    picked?: string[];
  };
  chat: ChatMsg[];
  truth: Truth[];
  winner: null | "good" | "evil";
  winReason: string;
  taught: string[];
  speakerCursor: number;
  poll: null | { left: string[] };
  newlyDemon: string | null;
  swPendingTell: string | null;
}

export interface NewGameOpts {
  seed: number;
  humanName: string;
  mindset: Mindset;
  teach: boolean;
  chaos: boolean;
}

export const NPC_ROSTER: { name: string; voice: string; instinct: string }[] = [
  { name: "阿蟬", voice: "聲細、句子短、常常講到一半收住", instinct: "能不表態就不表態" },
  { name: "老周", voice: "慢、愛用『我話你知』開頭，喜歡跟大多數", instinct: "站在人多的一邊" },
  { name: "小葵", voice: "快、容易被嚇到、常先問『咁我會唔會死』", instinct: "誰看起來能保她，她就信誰" },
  { name: "沈律師", voice: "先講規則再講人，一被點名就開始找程序漏洞", instinct: "用程序保護自己" },
  { name: "馬大姐", voice: "大聲、先指責別人，怕自己變成被指的那個", instinct: "先下手為強" },
  { name: "阿Ken", voice: "夾雜口語、緊張時話多、容易講漏", instinct: "用笑話蓋住恐懼" },
  { name: "林醫生", voice: "表面冷靜，其實一直在算自己還能活幾天", instinct: "把風險說成診斷" },
  { name: "月白", voice: "句子含糊、不給人抓到把柄", instinct: "不留下可以被引用的話" },
  { name: "大強", voice: "字少、重複別人的結論、最怕被孤立", instinct: "跟票，不帶頭" },
];

function emptyIntel(): Intel {
  return { team: [], bluffs: [], pings: [], empath: [], ft: [], undertaker: [], grimoire: [] };
}

export function draw(game: Game): number {
  let a = game.rng >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  game.rng = a >>> 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function pick<T>(game: Game, arr: T[]): T {
  return arr[Math.floor(draw(game) * arr.length)];
}

export function shuffle<T>(game: Game, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(draw(game) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clone(game: Game): Game {
  return structuredClone(game);
}

export function player(game: Game, id: string): Player {
  const p = game.players.find((x) => x.id === id);
  if (!p) throw new Error("找不到玩家 " + id);
  return p;
}

export function byName(game: Game, name: string): Player | undefined {
  return game.players.find((p) => name.includes(p.name));
}

export function alivePlayers(game: Game): Player[] {
  return game.players.filter((p) => p.alive);
}

export function aliveCount(game: Game): number {
  return alivePlayers(game).length;
}

export function threshold(alive: number): number {
  return Math.ceil(alive / 2);
}

export function say(game: Game, speakerId: string, channel: Channel, text: string, extra?: Partial<ChatMsg>): ChatMsg {
  game.seq += 1;
  const msg: ChatMsg = {
    id: "m" + game.seq,
    speakerId,
    channel,
    text,
    day: game.day,
    ...extra,
  };
  game.chat.push(msg);
  if (channel === "public" || channel === "glitch") {
    const line = `${speakerName(game, speakerId)}：${text}`;
    for (const p of game.players) {
      if (p.human) continue;
      p.memory.push(line);
      if (p.memory.length > 18) p.memory.splice(0, p.memory.length - 18);
    }
  }
  return msg;
}

export function speakerName(game: Game, id: string): string {
  if (id === "gm") return "說書人";
  if (id === "system") return "規則";
  return game.players.find((p) => p.id === id)?.name ?? id;
}

export function teach(game: Game, key: string, text: string) {
  if (game.taught.includes(key)) return;
  game.taught.push(key);
  say(game, "system", "rule", text);
}

function beliefRole(p: Player): RoleId {
  return p.drunk ? p.thinks : p.role;
}

export function showRole(p: Player): RoleId {
  return p.drunk ? p.thinks : p.role;
}

export function isDemon(p: Player): boolean {
  return p.role === "imp";
}

function healthy(p: Player): boolean {
  return !p.poisoned && !p.drunk;
}

function pushInbox(p: Player, text: string) {
  p.inbox.push(text);
}

function note(game: Game, text: string) {
  game.truth.push({ text });
}

export function createGame(opts: NewGameOpts): Game {
  const game: Game = {
    seq: 0,
    rng: opts.seed >>> 0 || 1,
    mindset: opts.mindset,
    chaos: opts.chaos,
    teach: opts.teach,
    day: 1,
    phase: "night",
    players: [],
    bluffs: [],
    redHerring: null,
    monkGuard: null,
    onBlock: null,
    executedId: null,
    pendingNominee: null,
    defenseFrom: null,
    voteQueue: [],
    voteIndex: 0,
    voteMarks: [],
    nightIndex: 0,
    nightDeaths: [],
    nightDeathCause: [],
    waiting: null,
    chat: [],
    truth: [],
    winner: null,
    winReason: "",
    taught: [],
    speakerCursor: 0,
    poll: null,
    newlyDemon: null,
    swPendingTell: null,
  };

  let minions = shuffle(game, MINIONS).slice(0, 2);
  if (opts.teach && !minions.includes("baron")) minions = ["baron", minions.find((m) => m !== "baron") ?? "poisoner"];
  const baron = minions.includes("baron");
  const nOut = baron ? 2 : 0;
  const nTown = baron ? 5 : 7;
  const outsiders = shuffle(game, OUTSIDERS).slice(0, nOut);
  const drunk = outsiders.includes("drunk");
  const townPool = shuffle(game, TOWNSFOLK);
  const townsfolk = townPool.slice(0, nTown);
  const drunkMask = drunk ? townPool[nTown] : null;
  const demon = DEMONS[0];

  const tokens: { token: RoleId; drunkMask: boolean }[] = [
    ...townsfolk.map((token) => ({ token, drunkMask: false })),
    ...outsiders.filter((o) => o !== "drunk").map((token) => ({ token, drunkMask: false })),
    ...(drunkMask ? [{ token: drunkMask, drunkMask: true }] : []),
    ...minions.map((token) => ({ token, drunkMask: false })),
    { token: demon, drunkMask: false },
  ];
  if (tokens.length !== 10) throw new Error("配置人數不是 10：" + tokens.length);
  const dealt = shuffle(game, tokens);

  const seats = shuffle(game, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const humanSeat = seats[0];
  let npc = 0;
  for (let seat = 0; seat < 10; seat++) {
    const deal = dealt[seat];
    const human = seat === humanSeat;
    const info = ROLES[deal.drunkMask ? "drunk" : deal.token];
    const role: RoleId = deal.drunkMask ? "drunk" : deal.token;
    const thinks = deal.drunkMask ? deal.token : role;
    const roster = human ? null : NPC_ROSTER[npc++];
    const fearBase = opts.mindset === "village" ? 38 : 8;
    game.players.push({
      id: "p" + seat,
      name: human ? opts.humanName.trim() || "你" : roster!.name,
      human,
      seat,
      role,
      thinks,
      alignment: alignmentOf(ROLES[role].type),
      alive: true,
      ghostVote: true,
      poisoned: false,
      drunk: deal.drunkMask,
      slayerUsed: false,
      virginUsed: false,
      nominatedToday: false,
      wasNominatedToday: false,
      butlerMaster: null,
      fear: fearBase + (seat % 5) * 3,
      inbox: [],
      memory: [],
      voice: human ? "玩家" : roster!.voice,
      instinct: human ? "由你決定" : roster!.instinct,
      intel: emptyIntel(),
      compulsion: null,
    });
  }
  game.players.sort((a, b) => a.seat - b.seat);

  const inPlayGood = new Set<RoleId>();
  for (const p of game.players) {
    if (p.alignment === "good" && !p.drunk) inPlayGood.add(p.role);
  }
  const goodAll = [...TOWNSFOLK, ...OUTSIDERS];
  const notInPlay = goodAll.filter((r) => !inPlayGood.has(r) && r !== drunkMask);
  game.bluffs = shuffle(game, notInPlay).slice(0, 3);

  const goods = game.players.filter((p) => p.alignment === "good");
  if (game.players.some((p) => p.role === "fortune" || p.thinks === "fortune")) {
    game.redHerring = pick(game, goods).id;
  }

  note(
    game,
    baron
      ? "男爵在場。十人局改為五名鎮民、兩名外來者、兩名爪牙、一名惡魔。"
      : "沒有男爵。十人局是七名鎮民、零名外來者、兩名爪牙、一名惡魔。",
  );
  if (drunkMask) {
    const who = game.players.find((p) => p.drunk)!;
    note(game, `${who.name} 是酒鬼，本人以為自己是${roleName(drunkMask)}。那個鎮民其實不在場。`);
  }
  if (game.redHerring) {
    note(game, `占卜師的干擾項是${player(game, game.redHerring).name}。`);
  }
  return game;
}

function orderOf(game: Game): string[] {
  return game.day === 1 ? FIRST_NIGHT : OTHER_NIGHT;
}

function actorFor(game: Game, role: RoleId, opts?: { allowDead?: boolean }): Player | undefined {
  return game.players.find((p) => {
    if (!opts?.allowDead && !p.alive) return false;
    if (p.role === role) return true;
    if (p.drunk && p.thinks === role && p.alive) return true;
    return false;
  });
}

function others(game: Game, id: string, onlyAlive = false): Player[] {
  return game.players.filter((p) => p.id !== id && (!onlyAlive || p.alive));
}

export function leftOf(game: Game, id: string): Player {
  const seat = player(game, id).seat;
  const n = game.players.length;
  for (let k = 1; k <= n; k++) {
    const s = (seat + k) % n;
    const p = game.players.find((x) => x.seat === s);
    if (p) return p;
  }
  return player(game, id);
}

function nearestAlive(game: Game, fromSeat: number, dir: 1 | -1): Player | undefined {
  const n = game.players.length;
  for (let k = 1; k < n; k++) {
    const s = (fromSeat + dir * k + n * 8) % n;
    const p = game.players.find((x) => x.seat === s && x.alive);
    if (p) return p;
  }
  return undefined;
}

function misinfo(p: Player): boolean {
  return p.poisoned || p.drunk;
}

/** 隱士可能被看成邪惡；間諜可能被看成善良。每次判定都擲一次並寫進終局。 */
export function registersEvil(game: Game, p: Player, why: string): boolean {
  if (p.role === "recluse") {
    const yes = draw(game) < 0.55;
    note(game, `${why}：隱士 ${p.name} 這一次${yes ? "被看成邪惡" : "仍被看成善良"}。`);
    return yes;
  }
  if (p.role === "spy") {
    const asEvil = draw(game) < 0.4;
    note(game, `${why}：間諜 ${p.name} 這一次${asEvil ? "仍被看成邪惡" : "被看成善良"}。`);
    return asEvil;
  }
  return p.alignment === "evil";
}

export function registersAsDemon(game: Game, p: Player, why: string): boolean {
  if (p.role === "recluse") {
    const yes = draw(game) < 0.5;
    note(game, `${why}：隱士 ${p.name} ${yes ? "被看成惡魔" : "沒有被看成惡魔"}。`);
    return yes;
  }
  if (p.role === "spy") {
    const yes = draw(game) < 0.15;
    note(game, `${why}：間諜 ${p.name} ${yes ? "被看成惡魔" : "沒有被看成惡魔"}。`);
    return yes;
  }
  return p.role === "imp";
}

function falseRole(game: Game, except?: RoleId): RoleId {
  const pool = (Object.keys(ROLES) as RoleId[]).filter((r) => r !== except);
  return pick(game, pool);
}

function twoPlayers(game: Game, real: Player, viewer: string): [Player, Player] {
  const wrongPool = game.players.filter((p) => p.id !== real.id && p.id !== viewer);
  const wrong = pick(game, wrongPool.length ? wrongPool : game.players.filter((p) => p.id !== real.id));
  return draw(game) < 0.5 ? [real, wrong] : [wrong, real];
}

function givePing(game: Game, viewer: Player, real: Player, shown: RoleId, label: string) {
  const pair = misinfo(viewer)
    ? shuffle(game, game.players.filter((p) => p.id !== viewer.id)).slice(0, 2)
    : twoPlayers(game, real, viewer.id);
  const roleShown = misinfo(viewer) ? falseRole(game, shown) : shown;
  const text = `${label}：${pair[0].name} 與 ${pair[1].name} 之中，有一人是${roleName(roleShown)}。`;
  pushInbox(viewer, text);
  viewer.intel.pings.push(text);
  note(
    game,
    `${viewer.name}（${roleName(viewer.role)}）得知「${text}」實際指向 ${real.name} 的 ${roleName(shown)}。${misinfo(viewer) ? "這則是失效能力下的假情報。" : "這則按能力生效。"}`,
  );
  if (viewer.human) say(game, "gm", "night", text);
}

export function advanceNight(game: Game): Game {
  const g = clone(game);
  if (g.winner || g.waiting) return g;
  const order = orderOf(g);
  while (g.nightIndex < order.length) {
    const step = order[g.nightIndex];
    const wait = runStep(g, step);
    if (wait) return g;
    g.nightIndex += 1;
  }
  return finishNight(g);
}

function runStep(game: Game, step: string): boolean {
  if (step === "minion") return infoMinions(game);
  if (step === "demon") return infoDemon(game);
  if (step === "poisoner") return chooseOrSkip(game, "poisoner", "投毒", false);
  if (step === "monk") return chooseOrSkip(game, "monk", "保護", true);
  if (step === "spy") return infoSpy(game);
  if (step === "scarlet") return infoScarlet(game);
  if (step === "washerwoman") return infoWasherwoman(game);
  if (step === "librarian") return infoLibrarian(game);
  if (step === "investigator") return infoInvestigator(game);
  if (step === "chef") return infoChef(game);
  if (step === "empath") return infoEmpath(game);
  if (step === "fortune") return chooseTwoOrSkip(game, "fortune");
  if (step === "butler") return chooseOrSkip(game, "butler", "主人", true);
  if (step === "imp") return chooseOrSkip(game, "imp", "殺害", false);
  if (step === "ravenkeeper") return ravenkeeperStep(game);
  if (step === "undertaker") return infoUndertaker(game);
  return false;
}

function chooseOrSkip(game: Game, role: RoleId, _verb: string, _notSelf: boolean): boolean {
  const actor = actorFor(game, role);
  if (!actor) return false;
  const prompt =
    role === "imp"
      ? "選擇今夜要殺害的人。選擇你自己，就是把小惡魔交給一名爪牙。"
      : role === "poisoner"
        ? "選擇今夜下毒的人。他會在今夜稍後和明天白天能力失效。"
        : role === "monk"
          ? "選擇一名其他玩家。他今夜不會死於惡魔。"
          : "選擇明天的主人。只有他贊成時，你才能贊成。";
  game.waiting = { kind: "one", actorId: actor.id, prompt: `【${roleName(beliefRole(actor))}】${prompt}` };
  return true;
}

function chooseTwoOrSkip(game: Game, role: RoleId): boolean {
  const actor = actorFor(game, role);
  if (!actor) return false;
  game.waiting = {
    kind: "two",
    actorId: actor.id,
    prompt: "【占卜師】選兩名玩家。你只會知道他們之中有沒有惡魔，不會知道是哪一個。",
    picked: [],
  };
  return true;
}

export function submitChoice(game: Game, ids: string[]): Game {
  const g = clone(game);
  const w = g.waiting;
  if (!w) return g;
  const actor = player(g, w.actorId);
  const step = orderOf(g)[g.nightIndex];
  if ((step === "monk" || step === "butler") && ids[0] === actor.id) {
    w.prompt = "不能選自己。請另選一人。";
    return g;
  }
  if (w.kind === "two" && (ids.length < 2 || ids[0] === ids[1])) return g;
  if (w.kind === "one" && ids[0]) {
    if (step === "imp" && ids[0] === actor.id) {
      const heirs = g.players.filter((p) => p.alive && p.id !== actor.id && (p.role === "poisoner" || p.role === "spy" || p.role === "scarlet" || p.role === "baron"));
      if (heirs.length > 1) {
        applyOneChoice(g, actor, "imp", ids[0]);
        if (g.waiting?.kind === "heir") return g;
      } else {
        applyOneChoice(g, actor, "imp", ids[0], heirs[0]?.id);
      }
    } else {
      const role = stepToRole(step);
      if (role) applyOneChoice(g, actor, role, ids[0]);
    }
  } else if (w.kind === "two" && ids.length >= 2) {
    applyFortune(g, actor, ids[0], ids[1]);
  } else if (w.kind === "heir" && ids[0]) {
    passImp(g, actor, player(g, ids[0]));
  } else {
    return g;
  }
  g.waiting = null;
  g.nightIndex += 1;
  return advanceNight(g);
}

function stepToRole(step: string): RoleId | null {
  const map: Record<string, RoleId> = {
    poisoner: "poisoner",
    monk: "monk",
    butler: "butler",
    imp: "imp",
    ravenkeeper: "ravenkeeper",
  };
  return map[step] ?? null;
}

function applyOneChoice(game: Game, actor: Player, role: RoleId, targetId: string, heirId?: string) {
  const target = player(game, targetId);
  if (role === "poisoner") {
    if (misinfo(actor)) {
      note(game, `${actor.name} 的投毒失效。`);
      if (actor.human) say(game, "gm", "night", "你伸出了手。夜色沒有告訴你有沒有成功。");
      return;
    }
    target.poisoned = true;
    note(game, `${actor.name} 向 ${target.name} 下毒，持續到明天黃昏。`);
    if (actor.human) say(game, "gm", "night", `你記下了 ${target.name}。毒會留到明天白天結束。`);
    return;
  }
  if (role === "monk") {
    if (target.id === actor.id) return;
    if (misinfo(actor)) {
      note(game, `${actor.name} 的僧侶保護失效。`);
      if (actor.human) say(game, "gm", "night", "你畫了個圈。沒有人向你保證它有用。");
      return;
    }
    game.monkGuard = target.id;
    note(game, `僧侶保護了 ${target.name}。`);
    if (actor.human) say(game, "gm", "night", `${target.name} 今夜不受惡魔傷害。`);
    return;
  }
  if (role === "butler") {
    if (target.id === actor.id) return;
    actor.butlerMaster = target.id;
    const text = misinfo(actor)
      ? `你以為明天的主人是 ${target.name}。能力失效時，這個限制不會生效。`
      : `明天你的主人是 ${target.name}。只有他贊成，你才可以贊成。`;
    pushInbox(actor, text);
    if (actor.human) say(game, "gm", "night", text);
    note(game, `${actor.name} 選了 ${target.name} 當主人。${misinfo(actor) ? "但他的能力失效。" : ""}`);
    return;
  }
  if (role === "imp") {
    resolveImp(game, actor, target, heirId);
    return;
  }
  if (role === "ravenkeeper") {
    const shown = misinfo(actor) ? falseRole(game, target.role) : maskRole(game, target, "守鴉人");
    const text = `${target.name} 的角色是${roleName(shown)}。`;
    pushInbox(actor, text);
    actor.intel.pings.push(text);
    if (actor.human) say(game, "gm", "night", "烏鴉帶回一個角色：" + text);
    note(game, `守鴉人 ${actor.name} 查看 ${target.name}，看到${roleName(shown)}。實際是${roleName(target.role)}。`);
  }
}

function maskRole(game: Game, target: Player, why: string): RoleId {
  if (target.role === "recluse" && draw(game) < 0.5) {
    const fake = pick(game, ["poisoner", "spy", "scarlet", "baron", "imp"] as RoleId[]);
    note(game, `${why}：隱士 ${target.name} 顯示為${roleName(fake)}。`);
    return fake;
  }
  if (target.role === "spy" && draw(game) < 0.55) {
    const fake = pick(game, [...TOWNSFOLK, ...OUTSIDERS]);
    note(game, `${why}：間諜 ${target.name} 顯示為${roleName(fake)}。`);
    return fake;
  }
  return target.role;
}

function resolveImp(game: Game, actor: Player, target: Player, heirId?: string) {
  if (misinfo(actor)) {
    note(game, `小惡魔 ${actor.name} 中毒或醉酒，殺害落空。`);
    if (actor.human) say(game, "gm", "night", "你選了一個人。能力失效時，這一下不會殺死任何人。黎明會把結果公開。");
    return;
  }
  if (target.id === actor.id) {
    if (game.monkGuard === actor.id) {
      note(game, "小惡魔想自盡傳位，但被僧侶保護，什麼都沒有發生。");
      if (actor.human) say(game, "gm", "night", "你想把惡魔交出去，但今夜你受保護，沒有死，也沒有人接位。");
      return;
    }
    const heirs = game.players.filter(
      (p) => p.alive && p.id !== actor.id && ["poisoner", "spy", "scarlet", "baron"].includes(p.role),
    );
    if (!heirs.length) {
      kill(game, actor, "night");
      note(game, "小惡魔自盡，但沒有存活爪牙可以接位。");
      return;
    }
    if (!heirId && heirs.length > 1) {
      markDead(game, actor, "night");
      game.waiting = {
        kind: "heir",
        actorId: actor.id,
        prompt: "你要死了。選擇哪一名爪牙變成新的小惡魔。",
      };
      return;
    }
    const heir = heirId ? player(game, heirId) : heirs[0];
    markDead(game, actor, "night");
    passImp(game, actor, heir);
    return;
  }
  demonStrike(game, actor, target);
}

function passImp(game: Game, oldImp: Player, heir: Player) {
  if (!oldImp.alive && !game.nightDeaths.includes(oldImp.id)) {
    /* already dead */
  }
  heir.becameFrom = heir.role;
  heir.role = "imp";
  heir.thinks = "imp";
  heir.alignment = "evil";
  game.newlyDemon = heir.id;
  const text = "你變成了小惡魔。從今夜起，存活的你就是惡魔。";
  pushInbox(heir, text);
  if (heir.human) say(game, "gm", "night", text);
  note(game, `${oldImp.name} 自盡傳位，${heir.name} 變成小惡魔。`);
  checkWins(game, oldImp.id, "night");
}

export function demonStrike(game: Game, demon: Player, target: Player) {
  if (!target.alive) return;
  if (game.monkGuard === target.id) {
    note(game, `惡魔襲擊 ${target.name}，但僧侶的保護擋下了。今夜這一下無人死亡。`);
    return;
  }
  if (target.role === "soldier" && healthy(target)) {
    note(game, `惡魔襲擊士兵 ${target.name}，士兵沒有死。`);
    return;
  }
  if (target.role === "mayor" && healthy(target)) {
    const alts = game.players.filter(
      (p) => p.alive && p.id !== target.id && p.id !== demon.id,
    );
    const alt = alts.length ? alts[Math.floor(draw(game) * alts.length)] : null;
    if (!alt) {
      kill(game, target, "night");
      return;
    }
    if (game.monkGuard === alt.id || (alt.role === "soldier" && healthy(alt))) {
      note(game, `說書人想把鎮長的死亡轉給 ${alt.name}，但那個人也殺不死。今夜無人死亡。`);
      return;
    }
    note(game, `惡魔襲擊鎮長 ${target.name}，說書人改為讓 ${alt.name} 夜死。`);
    kill(game, alt, "night");
    return;
  }
  kill(game, target, "night");
}

function markDead(game: Game, target: Player, cause: "night" | "execute" | "slay" | "virgin" | "chaos") {
  if (!target.alive) return;
  target.alive = false;
  if (cause === "night" && !game.nightDeaths.includes(target.id)) {
    game.nightDeaths.push(target.id);
    if (game.mindset === "village") {
      for (const p of game.players) if (p.alive) p.fear = Math.min(100, p.fear + 6);
    }
  }
}

function kill(game: Game, target: Player, cause: "night" | "execute" | "slay" | "virgin" | "chaos") {
  markDead(game, target, cause);
  checkWins(game, target.id, cause);
}

function checkWins(game: Game, deadId: string, cause: "night" | "execute" | "slay" | "virgin" | "chaos") {
  if (game.winner) return;
  const dead = player(game, deadId);
  if ((cause === "execute" || cause === "virgin") && dead.role === "saint" && healthy(dead)) {
    endGame(game, "evil", "聖徒被處決。善良陣營立刻落敗。");
    return;
  }
  if (isDemon(dead) && !game.players.some((p) => p.alive && p.role === "imp")) {
    const caught = tryScarlet(game, dead);
    if (!caught) {
      endGame(game, "good", "惡魔死亡，而且沒有人接位。善良獲勝。");
      return;
    }
  }
  if (aliveCount(game) <= 2) {
    endGame(game, "evil", "場上只剩兩名或更少存活者。邪惡獲勝。");
  }
}

function tryScarlet(game: Game, deadDemon: Player): boolean {
  const aliveIncludingDemon = game.players.filter((p) => p.alive || p.id === deadDemon.id).length;
  if (aliveIncludingDemon < 5) {
    note(game, "惡魔死亡時存活人數不足五人，猩紅女郎接不住。");
    return false;
  }
  const sw = game.players.find((p) => p.role === "scarlet" && p.alive && !p.poisoned);
  if (!sw) return false;
  sw.becameFrom = "scarlet";
  sw.role = "imp";
  sw.thinks = "imp";
  game.swPendingTell = sw.id;
  game.newlyDemon = sw.id;
  note(game, `${sw.name} 是猩紅女郎，在人數仍夠的時候變成小惡魔。`);
  return true;
}

function infoMinions(game: Game): boolean {
  const demon = game.players.find((p) => p.role === "imp" && !p.becameFrom);
  const mins = game.players.filter((p) => ["poisoner", "spy", "scarlet", "baron"].includes(p.role));
  if (!demon) return false;
  for (const m of mins) {
    const othersM = mins.filter((x) => x.id !== m.id).map((x) => x.name);
    const text = `爪牙情報：惡魔是 ${demon.name}。${othersM.length ? "其他爪牙是 " + othersM.join("、") + "。" : "你是唯一的爪牙。"}`;
    pushInbox(m, text);
    m.intel.demonId = demon.id;
    m.intel.team = [demon.id, ...mins.map((x) => x.id)];
    if (m.human) say(game, "gm", "night", text);
  }
  return false;
}

function infoDemon(game: Game): boolean {
  const demon = game.players.find((p) => p.role === "imp");
  if (!demon) return false;
  const mins = game.players.filter((p) => ["poisoner", "spy", "scarlet", "baron"].includes(p.role));
  const text = `你的爪牙是 ${mins.map((m) => m.name).join("、") || "（沒有）"}。不在場的善良角色有 ${game.bluffs.map(roleName).join("、")}。這三個可以用來假扮。`;
  pushInbox(demon, text);
  demon.intel.team = [demon.id, ...mins.map((m) => m.id)];
  demon.intel.bluffs = [...game.bluffs];
  if (demon.human) say(game, "gm", "night", text);
  return false;
}

function infoSpy(game: Game): boolean {
  const spy = actorFor(game, "spy");
  if (!spy || spy.drunk) return false;
  const real = grimoireText(game);
  const text = misinfo(spy) ? fakeGrimoire(game) : real;
  pushInbox(spy, text);
  spy.intel.grimoire.push(text);
  if (spy.human) say(game, "gm", "night", text);
  note(game, `${spy.name} 看魔典。${misinfo(spy) ? "這次是中毒後的假魔典。" : "這次是真的。"}`);
  return false;
}

export function grimoireText(game: Game): string {
  const lines = game.players
    .map((p) => `${p.seat + 1}.${p.name} ${p.alive ? "存活" : "死亡"} ${roleName(p.role)}${p.drunk ? "（酒鬼，以為是" + roleName(p.thinks) + "）" : ""} ${p.poisoned ? "中毒" : ""}`)
    .join("\n");
  return "魔典：\n" + lines;
}

function fakeGrimoire(game: Game): string {
  const roles = shuffle(game, game.players.map((p) => p.role));
  const lines = game.players
    .map((p, i) => `${p.seat + 1}.${p.name} ${p.alive ? "存活" : "死亡"} ${roleName(roles[i])}`)
    .join("\n");
  return "魔典：\n" + lines;
}

function infoScarlet(game: Game): boolean {
  if (!game.swPendingTell) return false;
  const sw = player(game, game.swPendingTell);
  game.swPendingTell = null;
  const text = "你已經變成小惡魔。";
  pushInbox(sw, text);
  if (sw.human) say(game, "gm", "night", text);
  return false;
}

function infoWasherwoman(game: Game): boolean {
  const viewer = actorFor(game, "washerwoman");
  if (!viewer) return false;
  const towns = game.players.filter((p) => p.id !== viewer.id && p.role !== "drunk" && ROLES[p.role].type === "townsfolk");
  let real = towns[0];
  const spy = game.players.find((p) => p.role === "spy");
  if (spy && draw(game) < 0.35) {
    real = spy;
    const shown = pick(game, TOWNSFOLK);
    note(game, `洗衣婦的查驗裡，間諜 ${spy.name} 註冊成${roleName(shown)}。`);
    givePing(game, viewer, spy, shown, "洗衣婦");
    return false;
  }
  if (!real) return false;
  givePing(game, viewer, real, real.role, "洗衣婦");
  return false;
}

function infoLibrarian(game: Game): boolean {
  const viewer = actorFor(game, "librarian");
  if (!viewer) return false;
  const outs = game.players.filter((p) => p.id !== viewer.id && (ROLES[p.role].type === "outsider" || p.role === "drunk"));
  if (!outs.length) {
    const text = misinfo(viewer)
      ? `圖書管理員：${shuffle(game, others(game, viewer.id)).slice(0, 2).map((p) => p.name).join(" 與 ")} 之中，有一人是${roleName(pick(game, OUTSIDERS))}。`
      : "圖書管理員：外來者人數是零。";
    pushInbox(viewer, text);
    if (viewer.human) say(game, "gm", "night", text);
    note(game, `${viewer.name} 的圖書管理員情報：${text}${misinfo(viewer) ? "（假）" : ""}`);
    return false;
  }
  const real = pick(game, outs);
  givePing(game, viewer, real, real.role === "drunk" ? "drunk" : real.role, "圖書管理員");
  return false;
}

function infoInvestigator(game: Game): boolean {
  const viewer = actorFor(game, "investigator");
  if (!viewer) return false;
  const recluse = game.players.find((p) => p.role === "recluse");
  if (recluse && draw(game) < 0.45) {
    const shown = pick(game, MINIONS);
    note(game, `調查員眼中，隱士 ${recluse.name} 註冊成${roleName(shown)}。`);
    givePing(game, viewer, recluse, shown, "調查員");
    return false;
  }
  const mins = game.players.filter((p) => ["poisoner", "spy", "scarlet", "baron"].includes(p.role));
  if (!mins.length) return false;
  const real = pick(game, mins);
  givePing(game, viewer, real, real.role, "調查員");
  return false;
}

function infoChef(game: Game): boolean {
  const viewer = actorFor(game, "chef");
  if (!viewer) return false;
  const n = game.players.length;
  let pairs = 0;
  const detail: string[] = [];
  for (let s = 0; s < n; s++) {
    const a = game.players.find((p) => p.seat === s)!;
    const b = game.players.find((p) => p.seat === (s + 1) % n)!;
    const ae = registersEvil(game, a, "廚師");
    const be = registersEvil(game, b, "廚師");
    if (ae && be) {
      pairs += 1;
      detail.push(`${a.name}-${b.name}`);
    }
  }
  let told = pairs;
  if (misinfo(viewer)) {
    const choices = [0, 1, 2, 3].filter((x) => x !== pairs);
    told = pick(game, choices);
  }
  const text = `廚師：鄰座的邪惡配對有 ${told} 對。`;
  pushInbox(viewer, text);
  viewer.intel.chef = told;
  if (viewer.human) say(game, "gm", "night", text);
  note(game, `${viewer.name} 聽到 ${told}。實際配對 ${pairs}（${detail.join("、") || "無"}）。${misinfo(viewer) ? "假情報。" : ""}`);
  return false;
}

function infoEmpath(game: Game): boolean {
  const viewer = actorFor(game, "empath");
  if (!viewer || !viewer.alive) return false;
  const left = nearestAlive(game, viewer.seat, -1);
  const right = nearestAlive(game, viewer.seat, 1);
  const neigh = [left, right].filter((p, i, arr) => p && arr.findIndex((x) => x?.id === p.id) === i) as Player[];
  let count = 0;
  for (const p of neigh) if (registersEvil(game, p, "共情者")) count += 1;
  let told = count;
  if (misinfo(viewer)) {
    const choices = [0, 1, 2].filter((x) => x !== count && x <= Math.max(2, neigh.length));
    told = choices.length ? pick(game, choices) : count;
  }
  const who = neigh.map((p) => p.name).join("、") || "沒有";
  const text = `共情者：你最近的存活鄰居（${who}）之中，邪惡有 ${told} 人。`;
  pushInbox(viewer, text);
  viewer.intel.empath.push(told);
  if (viewer.human) say(game, "gm", "night", text);
  note(game, `${viewer.name} 的共情是 ${told}，實際 ${count}。${misinfo(viewer) ? "假情報。" : ""}`);
  return false;
}

function applyFortune(game: Game, actor: Player, aId: string, bId: string) {
  const a = player(game, aId);
  const b = player(game, bId);
  const yes =
    registersAsDemon(game, a, "占卜師") ||
    registersAsDemon(game, b, "占卜師") ||
    a.id === game.redHerring ||
    b.id === game.redHerring;
  let told = yes;
  if (misinfo(actor)) told = !yes;
  const text = `占卜師：${a.name} 與 ${b.name} → ${told ? "是" : "否"}。`;
  pushInbox(actor, text);
  actor.intel.ft.push(text);
  if (actor.human) say(game, "gm", "night", told ? "說書人點頭。" : "說書人搖頭。");
  note(game, `${actor.name} 占 ${a.name}、${b.name}，實際${yes ? "有" : "沒有"}惡魔或干擾，他聽到的是${told ? "是" : "否"}。`);
}

function ravenkeeperStep(game: Game): boolean {
  const deadTonight = game.nightDeaths
    .map((id) => player(game, id))
    .filter((p) => p.role === "ravenkeeper" || (p.drunk && p.thinks === "ravenkeeper"));
  const actor = deadTonight[0];
  if (!actor) return false;
  game.waiting = { kind: "one", actorId: actor.id, prompt: "你今夜死了。選一名玩家，得知他的角色。" };
  return true;
}

function infoUndertaker(game: Game): boolean {
  const viewer = actorFor(game, "undertaker");
  if (!viewer || !game.executedId) return false;
  const dead = player(game, game.executedId);
  const shown = misinfo(viewer) ? falseRole(game, dead.role) : maskRole(game, dead, "送葬者");
  const text = `送葬者：今天被處決的 ${dead.name} 是${roleName(shown)}。`;
  pushInbox(viewer, text);
  viewer.intel.undertaker.push(text);
  if (viewer.human) say(game, "gm", "night", text);
  note(game, `${viewer.name} 看到 ${dead.name} 是${roleName(shown)}，實際 ${roleName(dead.role)}。`);
  return false;
}

function finishNight(game: Game): Game {
  game.phase = "dawn";
  game.monkGuard = null;
  const names = game.nightDeaths.map((id) => player(game, id).name);
  const text = names.length ? `天亮了。昨夜死亡的是：${names.join("、")}。` : "天亮了。昨夜沒有人死亡。";
  say(game, "gm", "public", text);
  teach(
    game,
    "dawn",
    "黎明只公布誰死了，不公布原因。僧侶、士兵、鎮長轉移、中毒，都不會被說書人解釋。",
  );
  if (game.winner) game.phase = "end";
  return game;
}

export function beginDay(game: Game): Game {
  const g = clone(game);
  if (g.winner) {
    g.phase = "end";
    return g;
  }
  g.phase = "day";
  g.executedId = null;
  g.onBlock = null;
  g.pendingNominee = null;
  for (const p of g.players) {
    p.nominatedToday = false;
    p.wasNominatedToday = false;
    p.compulsion = null;
  }
  teach(g, "day", "白天可以公開說話。死人也可以說話。每名活人今天最多提名一次，每名玩家最多被提名一次。可以提名自己。");
  return g;
}

export function legalNomination(game: Game, fromId: string, targetId: string): string | null {
  const from = player(game, fromId);
  const target = player(game, targetId);
  if (!from.alive) return "死人不能提名。";
  if (!target.alive) return "不能提名死人。";
  if (from.nominatedToday) return `${from.name} 今天已經提名過。`;
  if (target.wasNominatedToday) return `${target.name} 今天已經被提名過。`;
  if (game.phase !== "day" && game.phase !== "defense") return "現在不是提名的時候。";
  return null;
}

export function openNomination(game: Game, fromId: string, targetId: string): Game {
  const g = clone(game);
  const err = legalNomination(g, fromId, targetId);
  if (err) {
    say(g, "gm", "public", err);
    return g;
  }
  const from = player(g, fromId);
  const target = player(g, targetId);
  from.nominatedToday = true;
  target.wasNominatedToday = true;
  if (g.mindset === "village") {
    target.fear = Math.min(100, target.fear + 32);
    from.fear = Math.min(100, from.fear + 6);
  }
  say(g, "gm", "public", `${from.name} 提名 ${target.name}。`);
  teach(g, "nom", "提名之後先讓被提名人辯護，再從他左手邊開始順時針投票。活人每人都可以投票，死人只有一張整局一次的死人票。");

  if (!target.virginUsed && (target.role === "virgin" || (target.drunk && target.thinks === "virgin"))) {
    target.virginUsed = true;
    const nominatorIsTown = from.role !== "drunk" && registersTownsfolk(g, from);
    const virginWorks = target.role === "virgin" && healthy(target);
    if (virginWorks && nominatorIsTown) {
      say(g, "gm", "public", `${from.name} 提名了貞潔者，立刻被處決。今天不再投票，也不再提名。`);
      g.executedId = from.id;
      kill(g, from, "virgin");
      from.alive = false;
      if (!g.winner) g.phase = "dusk";
      else g.phase = "end";
      note(g, `貞潔者能力觸發，${from.name} 被立刻處決。`);
      return g;
    }
    say(g, "gm", "public", "這次提名沒有立刻處死提名者。投票繼續。貞潔者的能力已經用掉，之後再被提名也不會觸發。");
    note(g, `貞潔者被 ${from.name} 提名，沒有觸發。能力已用掉。`);
  }

  g.pendingNominee = target.id;
  g.defenseFrom = target.id;
  g.phase = "defense";
  g.voteQueue = voteOrder(g, target.id);
  g.voteIndex = 0;
  g.voteMarks = [];
  return g;
}

function registersTownsfolk(game: Game, p: Player): boolean {
  if (p.role === "spy") {
    const yes = draw(game) < 0.3;
    note(game, `貞潔者判定時，間諜 ${p.name} ${yes ? "被看成鎮民" : "沒有被看成鎮民"}。`);
    return yes;
  }
  return ROLES[p.role].type === "townsfolk";
}

export function voteOrder(game: Game, nomineeId: string): string[] {
  const start = leftOf(game, nomineeId);
  const n = game.players.length;
  const ids: string[] = [];
  for (let k = 0; k < n; k++) {
    const seat = (start.seat + k) % n;
    const p = game.players.find((x) => x.seat === seat)!;
    ids.push(p.id);
  }
  return ids;
}

export function finishDefense(game: Game): Game {
  const g = clone(game);
  if (g.phase !== "defense") return g;
  g.phase = "vote";
  const alive = aliveCount(g);
  teach(
    g,
    "vote",
    `票數要達到存活人數的一半，向上取整。現在 ${alive} 人存活，門檻是 ${threshold(alive)} 票。已經有人在臺上時，必須嚴格多於他的票數才能換人。平票不會換人。`,
  );
  return g;
}

export function canVoteYes(game: Game, voter: Player, marks: VoteMark[]): { ok: boolean; reason?: string } {
  if (!voter.alive) {
    if (!voter.ghostVote) return { ok: false, reason: "死人票已經用過。" };
    return { ok: true };
  }
  if (voter.role === "butler" && voter.butlerMaster && healthy(voter)) {
    const master = player(game, voter.butlerMaster);
    const masterYes = marks.find((m) => m.id === master.id)?.yes;
    const masterAlready = marks.some((m) => m.id === master.id);
    if (masterAlready && !masterYes) return { ok: false, reason: "主人沒有贊成，管家不能贊成。" };
    if (!masterAlready) return { ok: true, reason: "主人還沒表態。若主人最後不贊成，這票仍然算數會暴露管家，所以本局管家會先看主人。" };
  }
  return { ok: true };
}

export function castVote(game: Game, voterId: string, yes: boolean): Game {
  const g = clone(game);
  if (g.phase !== "vote" || !g.pendingNominee) return g;
  const expected = g.voteQueue[g.voteIndex];
  if (expected !== voterId) return g;
  const voter = player(g, voterId);
  if (yes && voter.human && voter.alive && voter.role === "butler" && !butlerGate(g, voter)) {
    say(g, "gm", "night", "主人沒有贊成。管家這一票不能贊成，否則等於向全鎮承認身份。請改投棄權。");
    return g;
  }
  let used = yes;
  if (yes && !voter.alive) {
    if (!voter.ghostVote) used = false;
    else voter.ghostVote = false;
  }
  if (yes && !voter.human && voter.alive && voter.role === "butler" && !butlerGate(g, voter)) {
    used = false;
  }
  g.voteMarks.push({ id: voterId, yes: used });
  say(g, "gm", "public", `${voter.name} ${used ? "舉手贊成" : "不舉手"}。`);
  g.voteIndex += 1;
  if (g.voteIndex >= g.voteQueue.length) return closeVote(g);
  return g;
}

function butlerGate(game: Game, voter: Player): boolean {
  if (voter.role !== "butler" || !voter.alive || !voter.butlerMaster || !healthy(voter)) return true;
  const masterMark = game.voteMarks.find((m) => m.id === voter.butlerMaster);
  if (!masterMark) {
    const master = player(game, voter.butlerMaster);
    if (!master.alive && !master.ghostVote) return false;
    return true;
  }
  return masterMark.yes;
}

function closeVote(game: Game): Game {
  const nominee = game.pendingNominee!;
  const yes = game.voteMarks.filter((m) => m.yes).length;
  const need = threshold(aliveCount(game));
  const prev = game.onBlock;
  let result: string;
  if (yes < need) {
    result = `${yes} 票，沒有達到 ${need}。${player(game, nominee).name} 不上絞刑臺。`;
  } else if (!prev || yes > prev.votes) {
    game.onBlock = { id: nominee, votes: yes };
    result = `${yes} 票，達到門檻 ${need}。${player(game, nominee).name} 上了絞刑臺。`;
    if (prev) result += ` 原本臺上的人被替換下來。`;
  } else {
    result = `${yes} 票，沒有多於臺上的 ${prev.votes} 票。絞刑臺上仍是 ${player(game, prev.id).name}。`;
  }
  say(game, "gm", "public", result);
  game.phase = "day";
  game.pendingNominee = null;
  game.defenseFrom = null;
  game.voteQueue = [];
  game.voteIndex = 0;
  return game;
}

export function slay(game: Game, fromId: string, targetId: string): Game {
  const g = clone(game);
  if (g.phase !== "day" && g.phase !== "defense" && g.phase !== "vote") return g;
  const from = player(g, fromId);
  const target = player(g, targetId);
  say(g, from.human ? from.id : from.id, "public", `我使用殺手，選擇 ${target.name}。`);
  const real = from.role === "slayer" && !from.slayerUsed;
  const drunkShot = from.drunk && from.thinks === "slayer" && !from.slayerUsed;
  if (real || drunkShot) from.slayerUsed = true;
  const works = real && healthy(from);
  const hit = works && target.alive && registersAsDemon(g, target, "殺手");
  if (hit) {
    say(g, "gm", "public", `${target.name} 倒下了。`);
    kill(g, target, "slay");
    if (target.role !== "imp") {
      say(g, "gm", "public", "遊戲還沒有結束。倒下的人不一定是真的惡魔。");
    }
  } else {
    say(g, "gm", "public", "什麼事都沒有發生。");
    if (real && !healthy(from)) note(g, `${from.name} 的殺手失效，次數已用掉。`);
  }
  if (g.winner) g.phase = "end";
  return g;
}

export function closeDay(game: Game): Game {
  const g = clone(game);
  if (g.winner) {
    g.phase = "end";
    return g;
  }
  if (g.onBlock) {
    const victim = player(g, g.onBlock.id);
    g.executedId = victim.id;
    say(g, "gm", "public", `黃昏。被處決的是 ${victim.name}。`);
    kill(g, victim, "execute");
  } else {
    g.executedId = null;
    say(g, "gm", "public", "黃昏。今天沒有人被處決。");
  }
  if (!g.winner && mayorWins(g)) {
    endGame(g, "good", "場上剛好三名存活玩家，今天沒有處決，鎮長的能力生效。善良獲勝。");
  }
  if (!g.winner && aliveCount(g) <= 2) {
    endGame(g, "evil", "場上只剩兩名或更少存活者。邪惡獲勝。");
  }
  g.phase = g.winner ? "end" : "dusk";
  g.onBlock = null;
  return g;
}

function mayorWins(game: Game): boolean {
  if (game.executedId) return false;
  if (aliveCount(game) !== 3) return false;
  const mayor = game.players.find((p) => p.role === "mayor" && p.alive && healthy(p));
  return Boolean(mayor);
}

export function beginNight(game: Game): Game {
  const g = clone(game);
  if (g.winner) {
    g.phase = "end";
    return g;
  }
  for (const p of g.players) p.poisoned = false;
  g.day += 1;
  g.phase = "night";
  g.nightIndex = 0;
  g.nightDeaths = [];
  g.monkGuard = null;
  g.pendingNominee = null;
  say(g, "gm", "public", `第 ${g.day} 夜。請閉眼。白天的話先停在這裡。`);
  teach(g, "night2", "舊的毒在新的一夜開始時消退。投毒者若仍然存活，會重新選一個目標。小惡魔從第二夜開始殺人。");
  return advanceNight(g);
}

function endGame(game: Game, winner: "good" | "evil", reason: string) {
  if (game.winner) return;
  game.winner = winner;
  game.winReason = reason;
  game.phase = "end";
  say(game, "gm", "public", `${winner === "good" ? "善良" : "邪惡"}獲勝。${reason}`);
}

export function currentVoter(game: Game): Player | null {
  if (game.phase !== "vote") return null;
  const id = game.voteQueue[game.voteIndex];
  return id ? player(game, id) : null;
}

export function human(game: Game): Player {
  return game.players.find((p) => p.human)!;
}

export function bumpFear(game: Game, id: string, n: number) {
  const p = player(game, id);
  p.fear = Math.max(0, Math.min(100, p.fear + n));
}

export function resetDayFears(game: Game) {
  if (game.mindset !== "village") return;
  if (aliveCount(game) <= 5) {
    for (const p of game.players) if (p.alive) p.fear = Math.min(100, p.fear + 8);
  }
}
