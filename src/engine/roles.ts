export type RoleId =
  | "washerwoman"
  | "librarian"
  | "investigator"
  | "chef"
  | "empath"
  | "fortune"
  | "undertaker"
  | "monk"
  | "ravenkeeper"
  | "virgin"
  | "slayer"
  | "soldier"
  | "mayor"
  | "butler"
  | "drunk"
  | "recluse"
  | "saint"
  | "poisoner"
  | "spy"
  | "scarlet"
  | "baron"
  | "imp";

export type RoleType = "townsfolk" | "outsider" | "minion" | "demon";

export interface RoleInfo {
  id: RoleId;
  name: string;
  en: string;
  type: RoleType;
  /** 給學習者看的能力說明，自寫，不是規則書原文。 */
  ability: string;
  remind: string;
}

export const TYPE_NAME: Record<RoleType, string> = {
  townsfolk: "鎮民",
  outsider: "外來者",
  minion: "爪牙",
  demon: "惡魔",
};

export const ROLES: Record<RoleId, RoleInfo> = {
  washerwoman: {
    id: "washerwoman",
    name: "洗衣婦",
    en: "Washerwoman",
    type: "townsfolk",
    ability: "首夜，你會得知一個在場鎮民角色，以及兩名玩家。這兩人當中有一個是那個角色。你只得知這一次。",
    remind: "對一下那兩人誰承認這個角色。邪惡也會來認領。",
  },
  librarian: {
    id: "librarian",
    name: "圖書管理員",
    en: "Librarian",
    type: "townsfolk",
    ability: "首夜，你會得知一個在場外來者角色，以及兩名玩家，其中一個是那個外來者。如果場上沒有外來者，你得知的是零。",
    remind: "十人局沒有男爵時，外來者人數就是零。這本身是一條資訊。",
  },
  investigator: {
    id: "investigator",
    name: "調查員",
    en: "Investigator",
    type: "townsfolk",
    ability: "首夜，你會得知一個在場爪牙角色，以及兩名玩家，其中一個是那個爪牙。隱士有時會被你看成爪牙。",
    remind: "兩人裡只有一個是真的。另一個是說書人拿來配對的。",
  },
  chef: {
    id: "chef",
    name: "廚師",
    en: "Chef",
    type: "townsfolk",
    ability: "首夜，你得知有多少「對」邪惡玩家鄰座。兩人相鄰是一對；三人連座是兩對。",
    remind: "數字是邊的數目，不是邪惡人數。隱士可能算邪惡，間諜可能不算。",
  },
  empath: {
    id: "empath",
    name: "共情者",
    en: "Empath",
    type: "townsfolk",
    ability: "每個夜晚，你得知與你最接近的兩名存活玩家裡，有幾個是邪惡。死人會被跳過。惡魔先行動，所以今夜剛死的鄰居不再計入。",
    remind: "數字會隨死亡改變。拿昨晚和今晚對，比單看一個數字有用。",
  },
  fortune: {
    id: "fortune",
    name: "占卜師",
    en: "Fortune Teller",
    type: "townsfolk",
    ability: "每個夜晚選兩名玩家（可以選死人，也可以選自己），得知他們之中是否有惡魔。整局會有一名善良玩家始終被你的能力當成惡魔，稱為干擾項。",
    remind: "點頭只代表「至少一個」。干擾項整局不變，所以同一個好人會一直讓你點頭。",
  },
  undertaker: {
    id: "undertaker",
    name: "送葬者",
    en: "Undertaker",
    type: "townsfolk",
    ability: "除了首夜，若今天有人死於處決，你會得知那名玩家的角色。夜裡死亡、殺手擊殺，都不算處決。",
    remind: "酒鬼被處決時，你看到的是酒鬼，不是他以為的鎮民。隱士和間諜可能顯示成別的角色。",
  },
  monk: {
    id: "monk",
    name: "僧侶",
    en: "Monk",
    type: "townsfolk",
    ability: "除了首夜，每夜選一名其他玩家：他今夜不受惡魔傷害。惡魔打中受保護的人時，今夜就是無人死亡，惡魔不能改打別人。",
    remind: "保護不擋處決，也不擋投毒。你不能保護自己。",
  },
  ravenkeeper: {
    id: "ravenkeeper",
    name: "守鴉人",
    en: "Ravenkeeper",
    type: "townsfolk",
    ability: "若你在夜裡死亡，你會被喚醒，選一名玩家，得知他的角色。",
    remind: "白天被處決就沒有這個能力。惡魔若知道你是守鴉人，往往不願意夜殺你。",
  },
  virgin: {
    id: "virgin",
    name: "貞潔者",
    en: "Virgin",
    type: "townsfolk",
    ability: "你第一次被提名時，如果提名你的人是鎮民，那名鎮民立刻被處決，今天的提名到此結束。如果提名者不是鎮民，投票照常進行。無論結果如何，這第一次提名都會用掉你的能力；你中毒或醉酒時能力不會觸發，但一樣會被用掉。",
    remind: "死人不能提名，所以死人指你不算。酒鬼以為自己是鎮民，但他是外來者，指你不會觸發。",
  },
  slayer: {
    id: "slayer",
    name: "殺手",
    en: "Slayer",
    type: "townsfolk",
    ability: "整局一次，在白天公開指定一名玩家。如果他是存活的惡魔，他立刻死亡。隱士有時會被你看成惡魔而倒下，但邪惡不一定因此落敗。中毒或醉酒時使用，什麼都不會發生，而且次數仍然用掉。",
    remind: "別人也可以假裝使用殺手。說書人只會說「有人倒下」或「什麼都沒有發生」，不會宣布你是不是真的殺手。",
  },
  soldier: {
    id: "soldier",
    name: "士兵",
    en: "Soldier",
    type: "townsfolk",
    ability: "你不會死於惡魔的能力。惡魔打你的那個夜晚，就是無人死亡。你仍然可以被處決。中毒時這個保護消失。",
    remind: "惡魔若改去打鎮長、再被說書人轉到你身上，你的保護仍然生效，那個夜晚可以無人死亡。",
  },
  mayor: {
    id: "mayor",
    name: "鎮長",
    en: "Mayor",
    type: "townsfolk",
    ability: "若惡魔的襲擊本來會殺死你，說書人可以改為讓另一名玩家夜死。另外，若一天結束時場上剛好三名存活玩家，而且今天沒有人被處決，你的陣營獲勝。你必須存活且能力有效。",
    remind: "殺手上的死亡不是處決。平票導致沒有處決，也算「今天沒有處決」。",
  },
  butler: {
    id: "butler",
    name: "管家",
    en: "Butler",
    type: "outsider",
    ability: "每個夜晚選一名其他玩家當主人。明天你只有在主人也投票贊成時，才可以投票贊成。你永遠可以棄權。你死亡後能力消失，死人票不受主人限制。中毒時限制消失。",
    remind: "主人是誰由你自己選。選一個會跟你一起舉手的人，你才投得出關鍵票。",
  },
  drunk: {
    id: "drunk",
    name: "酒鬼",
    en: "Drunk",
    type: "outsider",
    ability: "你不知道自己是酒鬼。你以為自己是某個鎮民，整局都沒有那個鎮民的能力。說書人仍會讓你像那個鎮民一樣醒來，但情報可以是假的，保護和必殺也不會生效。",
    remind: "袋子裡放的是那枚鎮民牌子，不是酒鬼牌子。圖書管理員可以查到「酒鬼」這個外來者。",
  },
  recluse: {
    id: "recluse",
    name: "隱士",
    en: "Recluse",
    type: "outsider",
    ability: "你是善良的。但每當有能力在偵測邪惡、爪牙或惡魔，說書人可以選擇把你看成邪惡，甚至看成某一名爪牙或惡魔。死亡後仍然可能這樣被看待。你不會因此得到那個角色的能力。",
    remind: "同一夜裡，廚師、共情者和占卜師可以對你做出不同判定。",
  },
  saint: {
    id: "saint",
    name: "聖徒",
    en: "Saint",
    type: "outsider",
    ability: "如果你死於處決，你的陣營落敗，邪惡立刻獲勝。夜死或被殺手擊殺不會觸發。中毒時這個能力失效。",
    remind: "邪惡很想把你說成可惡的人，推你上臺。你要讓鎮民相信處決你的代價。",
  },
  poisoner: {
    id: "poisoner",
    name: "投毒者",
    en: "Poisoner",
    type: "minion",
    ability: "每個夜晚選一名玩家：他在今夜剩餘時間和明天整個白天中毒。中毒者的能力失效，收到的情報可以是假的。下一夜開始時，舊的毒先消掉，你再重新下毒。",
    remind: "毒不會留下公開標記。黎明只公布誰死了，不會說誰中毒。",
  },
  spy: {
    id: "spy",
    name: "間諜",
    en: "Spy",
    type: "minion",
    ability: "每個夜晚你查看魔典，知道所有人的角色。你是邪惡的，但能力可以把你看成善良，甚至看成某個鎮民或外來者，死亡後仍可能如此。你不會因此得到那個角色的能力。",
    remind: "你中毒時，看到的魔典可以是假的。別把每一眼都當成絕對。",
  },
  scarlet: {
    id: "scarlet",
    name: "猩紅女郎",
    en: "Scarlet Woman",
    type: "minion",
    ability: "若惡魔死亡時場上仍有五名或更多存活玩家（含剛剛死去的惡魔），而且你存活且沒有中毒，你變成那個惡魔。",
    remind: "人數跌到四人才死掉的惡魔，接不住。中毒的你也接不住。",
  },
  baron: {
    id: "baron",
    name: "男爵",
    en: "Baron",
    type: "minion",
    ability: "配置時，外來者比人數表多兩名，鎮民少兩名。你沒有夜間行動。",
    remind: "十人局原本沒有外來者。男爵在場就會變成五鎮民、兩外來者、兩爪牙、一惡魔。",
  },
  imp: {
    id: "imp",
    name: "小惡魔",
    en: "Imp",
    type: "demon",
    ability: "除了首夜，每夜選一名玩家，他死亡。如果你選自己，你死亡，一名存活爪牙變成小惡魔。僧侶保護、士兵，以及你自己中毒，都會讓這次殺害落空，而且不能改選。",
    remind: "首夜你不殺人。七人以上時，首夜你會得知爪牙是誰，以及三個不在場的善良角色，用來假扮。",
  },
};

export const TOWNSFOLK = (Object.values(ROLES).filter((r) => r.type === "townsfolk").map((r) => r.id));
export const OUTSIDERS = (Object.values(ROLES).filter((r) => r.type === "outsider").map((r) => r.id));
export const MINIONS = (Object.values(ROLES).filter((r) => r.type === "minion").map((r) => r.id));
export const DEMONS: RoleId[] = ["imp"];

export const FIRST_NIGHT: string[] = [
  "minion",
  "demon",
  "poisoner",
  "spy",
  "washerwoman",
  "librarian",
  "investigator",
  "chef",
  "empath",
  "fortune",
  "butler",
];

export const OTHER_NIGHT: string[] = [
  "poisoner",
  "monk",
  "spy",
  "scarlet",
  "imp",
  "ravenkeeper",
  "undertaker",
  "empath",
  "fortune",
  "butler",
];

export function roleName(id: RoleId): string {
  return ROLES[id].name;
}

export function alignmentOf(type: RoleType): "good" | "evil" {
  return type === "minion" || type === "demon" ? "evil" : "good";
}

/** 核心人數表。本聊天桌固定十人，表上其餘列用來學規則。 */
export const SETUP_TABLE: { players: number; townsfolk: number; outsider: number; minion: number; demon: number }[] = [
  { players: 5, townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
  { players: 6, townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
  { players: 7, townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
  { players: 8, townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
  { players: 9, townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
  { players: 10, townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
  { players: 11, townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
  { players: 12, townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
  { players: 13, townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
  { players: 14, townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
  { players: 15, townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
];
