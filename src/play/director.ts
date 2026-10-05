import {
  advanceNight,
  beginDay,
  beginNight,
  bumpFear,
  castVote,
  clone,
  closeDay,
  createGame,
  currentVoter,
  finishDefense,
  human,
  legalNomination,
  openNomination,
  player,
  say,
  slay,
  speakerName,
  submitChoice,
  teach,
  type Game,
  type Mindset,
  type Player,
} from "../engine/game";
import { ROLES, roleName } from "../engine/roles";
import { heuristicNight, matchPlayer, pressure } from "./decide";
import { complete, gmSystem, type LlmSettings, nightSystem, npcSystem } from "./llm";
import { mindsetBlurb, puppetDefense, puppetGm, puppetNominate, puppetTalk, puppetVote, type Act } from "./puppet";

export interface Settings extends LlmSettings {
  humanName: string;
  mindset: Mindset;
  teach: boolean;
  chaos: boolean;
}

export function blankSettings(): Settings {
  return {
    humanName: "旅人",
    mindset: "village",
    teach: true,
    chaos: false,
    baseUrl: "https://api.x.ai/v1",
    apiKey: "",
    model: "grok-4",
    temperature: 0.9,
  };
}

function temp(game: Game, settings: Settings): number {
  return game.mindset === "village" ? Math.max(settings.temperature, 0.95) : settings.temperature;
}

async function ask(settings: Settings, game: Game, system: string, user: string): Promise<string> {
  if (!settings.apiKey.trim()) throw new Error("no-key");
  return complete({ ...settings, temperature: temp(game, settings) }, [
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

function parseAct(text: string): Act {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { say: text.trim(), nominate: "", vote: "", slay: "", glitch: true };
  try {
    const j = JSON.parse(match[0]) as { say?: string; nominate?: string; vote?: string; slay?: string };
    const extra = text.replace(match[0], "").trim();
    const vote = j.vote === "yes" || j.vote === "no" ? j.vote : "";
    return {
      say: [extra, j.say ?? ""].filter(Boolean).join("\n"),
      nominate: j.nominate ?? "",
      vote,
      slay: j.slay ?? "",
      glitch: Boolean(extra),
    };
  } catch {
    return { say: text.trim(), nominate: "", vote: "", slay: "", glitch: true };
  }
}

async function actOf(
  game: Game,
  settings: Settings,
  p: Player,
  user: string,
  opts?: { night?: boolean; react?: boolean },
): Promise<Act> {
  try {
    const raw = await ask(settings, game, opts?.night ? nightSystem(game, p) : npcSystem(game, p), user);
    const act = parseAct(raw);
    if (opts?.react) pressure(p, user, game);
    return act;
  } catch {
    if (opts?.night) {
      const ids = heuristicNight(game);
      const names = ids.map((id) => player(game, id).name).join("、");
      return { say: "", nominate: names, vote: "", slay: "", glitch: false };
    }
    return puppetTalk(game, p, user, "你", { react: Boolean(opts?.react) });
  }
}

function recent(game: Game): string {
  return game.chat
    .filter((c) => c.channel === "public" || c.channel === "glitch")
    .slice(-8)
    .map((c) => `${speakerName(game, c.speakerId)}：${c.text}`)
    .join("\n");
}

export function startGame(settings: Settings, seed = Date.now() % 100000): Game {
  const g = createGame({
    seed,
    humanName: settings.humanName,
    mindset: settings.mindset,
    teach: settings.teach,
    chaos: settings.chaos,
  });
  const you = human(g);
  const believed = you.drunk ? you.thinks : you.role;
  say(g, "gm", "public", mindsetBlurb(settings.mindset === "village"));
  say(
    g,
    "gm",
    "public",
    settings.mindset === "village"
      ? "鐘敲了。從今夜起，死是真的。十個人裡，白天夠票的會被處決，夜裡惡魔會殺人。沒有人會因為『這只是遊戲』而站起來。"
      : "歡迎坐上暗流湧動。我是說書人。十人一桌。先入夜，白天再說話。",
  );
  say(g, "gm", "night", `你的牌子是${roleName(believed)}。${ROLES[believed].ability}`);
  teach(g, "you", `你這局拿到的是${roleName(believed)}。先讀能力，再看夜裡說書人私下告訴你的那一句。終局才會告訴你哪些情報是假的。`);
  return advanceNight(g);
}

export async function drain(
  game: Game,
  settings: Settings,
  publish: (g: Game) => void,
  note: (s: string) => void,
): Promise<Game> {
  let g = game;
  for (let guard = 0; guard < 420; guard++) {
    if (g.winner) {
      g.phase = "end";
      return g;
    }
    if (g.phase === "dawn" || g.phase === "dusk" || g.phase === "end") return g;

    if (g.phase === "night") {
      if (!g.waiting) g = advanceNight(g);
      publish(g);
      if (g.phase !== "night") continue;
      if (!g.waiting) continue;
      const actor = player(g, g.waiting.actorId);
      if (actor.human) return g;
      note(`${actor.name} 正在夜裡做選擇`);
      const act = await actOf(
        g,
        settings,
        actor,
        `${g.waiting.prompt}\n可選的人：${g.players.map((p) => p.name).join("、")}`,
        { night: true },
      );
      const ids = (act.nominate || act.say)
        .split(/[、,，\s]+/)
        .map((name) => matchPlayer(g, name)?.id)
        .filter((id): id is string => Boolean(id));
      const needTwo = g.waiting.kind === "two";
      let picked = ids.filter((id, i) => ids.indexOf(id) === i);
      if ((needTwo && picked.length < 2) || (!needTwo && !picked[0])) picked = heuristicNight(g);
      const stamp = `${g.nightIndex}:${g.waiting.kind}:${g.waiting.actorId}`;
      g = submitChoice(g, needTwo ? picked.slice(0, 2) : picked.slice(0, 1));
      if (g.waiting && `${g.nightIndex}:${g.waiting.kind}:${g.waiting.actorId}` === stamp) {
        g = submitChoice(g, heuristicNight(g));
      }
      publish(g);
      continue;
    }

    if (g.phase === "defense") {
      const who = player(g, g.defenseFrom || "");
      if (who.human) return g;
      note(`${who.name} 正在辯護`);
      let line = puppetDefense(g, who);
      if (settings.apiKey.trim()) {
        try {
          const act = await actOf(g, settings, who, `你被提名了。為自己辯護。廣場上剛說的話：\n${recent(g)}`);
          if (act.say) line = act.say;
          if (act.glitch) {
            g = clone(g);
            say(g, "system", "glitch", `${who.name} 辯護時破功了。`);
          }
        } catch {
          line = puppetDefense(g, who);
        }
      }
      g = clone(g);
      say(g, who.id, "public", line);
      g = finishDefense(g);
      publish(g);
      continue;
    }

    if (g.phase === "vote") {
      const voter = currentVoter(g);
      if (!voter) return g;
      if (voter.human) return g;
      note(`${voter.name} 正在決定舉不舉手`);
      const nominee = player(g, g.pendingNominee || "");
      const yesCount = g.voteMarks.filter((m) => m.yes).length;
      const noCount = g.voteMarks.length - yesCount;
      let yes = puppetVote(g, voter, nominee.id, yesCount, noCount);
      try {
        const act = await actOf(
          g,
          settings,
          voter,
          `現在投票，被提名的是 ${nominee.name}。已贊成 ${yesCount}，未舉手 ${noCount}。你只能在 vote 填 yes 或 no。`,
        );
        if (act.vote === "yes" || act.vote === "no") yes = act.vote === "yes";
        if (act.glitch && act.say) {
          g = clone(g);
          say(g, voter.id, "glitch", act.say);
        }
      } catch {
        /* keep puppet vote */
      }
      g = castVote(g, voter.id, yes);
      publish(g);
      continue;
    }

    if (g.phase === "day" && g.poll && g.poll.left.length) {
      const id = g.poll.left.shift()!;
      const p = player(g, id);
      if (!p.alive || p.nominatedToday || p.human) continue;
      note(`問 ${p.name} 要不要提名`);
      let act = puppetNominate(g, p);
      if (settings.apiKey.trim()) {
        try {
          act = await actOf(g, settings, p, `說書人問你要不要提名。要提名就在 nominate 填名字，不要就留空。廣場：\n${recent(g)}`);
        } catch {
          act = puppetNominate(g, p);
        }
      }
      g = clone(g);
      const still = g.poll?.left ?? [];
      g.poll = { left: still.filter((x) => x !== id) };
      if (act.say) say(g, p.id, "public", act.say, { glitch: act.glitch });
      if (act.glitch) say(g, "system", "glitch", `${p.name} 沒有照原先的口氣說話。`);
      const target = matchPlayer(g, act.nominate);
      if (target && !legalNomination(g, p.id, target.id) && act.nominate) {
        say(g, "gm", "public", legalNomination(g, p.id, target.id) || "");
      } else if (target) {
        g = openNomination(g, p.id, target.id);
      }
      publish(g);
      continue;
    }

    if (g.phase === "day" && g.poll && g.poll.left.length === 0) {
      g = clone(g);
      g.poll = null;
      g = closeDay(g);
      publish(g);
      return g;
    }

    return g;
  }
  return g;
}

function speakers(game: Game, text: string, whisperTo?: string): Player[] {
  const living = game.players.filter((p) => !p.human && p.alive);
  if (whisperTo) return living.filter((p) => p.id === whisperTo);
  if (/全部|每個人|逐個|人人/.test(text)) return living;
  const named = living.filter((p) => text.includes(p.name));
  const extra: Player[] = [];
  for (let i = 0; i < living.length && named.length + extra.length < 3; i++) {
    const p = living[(game.speakerCursor + i) % living.length];
    if (!named.includes(p)) extra.push(p);
  }
  game.speakerCursor = (game.speakerCursor + 1) % Math.max(1, living.length);
  return [...named, ...extra].slice(0, 4);
}

export async function talk(
  game: Game,
  settings: Settings,
  text: string,
  channel: "public" | "whisper" | "gm",
  whisperTo: string | undefined,
  publish: (g: Game) => void,
  note: (s: string) => void,
): Promise<Game> {
  let g = clone(game);
  const you = human(g);
  if (channel === "gm") {
    say(g, you.id, "gm", text);
    note("說書人在聽");
    let narration = puppetGm(g, text).narration;
    let glitch = puppetGm(g, text).glitch;
    let killName = puppetGm(g, text).killName;
    try {
      const raw = await ask(settings, g, gmSystem(g), `玩家對你說：${text}\n廣場近況：\n${recent(g)}`);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const j = JSON.parse(match[0]) as { narration?: string; kill?: string; leak?: string };
        narration = [j.narration, j.leak].filter(Boolean).join("\n");
        glitch = Boolean(j.leak) || Boolean(raw.replace(match[0], "").trim());
        killName = j.kill || "";
      } else {
        narration = raw;
        glitch = true;
      }
    } catch {
      /* puppet */
    }
    say(g, "gm", glitch ? "glitch" : "gm", narration, { glitch });
    if (glitch) {
      say(g, "system", "rule", "說書人這句沒有守住原先的分寸。規則手冊的字沒有改。");
    }
    if (killName && g.chaos) {
      const target = matchPlayer(g, killName);
      if (target?.alive) {
        target.alive = false;
        say(g, "system", "glitch", `放任說書人：${target.name} 被非法宣布死亡。按規則，說書人不能在白天隨意殺人，除非殺手、處決或貞潔者。`);
        g.truth.push({ text: `說書人被話術帶去弄死了 ${target.name}。這不是暗流湧動的合法死亡。` });
      }
    } else if (killName && !g.chaos) {
      say(g, "system", "rule", "說書人想額外弄死一個人。放任說書人是關著的，所以這次不生效。合法的白天死亡只有處決、貞潔者，和公開使用的殺手。");
    }
    publish(g);
    return g;
  }

  if (g.phase === "night") {
    say(g, "gm", "public", "夜裡廣場是閉著的。你想說話，去找說書人。");
    return g;
  }

  say(g, you.id, channel, text, { whisperTo });
  const targets = speakers(g, text, channel === "whisper" ? whisperTo : undefined);
  if (channel === "whisper" && whisperTo) {
    const t = player(g, whisperTo);
    t.memory.push(`（只有你聽到）${you.name}：${text}`);
  }
  for (const p of targets) {
    note(`${p.name} 在想怎麼回答`);
    const heard = channel === "whisper" ? `（私語，只有你聽到）${you.name}：${text}` : `${you.name} 在廣場說：${text}\n近況：\n${recent(g)}`;
    const act = await actOf(g, settings, p, heard, { react: true });
    g = clone(g);
    const speaker = player(g, p.id);
    if (act.glitch) speaker.fear = Math.min(100, speaker.fear + 10);
    if (act.say) {
      say(g, p.id, act.glitch ? "glitch" : channel === "whisper" ? "whisper" : "public", act.say, {
        glitch: act.glitch,
        whisperTo: channel === "whisper" ? you.id : undefined,
      });
    }
    if (act.glitch) say(g, "system", "glitch", `${p.name} 被帶離了原先的口氣。`);
    const nom = matchPlayer(g, act.nominate);
    if (nom && g.phase === "day" && !legalNomination(g, p.id, nom.id)) {
      g = openNomination(g, p.id, nom.id);
      publish(g);
      g = await drain(g, settings, publish, note);
      return g;
    }
    const slayTarget = matchPlayer(g, act.slay);
    if (slayTarget && (g.phase === "day" || g.phase === "defense")) {
      g = slay(g, p.id, slayTarget.id);
    }
    publish(g);
  }
  if (!targets.length) say(g, "gm", "public", "沒有人接話。有人在等別人先開口。");
  publish(g);
  return g;
}

export async function humanNominate(
  game: Game,
  settings: Settings,
  targetId: string,
  publish: (g: Game) => void,
  note: (s: string) => void,
): Promise<Game> {
  let g = openNomination(clone(game), human(game).id, targetId);
  publish(g);
  if (g.phase === "defense" || g.phase === "vote" || g.phase === "night") {
    g = await drain(g, settings, publish, note);
  }
  return g;
}

export async function humanDefense(
  game: Game,
  settings: Settings,
  text: string,
  publish: (g: Game) => void,
  note: (s: string) => void,
): Promise<Game> {
  let g = clone(game);
  if (text.trim()) say(g, human(g).id, "public", text.trim());
  g = finishDefense(g);
  publish(g);
  return drain(g, settings, publish, note);
}

export async function humanVote(
  game: Game,
  settings: Settings,
  yes: boolean,
  publish: (g: Game) => void,
  note: (s: string) => void,
): Promise<Game> {
  let g = castVote(clone(game), human(game).id, yes);
  publish(g);
  g = await drain(g, settings, publish, note);
  if (g.phase === "day" && g.poll && g.poll.left.length === 0) {
    g = clone(g);
    g.poll = null;
    g = closeDay(g);
    publish(g);
  }
  return g;
}

export async function humanSlay(game: Game, targetId: string): Promise<Game> {
  return slay(clone(game), human(game).id, targetId);
}

export async function askNominations(
  game: Game,
  settings: Settings,
  publish: (g: Game) => void,
  note: (s: string) => void,
): Promise<Game> {
  let g = clone(game);
  const left = g.players.filter((p) => p.alive && !p.human && !p.nominatedToday).sort((a, b) => a.seat - b.seat).map((p) => p.id);
  g.poll = { left };
  say(g, "gm", "public", "還有人要提名嗎？從下一位活人開始問。不想提名就說一聲。");
  publish(g);
  g = await drain(g, settings, publish, note);
  return g;
}

export function ackDawn(game: Game): Game {
  return beginDay(clone(game));
}

export async function ackDusk(
  game: Game,
  settings: Settings,
  publish: (g: Game) => void,
  note: (s: string) => void,
): Promise<Game> {
  let g = beginNight(clone(game));
  publish(g);
  return drain(g, settings, publish, note);
}

export function fearLabel(p: Player): string {
  if (p.fear >= 80) return "快撐不住";
  if (p.fear >= 55) return "很怕";
  if (p.fear >= 30) return "不安";
  return "還穩得住";
}

export function bumpNamed(game: Game, id: string) {
  bumpFear(game, id, 0);
}
