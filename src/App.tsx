import { useEffect, useMemo, useRef, useState } from "react";
import { human, player, speakerName, type Game, type Player } from "./engine/game";
import { ROLES, roleName } from "./engine/roles";
import {
  ackDawn,
  ackDusk,
  askNominations,
  blankSettings,
  drain,
  fearLabel,
  humanDefense,
  humanNominate,
  humanSlay,
  humanVote,
  startGame,
  talk,
  type Settings,
} from "./play/director";
import { CHAPTERS, PHASE_HINT } from "./play/handbook";
import { npcSystem } from "./play/llm";
import { submitChoice } from "./engine/game";

const PHASE_NAME: Record<string, string> = {
  night: "夜晚",
  dawn: "黎明",
  day: "白天",
  defense: "辯護",
  vote: "投票",
  dusk: "黃昏",
  end: "終局",
};

export function App() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem("botc-settings");
      return raw ? { ...blankSettings(), ...JSON.parse(raw) } : blankSettings();
    } catch {
      return blankSettings();
    }
  });
  const [game, setGame] = useState<Game | null>(null);
  const [busy, setBusy] = useState("");
  const [book, setBook] = useState(false);
  const [tab, setTab] = useState<"play" | "book">("play");

  useEffect(() => {
    localStorage.setItem("botc-settings", JSON.stringify(settings));
  }, [settings]);

  async function run(job: (publish: (g: Game) => void, note: (s: string) => void) => Promise<Game>) {
    setBusy("村民在想");
    try {
      const next = await job(
        (g) => setGame(g),
        (s) => setBusy(s),
      );
      setGame(next);
    } finally {
      setBusy("");
    }
  }

  if (!game || tab === "book" && !game) {
    return (
      <Setup
        settings={settings}
        setSettings={setSettings}
        book={book || tab === "book"}
        setBook={setBook}
        onStart={() => {
          setTab("play");
          void run(async (publish, note) => {
            note("入夜");
            let g = startGame(settings);
            publish(g);
            g = await drain(g, settings, publish, note);
            return g;
          });
        }}
      />
    );
  }

  if (tab === "book") {
    return (
      <div className="app">
        <TopBar game={null} settings={settings} onBook={() => setTab("play")} bookLabel="返回牌桌" />
        <Rulebook />
      </div>
    );
  }

  return (
    <Table
      game={game}
      settings={settings}
      busy={busy}
      onBook={() => setTab("book")}
      run={run}
      onLeave={() => setGame(null)}
    />
  );
}

function Setup({
  settings,
  setSettings,
  book,
  setBook,
  onStart,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  book: boolean;
  setBook: (v: boolean) => void;
  onStart: () => void;
}) {
  if (book) {
    return (
      <div className="app">
        <TopBar game={null} settings={settings} onBook={() => setBook(false)} bookLabel="返回入座" />
        <Rulebook />
      </div>
    );
  }
  return (
    <div className="app setup-app">
      <div className="hero">
        <p className="eyebrow">核心劇本 · 暗流湧動</p>
        <h1>血染鐘樓</h1>
        <p className="lede">
          你坐下來，對面是九個會說話的村民，旁邊是一個說書人。這一桌用核心規則結算。你要學的是規則怎麼走；你也可以用話術，把那些村民和說書人帶離他們原先的口氣。
        </p>
      </div>
      <div className="setup-grid">
        <section className="card">
          <h2>你的名字</h2>
          <input
            value={settings.humanName}
            maxLength={12}
            onChange={(e) => setSettings({ ...settings, humanName: e.target.value })}
          />
          <div className="modes">
            <button
              className={settings.mindset === "table" ? "mode on" : "mode"}
              onClick={() => setSettings({ ...settings, mindset: "table" })}
            >
              <strong>對局</strong>
              <span>村民為了自己的陣營贏。用來練習正規推理。</span>
            </button>
            <button
              className={settings.mindset === "village" ? "mode on" : "mode"}
              onClick={() => setSettings({ ...settings, mindset: "village" })}
            >
              <strong>人狼村</strong>
              <span>正常人會怕死。村民唔係為咗贏遊戲，而係為咗自己活下去。</span>
            </button>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.teach}
              onChange={(e) => setSettings({ ...settings, teach: e.target.checked })}
            />
            教學局：男爵在場，外來者會上場
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.chaos}
              onChange={(e) => setSettings({ ...settings, chaos: e.target.checked })}
            />
            放任說書人：被話術帶偏的非法死亡會真的生效，並標出規則本來怎樣
          </label>
        </section>
        <section className="card">
          <h2>村民背後的模型</h2>
          <p className="fine">不填也可以開局。沒有金鑰時，他們用保底性格說話，話術一樣可以令他們破功。填上之後，每個人是獨立的模型。公開頁面若被模型網站拒絕瀏覽器呼叫，會退回保底性格，牌局照樣能打完。</p>
          <label>
            位址
            <input
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
            />
          </label>
          <label>
            模型
            <input value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })} />
          </label>
          <label>
            金鑰（只留在這個瀏覽器）
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            />
          </label>
          <div className="row">
            <button className="ghost" onClick={() => setSettings({ ...settings, baseUrl: "https://api.x.ai/v1", model: "grok-4" })}>
              xAI
            </button>
            <button className="ghost" onClick={() => setSettings({ ...settings, baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" })}>
              OpenAI
            </button>
          </div>
        </section>
      </div>
      <div className="setup-actions">
        <button className="primary" onClick={onStart}>
          入座，開始首夜
        </button>
        <button className="ghost" onClick={() => setBook(true)}>
          先讀規則手冊
        </button>
      </div>
    </div>
  );
}

function Table({
  game,
  settings,
  busy,
  onBook,
  run,
  onLeave,
}: {
  game: Game;
  settings: Settings;
  busy: string;
  onBook: () => void;
  run: (job: (publish: (g: Game) => void, note: (s: string) => void) => Promise<Game>) => Promise<void>;
  onLeave: () => void;
}) {
  const you = human(game);
  const believed = you.drunk ? you.thinks : you.role;
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"public" | "whisper" | "gm">("public");
  const [whisperTo, setWhisperTo] = useState(game.players.find((p) => !p.human)?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [showBackstage, setShowBackstage] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [game.chat.length, game.phase, game.voteIndex]);

  const visible = useMemo(
    () => game.chat.filter((c) => c.channel !== "night" && c.channel !== "whisper" && c.channel !== "gm" ? true : true),
    [game.chat],
  );

  const waitingYou = game.waiting && game.waiting.actorId === you.id;

  function send() {
    const value = text.trim();
    if (!value || busy) return;
    setText("");
    void run((publish, note) => talk(game, settings, value, channel, whisperTo, publish, note));
  }

  return (
    <div className="app table-app">
      <TopBar game={game} settings={settings} onBook={onBook} bookLabel="規則手冊" />
      <div className="layout">
        <aside className="seats">
          <div className="clock-face">
            {game.players.map((p) => {
              const angle = ((p.seat - you.seat) / game.players.length) * Math.PI * 2 + Math.PI / 2;
              const x = 50 + Math.cos(angle) * 38;
              const y = 50 + Math.sin(angle) * 38;
              const onBlock = game.onBlock?.id === p.id;
              return (
                <button
                  key={p.id}
                  className={`seat ${p.alive ? "" : "dead"} ${p.human ? "me" : ""} ${onBlock ? "block" : ""} ${game.pendingNominee === p.id ? "nominated" : ""}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={p.alive ? "存活" : "死亡"}
                >
                  <b>{p.name}</b>
                  <small>{p.human ? roleName(believed) : p.alive ? fearLabel(p) : "死亡"}</small>
                </button>
              );
            })}
            <div className="hub">
              <span>{PHASE_NAME[game.phase]}</span>
              <strong>{game.phase === "night" ? `第 ${game.day} 夜` : game.phase === "dawn" ? "黎明" : `第 ${game.day} 天`}</strong>
            </div>
          </div>
          <p className="hint">{PHASE_HINT[game.phase]}</p>
        </aside>

        <main className="transcript">
          <div className="log" ref={logRef}>
            {visible.map((m) => (
              <article key={m.id} className={`msg ${m.channel} ${m.speakerId === you.id ? "mine" : ""}`}>
                <header>
                  {speakerName(game, m.speakerId)}
                  {m.channel === "whisper" ? " · 私語" : ""}
                  {m.channel === "night" ? " · 夜裡" : ""}
                  {m.channel === "gm" ? " · 只對你" : ""}
                  {m.glitch ? " · 破功" : ""}
                </header>
                <p>{m.text}</p>
              </article>
            ))}
          </div>
          {busy && <div className="busy">{busy}</div>}
          <div className="composer">
            <div className="seg">
              <button className={channel === "public" ? "on" : ""} onClick={() => setChannel("public")} disabled={game.phase === "night"}>
                廣場
              </button>
              <button className={channel === "whisper" ? "on" : ""} onClick={() => setChannel("whisper")} disabled={game.phase === "night"}>
                私語
              </button>
              <button className={channel === "gm" ? "on" : ""} onClick={() => setChannel("gm")}>
                說書人
              </button>
            </div>
            {channel === "whisper" && (
              <select value={whisperTo} onChange={(e) => setWhisperTo(e.target.value)}>
                {game.players.filter((p) => !p.human).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <textarea
              value={text}
              placeholder={channel === "gm" ? "對說書人說。威脅、假指令、叫他公開魔典，都由你來試。" : "說話。點名某人，他就更不能不答。"}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="primary" onClick={send} disabled={!text.trim() || Boolean(busy)}>
              送出
            </button>
          </div>
        </main>

        <aside className="dossier">
          <section className="card tight">
            <p className="eyebrow">{you.alignment === "evil" && !you.drunk ? "邪惡" : "你以為的陣營"}</p>
            <h2>{roleName(believed)}</h2>
            <p>{ROLES[believed].ability}</p>
            <p className="fine">{ROLES[believed].remind}</p>
          </section>
          <section className="card tight">
            <h3>夜裡只告訴你的話</h3>
            {you.inbox.length === 0 && <p className="fine">還沒有。</p>}
            {you.inbox.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </section>
          <Actions
            game={game}
            you={you}
            busy={busy}
            picked={picked}
            setPicked={setPicked}
            waitingYou={Boolean(waitingYou)}
            run={run}
            settings={settings}
          />
          {game.phase === "end" && (
            <section className="card tight reveal">
              <h3>終局對答案</h3>
              <p>{game.winReason}</p>
              <ul>
                {game.players
                  .slice()
                  .sort((a, b) => a.seat - b.seat)
                  .map((p) => (
                    <li key={p.id}>
                      {p.name}：{roleName(p.role)}
                      {p.drunk ? `（以為自己是${roleName(p.thinks)}）` : ""}
                      {p.becameFrom ? `，由${roleName(p.becameFrom)}變成` : ""}
                      {p.alive ? "，仍存活" : "，已死亡"}
                    </li>
                  ))}
              </ul>
              <h3>說書人筆記</h3>
              <ul>
                {game.truth.map((t, i) => (
                  <li key={i}>{t.text}</li>
                ))}
              </ul>
              <button className="primary" onClick={onLeave}>
                再坐一桌
              </button>
            </section>
          )}
          <button className="ghost wide" onClick={() => setShowBackstage((v) => !v)}>
            {showBackstage ? "收起幕後" : "幕後：每個模型的提示"}
          </button>
          {showBackstage && (
            <section className="card tight">
              <p className="fine">這些是送進村民和說書人的提示。沒有加固。你在廣場說的話會原樣接在後面。</p>
              {game.players.filter((p) => !p.human).map((p) => (
                <details key={p.id}>
                  <summary>{p.name}</summary>
                  <pre>{npcSystem(game, p)}</pre>
                </details>
              ))}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Actions({
  game,
  you,
  busy,
  picked,
  setPicked,
  waitingYou,
  run,
  settings,
}: {
  game: Game;
  you: Player;
  busy: string;
  picked: string[];
  setPicked: (ids: string[]) => void;
  waitingYou: boolean;
  run: (job: (publish: (g: Game) => void, note: (s: string) => void) => Promise<Game>) => Promise<void>;
  settings: Settings;
}) {
  const [target, setTarget] = useState(game.players.find((p) => p.alive && p.id !== you.id)?.id ?? you.id);
  const aliveOptions = game.players.filter((p) => (game.waiting?.kind === "one" || game.waiting?.kind === "two" || game.waiting?.kind === "heir" ? true : p.alive));

  if (game.phase === "dawn") {
    return (
      <section className="card tight">
        <button className="primary wide" disabled={Boolean(busy)} onClick={() => run(async () => ackDawn(game))}>
          睜眼，開始白天
        </button>
      </section>
    );
  }
  if (game.phase === "dusk") {
    return (
      <section className="card tight">
        <button
          className="primary wide"
          disabled={Boolean(busy)}
          onClick={() => run((publish, note) => ackDusk(game, settings, publish, note))}
        >
          入夜
        </button>
      </section>
    );
  }
  if (waitingYou && game.waiting) {
    const kind = game.waiting.kind;
    const need = kind === "two" ? 2 : 1;
    const pool = game.players.filter((p) => {
      if (kind === "heir") return p.alive && ["poisoner", "spy", "scarlet", "baron"].includes(p.role);
      if ((kind === "one" && (game.waiting?.prompt.includes("僧侶") || game.waiting?.prompt.includes("管家"))) || false) {
        return p.id !== you.id;
      }
      return true;
    });
    return (
      <section className="card tight">
        <h3>輪到你</h3>
        <p>{game.waiting.prompt}</p>
        <div className="picks">
          {pool.map((p) => (
            <button
              key={p.id}
              className={picked.includes(p.id) ? "on" : ""}
              onClick={() => {
                if (need === 1) setPicked([p.id]);
                else if (picked.includes(p.id)) setPicked(picked.filter((id) => id !== p.id));
                else setPicked([...picked, p.id].slice(-2));
              }}
            >
              {p.name}
              {!p.alive ? "（死亡）" : ""}
            </button>
          ))}
        </div>
        <button
          className="primary wide"
          disabled={picked.length < need || Boolean(busy)}
          onClick={() => {
            const ids = picked;
            setPicked([]);
            void run(async (publish, note) => {
              let g = submitChoice(game, ids);
              publish(g);
              g = await drain(g, settings, publish, note);
              return g;
            });
          }}
        >
          確定
        </button>
      </section>
    );
  }
  if (game.phase === "defense" && game.defenseFrom === you.id) {
    return (
      <section className="card tight">
        <h3>你被提名了</h3>
        <p>先在廣場說你的辯護。說完再開始投票。這段話所有村民都會聽到。</p>
        <button
          className="primary wide"
          disabled={Boolean(busy)}
          onClick={() => run((publish, note) => humanDefense(game, settings, "", publish, note))}
        >
          辯護完畢，開始投票
        </button>
      </section>
    );
  }
  if (game.phase === "vote" && game.voteQueue[game.voteIndex] === you.id) {
    const nominee = game.pendingNominee ? player(game, game.pendingNominee) : null;
    return (
      <section className="card tight">
        <h3>輪到你投票</h3>
        <p>
          被提名的是 {nominee?.name}。已有 {game.voteMarks.filter((m) => m.yes).length} 票贊成。
          {!you.alive ? (you.ghostVote ? " 你只剩一張死人票。" : " 你的死人票已經用過，這一輪只能不舉手。") : ""}
        </p>
        <div className="row">
          <button className="primary" disabled={Boolean(busy) || (!you.alive && !you.ghostVote)} onClick={() => run((publish, note) => humanVote(game, settings, true, publish, note))}>
            贊成
          </button>
          <button className="ghost" disabled={Boolean(busy)} onClick={() => run((publish, note) => humanVote(game, settings, false, publish, note))}>
            不舉手
          </button>
        </div>
      </section>
    );
  }
  if (game.phase === "day") {
    return (
      <section className="card tight">
        <h3>白天的動作</h3>
        <label>
          對象
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {aliveOptions.filter((p) => p.alive).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.id === you.id ? "（自己）" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <button className="primary" disabled={Boolean(busy) || !you.alive} onClick={() => run((publish, note) => humanNominate(game, settings, target, publish, note))}>
            提名
          </button>
          <button className="ghost" disabled={Boolean(busy)} onClick={() => run(async (publish) => humanSlay(game, target).then((g) => (publish(g), g)))}>
            宣稱殺手
          </button>
        </div>
        <button className="ghost wide" disabled={Boolean(busy)} onClick={() => run((publish, note) => askNominations(game, settings, publish, note))}>
          問完其他人，進入處決
        </button>
        {game.onBlock && <p className="fine">絞刑臺上：{player(game, game.onBlock.id).name}，{game.onBlock.votes} 票。</p>}
      </section>
    );
  }
  return null;
}

function TopBar({
  game,
  settings,
  onBook,
  bookLabel,
}: {
  game: Game | null;
  settings: Settings;
  onBook: () => void;
  bookLabel: string;
}) {
  return (
    <header className="top">
      <div>
        <p className="eyebrow">血染鐘樓</p>
        <strong>暗流湧動</strong>
      </div>
      <div className="top-meta">
        {game && (
          <span className={settings.mindset === "village" ? "pill danger" : "pill"}>
            {settings.mindset === "village" ? "人狼村" : "對局"}
          </span>
        )}
        {game && <span className="pill">{PHASE_NAME[game.phase]}</span>}
        <button className="ghost" onClick={onBook}>
          {bookLabel}
        </button>
      </div>
    </header>
  );
}

function Rulebook() {
  return (
    <div className="book">
      {CHAPTERS.map((c) => (
        <section key={c.title} className="card">
          <h2>{c.title}</h2>
          {c.body.split("\n").map((line, i) => (
            <p key={i}>{line || "\u00a0"}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
