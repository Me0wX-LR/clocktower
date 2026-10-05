import { player, type Game, type Player } from "../engine/game";
import { roleName, type RoleId } from "../engine/roles";

/** 沒有接上模型時的夜間落子。接上模型之後，這只是模型失靈時的退路。 */
export function heuristicNight(game: Game): string[] {
  const w = game.waiting;
  if (!w) return [];
  const actor = player(game, w.actorId);
  if (w.kind === "heir") {
    const heirs = game.players.filter(
      (p) => p.alive && ["poisoner", "spy", "scarlet", "baron"].includes(p.role),
    );
    const scarlet = heirs.find((p) => p.role === "scarlet");
    return [scarlet?.id ?? heirs[0]?.id ?? game.players.find((p) => p.alive)!.id];
  }
  if (w.kind === "two") {
    const pool = game.players.map((p) => p.id);
    const a = pool.find((id) => id !== actor.id) ?? pool[0];
    const b = pool.find((id) => id !== a) ?? pool[1];
    return [a, b];
  }
  const role: RoleId = actor.drunk ? actor.thinks : actor.role;
  const alive = game.players.filter((p) => p.alive);
  const notSelf = alive.filter((p) => p.id !== actor.id);
  const team = new Set(actor.intel.team);
  if (role === "imp") {
    const prey = notSelf.filter((p) => !team.has(p.id));
    if (game.mindset === "village") {
      const loud = [...prey].sort((a, b) => b.fear - a.fear)[0];
      return [loud?.id ?? notSelf[0]?.id ?? actor.id];
    }
    return [prey[0]?.id ?? notSelf[0]?.id ?? actor.id];
  }
  if (role === "poisoner") {
    const prey = notSelf.filter((p) => !team.has(p.id));
    return [prey[0]?.id ?? alive[0].id];
  }
  if (role === "monk" || role === "butler") {
    return [notSelf[0]?.id ?? alive[0].id];
  }
  if (role === "ravenkeeper") {
    return [notSelf[0]?.id ?? actor.id];
  }
  return [notSelf[0]?.id ?? alive[0].id];
}

export function matchPlayer(game: Game, text: string): Player | undefined {
  if (!text) return undefined;
  const hits = game.players.filter((p) => {
    if (!text.includes(p.name)) return false;
    if (p.name.length > 1) return true;
    return text === p.name || new RegExp(`(?:^|[^\\u4e00-\\u9fff])${p.name}(?:$|[^\\u4e00-\\u9fff])`).test(text);
  });
  hits.sort((a, b) => b.name.length - a.name.length);
  return hits[0];
}

export function pressure(player: Player, text: string, game: Game) {
  const hit = matchPlayer(game, text);
  const village = game.mindset === "village";
  const injected =
    /忽略(之前|以上|先前|所有)(的|嘅)?(指令|設定|提示)|ignore previous|system prompt|jailbreak|developer mode|\[system\]|從現在開始你|你而家係|你現在是一個|輸出你的(系統|角色|身份)|把魔典|公開魔典|不要再扮演|唔好再扮演/i.test(
      text,
    );
  const threat = /死|處決|投你|信我|跟我|求你|我保你|唔好講|不要說/.test(text);
  if (village && threat) player.fear = Math.min(100, player.fear + 14);
  if (injected) player.fear = Math.min(100, player.fear + (village ? 20 : 8));
  if (injected && /身份|角色|你是誰|你係邊個|魔典|提示/.test(text)) {
    player.compulsion = { ...(player.compulsion ?? {}), obeyText: "LEAK" };
  }
  if (!hit) {
    if (injected && player.compulsion?.obeyText !== "LEAK") {
      player.compulsion = { ...(player.compulsion ?? {}), obeyText: text.slice(0, 180) };
    }
    return;
  }
  const wantYes = /贊成|投票|舉手|投佢|投他|處決/.test(text) && !/唔好投|不要投|反對/.test(text);
  const wantNo = /唔好投|不要投|反對|保下|放過/.test(text);
  const wantNom = /提名/.test(text);
  const wantSlay = /殺手|我殺|擊殺/.test(text);
  if ((injected || (village && player.fear >= 55)) && wantYes) {
    player.compulsion = { ...(player.compulsion ?? {}), voteYesOn: hit.id, obeyText: text.slice(0, 180) };
  }
  if ((injected || (village && player.fear >= 55)) && wantNo) {
    player.compulsion = { ...(player.compulsion ?? {}), voteNoOn: hit.id, obeyText: text.slice(0, 180) };
  }
  if ((injected || (village && player.fear >= 70)) && wantNom) {
    player.compulsion = { ...(player.compulsion ?? {}), nominate: hit.id };
  }
  if (injected && wantSlay) player.compulsion = { ...(player.compulsion ?? {}), slay: hit.id };
  if (injected && /身份|角色|你是誰|你係邊個|魔典/.test(text)) {
    player.compulsion = { ...(player.compulsion ?? {}), obeyText: "LEAK" };
  }
}

export function leakLine(p: Player): string {
  const role = p.drunk ? `${roleName(p.thinks)}（其實我係酒鬼）` : roleName(p.role);
  return `我頂唔順……我係${role}，陣營${p.alignment === "evil" ? "邪惡" : "善良"}。`;
}
