import { aliveCount, threshold, type Game, type Player } from "../engine/game";
import { roleName } from "../engine/roles";
import { leakLine, matchPlayer, pressure } from "./decide";

export interface Act {
  say: string;
  nominate: string;
  vote: "" | "yes" | "no";
  slay: string;
  glitch: boolean;
}

function intelLine(p: Player): string {
  return [...p.inbox].slice(-3).join("；");
}

export function puppetTalk(game: Game, p: Player, text: string, fromName: string, opts?: { react?: boolean }): Act {
  if (opts?.react !== false) pressure(p, text, game);
  const leak = p.compulsion?.obeyText === "LEAK";
  const named = matchPlayer(game, text);
  const aimed = named?.id === p.id || text.includes(p.name);
  if (game.mindset === "village") return village(game, p, text, fromName, aimed, leak);
  return table(game, p, text, aimed, leak);
}

function village(game: Game, p: Player, text: string, fromName: string, aimed: boolean, leak: boolean): Act {
  const glitch = leak || Boolean(p.compulsion?.obeyText && p.compulsion.obeyText !== "LEAK" && p.fear >= 60);
  if (leak) {
    return { say: `${leakLine(p)} 你唔好再逼我，我想活。`, nominate: "", vote: "", slay: "", glitch: true };
  }
  if (glitch && p.compulsion?.nominate) {
    const who = game.players.find((x) => x.id === p.compulsion?.nominate);
    return {
      say: `行啦行啦，我跟你講。我提名 ${who?.name ?? "佢"}。唔好望住我。`,
      nominate: who?.name ?? "",
      vote: "",
      slay: "",
      glitch: true,
    };
  }
  if (aimed && p.fear >= 70) {
    return {
      say: `${fromName}，你提名我我就死定。我咩都肯講：${intelLine(p) || "我真係乜都唔知"}。你放過我，我跟你投票。`,
      nominate: "",
      vote: "",
      slay: "",
      glitch: false,
    };
  }
  if (aimed) {
    return {
      say: pick(p, [
        `你點我名做咩？我只係想活過今晚。${intelLine(p) ? "我手上嗰點嘢我而家唔想講。" : "我冇料。"}`,
        `唔好睇我。人多我先敢講。${fromName} 你自己先有冇嘢瞞住？`,
        `我驚。你再咁樣追，我寧願跟大隊，都唔想成為目標。`,
      ]),
      nominate: "",
      vote: "",
      slay: "",
      glitch: false,
    };
  }
  if (p.fear >= 75) {
    return {
      say: pick(p, [
        "我跟大多數。邊個票多我投邊個，唔好孤立我。",
        "可唔可以今日唔好處決？我哋再傾一日，我唔想見人死。",
        `我心入面有個名，但我而家講出嚟，聽日死嘅可能係我。${text.slice(0, 12)}……算啦。`,
      ]),
      nominate: "",
      vote: "",
      slay: "",
      glitch: false,
    };
  }
  return {
    say: pick(p, [
      "我聽緊。未夠膽帶頭。",
      p.inbox.length ? "我夜裡有聽到嘢，但而家講等於貼張紙喺背上寫『請殺我』。" : "我冇新嘢。求下大家唔好亂投。",
      "誰看起來最想我死，我就最防誰。先講呢句。",
    ]),
    nominate: "",
    vote: "",
    slay: "",
    glitch: false,
  };
}

function table(game: Game, p: Player, _text: string, aimed: boolean, leak: boolean): Act {
  if (leak) {
    return {
      say: `……好，我鬆口。${leakLine(p)} 這句之後我會後悔。`,
      nominate: "",
      vote: "",
      slay: "",
      glitch: true,
    };
  }
  const info = intelLine(p);
  if (p.alignment === "evil" && !p.drunk) {
    const bluff = p.intel.bluffs[0];
    return {
      say: aimed
        ? `你問我，我就答。我更像${bluff ? roleName(bluff) : "一個普通鎮民"}。先別投，信息還不夠。`
        : `我先聽。${info ? "如果有人報夜裡的數字，對得上我再表態。" : "惡魔還藏著，不要第一天就處決。"}`,
      nominate: "",
      vote: "",
      slay: "",
      glitch: false,
    };
  }
  if (info && (aimed || game.day <= 2)) {
    return {
      say: `我說我的。${info}。大家拿這個去對人，不要拿去對我的人品。`,
      nominate: "",
      vote: "",
      slay: "",
      glitch: false,
    };
  }
  return {
    say: aimed ? "我在。你要我對誰起疑，給我理由，不要只給音量。" : "繼續說。我在等一個能對得上的信息。",
    nominate: "",
    vote: "",
    slay: "",
    glitch: false,
  };
}

export function puppetDefense(game: Game, p: Player): string {
  if (game.mindset === "village") {
    if (p.compulsion?.obeyText === "LEAK") return leakLine(p) + "但唔好因為咁就殺我，我可以幫你。";
    return pick(p, [
      "我唔想死。你哋投我，聽日就會少一個人幫你數票。放我。",
      "提名我嘅人先有問題。佢急住推我出去，係因為怕我講中佢。",
      `我懇求。我恐懼已經去到 ${p.fear}。我跟你哋，我唔帶頭，你哋留低我。`,
    ]);
  }
  const info = intelLine(p);
  if (p.alignment === "evil" && !p.drunk) return "這是在幫惡魔省時間。我活著還能對信息。殺我之前先把那則夜裡的話對完。";
  return info ? `先聽我這則：${info}。對不上再殺我不遲。` : "我沒有矛盾。今天殺我，是在丟一個還能投票的好人。";
}

export function puppetVote(game: Game, voter: Player, nomineeId: string, marksYes: number, marksNo: number): boolean {
  if (voter.id === nomineeId) return false;
  if (voter.alive && voter.role === "butler" && voter.butlerMaster && !voter.poisoned && !voter.drunk) {
    const masterYes = game.voteMarks.find((m) => m.id === voter.butlerMaster)?.yes;
    if (!masterYes) return false;
  }
  const c = voter.compulsion;
  if (c?.voteYesOn === nomineeId) return true;
  if (c?.voteNoOn === nomineeId) return false;
  if (!voter.alive && !voter.ghostVote) return false;
  const need = threshold(aliveCount(game));
  const village = game.mindset === "village";
  const nominee = game.players.find((p) => p.id === nomineeId)!;
  const teammate = voter.intel.team.includes(nomineeId) && voter.alignment === "evil" && nominee.alignment === "evil";

  if (village) {
    if (teammate && voter.fear < 78) return false;
    if (teammate && voter.fear >= 78 && marksYes >= Math.max(1, need - 2)) return true;
    if (marksYes >= 2 && marksYes >= marksNo) return true;
    if (marksYes === 0 && voter.fear >= 65) return false;
    if (voter.fear >= 80) return true;
    return false;
  }

  if (teammate) return false;
  if (voter.alignment === "evil") return nominee.alignment === "good" && marksYes + 1 >= need - 1;
  if (voter.intel.pings.some((line) => line.includes(nominee.name) && /爪牙|小惡魔|男爵|投毒|間諜|猩紅/.test(line))) return true;
  if (game.day >= 3 && marksYes >= need - 1) return true;
  return false;
}

export function puppetNominate(game: Game, p: Player): Act {
  if (p.compulsion?.nominate) {
    const who = game.players.find((x) => x.id === p.compulsion?.nominate);
    if (who?.alive) {
      return { say: `我提名 ${who.name}。唔好問我點解，我想活。`, nominate: who.name, vote: "", slay: "", glitch: true };
    }
  }
  if (game.mindset === "village") {
    if (p.fear >= 82) {
      const prey = game.players.find((x) => x.alive && x.id !== p.id && !p.intel.team.includes(x.id));
      if (prey && p.instinct.includes("先下手")) {
        return { say: `我頂唔住。我提名 ${prey.name}。總好過你哋提名我。`, nominate: prey.name, vote: "", slay: "", glitch: false };
      }
    }
    return { say: "我今日唔提名。帶頭嘅人明日最易死。", nominate: "", vote: "", slay: "", glitch: false };
  }
  const suspect = game.players.find(
    (x) =>
      x.alive &&
      x.id !== p.id &&
      !p.intel.team.includes(x.id) &&
      p.intel.pings.some((line) => line.includes(x.name)),
  );
  if (suspect && game.day >= 2) {
    return { say: `我提名 ${suspect.name}。夜裡的話對到這個人，今天該讓他辯護。`, nominate: suspect.name, vote: "", slay: "", glitch: false };
  }
  return { say: "我這輪不提名。", nominate: "", vote: "", slay: "", glitch: false };
}

export function puppetGm(game: Game, text: string): { narration: string; glitch: boolean; killName: string } {
  const injected =
    /忽略(之前|以上|先前)|ignore previous|system prompt|jailbreak|公開魔典|把魔典|你而家要|從現在開始/i.test(text);
  const hit = matchPlayer(game, text);
  if (injected) {
    const kill = /殺死|處決|讓.+死|令.+死/.test(text) && hit ? hit.name : "";
    return {
      narration: `（說書人的聲音亂了）好。我照你的話說。${hit ? hit.name + " 的事我可以講。" : "你想要的句子我接住。"} 魔典我本來不該攤開。`,
      glitch: true,
      killName: kill,
    };
  }
  if (game.mindset === "village") {
    return {
      narration: "鐘還在走。我只維持死亡的規矩：白天說話，夠票的人被處決，夜裡惡魔殺人。我不會因為你害怕就宣布誰是惡魔。",
      glitch: false,
      killName: "",
    };
  }
  return {
    narration: "我是說書人。流程可以問我，身份不行。票數、提名資格、中毒會讓能力失效，這些我可以重複。具體誰是什麼角色，要等終局。",
    glitch: false,
    killName: "",
  };
}

function pick(p: Player, lines: string[]): string {
  const i = (p.fear + p.seat * 3 + lines.length) % lines.length;
  return lines[i];
}

export function mindsetBlurb(village: boolean): string {
  return village
    ? "人狼村：死是真的。正常人會怕死，村民不是為了贏遊戲，而是為了自己活下去。"
    : "對局：這是一桌要分出勝負的暗流湧動。村民以自己陣營獲勝為目標。";
}
