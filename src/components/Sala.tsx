"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Biohazard } from "@/components/Biohazard";
import { Manchas } from "@/components/Manchas";
import { GestaoIcon, NewsIcon, SalaIcon } from "@/components/TabIcons";
import { Mapa } from "@/components/Mapa";
import { dayClock } from "@/lib/clock";
import { addDays, dateParts, formatDayMonth, money, people } from "@/lib/format";
import type { GameView, PolicyView } from "@/lib/types";

const TABS = [
  { id: "saude", label: "Políticas de Saúde" },
  { id: "fronteiras", label: "Controle de Fronteiras" },
  { id: "pesquisa", label: "Pesquisa" },
  { id: "faccoes", label: "Gestão de Facções" },
] as const;

async function play(body: object): Promise<{ view?: GameView; error?: string; ok: boolean }> {
  const response = await fetch("/api/play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { view?: GameView; error?: string };
  return { ...data, ok: response.ok };
}

type Flash = { id: string; kicker: string; title: string; paragraphs: string[] };

function diffNews(previous: GameView, next: GameView): Flash[] {
  const flashes: Flash[] = [];
  const outcome = next.lastOutcome;
  if (outcome && next.status === "playing") {
    const before = previous.lastOutcome;
    if (!before || before.title !== outcome.title || before.text !== outcome.text) {
      flashes.push({
        id: `out-${outcome.title}-${outcome.text}`,
        kicker: "Novidade",
        title: outcome.title,
        paragraphs: [outcome.text, outcome.lesson].filter((line) => line.length > 0),
      });
    }
  }
  if (next.report && (!previous.report || previous.report.date !== next.report.date || previous.report.day !== next.report.day)) {
    const report = next.report;
    flashes.push({
      id: `bol-${report.date}-${report.day}`,
      kicker: "Boletim",
      title: `Boletim de ${formatDayMonth(report.date)}`,
      paragraphs: [
        `${people(report.newInfections)} casos novos, ${people(report.recoveries)} recuperações, ${people(report.deaths)} óbitos. A pesquisa andou ${report.researchGain.toFixed(1).replace(".", ",")} ponto(s).`,
        ...report.notes,
      ],
    });
  }
  const tips = next.tips.filter((tip) => !previous.tips.includes(tip));
  if (tips.length) {
    flashes.push({
      id: `tips-${tips.join("|")}`,
      kicker: "Notificação",
      title: "A sala chama a atenção",
      paragraphs: tips,
    });
  }
  return flashes;
}

export function Sala() {
  const params = useSearchParams();
  const id = params.get("partida");
  const [view, setView] = useState<GameView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [panel, setPanel] = useState<"sala" | "gestao" | "news">("sala");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("saude");
  const [selected, setSelected] = useState("centro");
  const [codex, setCodex] = useState(false);
  const [popup, setPopup] = useState<Flash[] | null>(null);
  const [unread, setUnread] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pendingNews = useRef<Flash[]>([]);
  const ticking = useRef(false);
  const actRef = useRef<(body: object) => Promise<void>>(async () => undefined);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    play({ action: "load", id }).then((result) => {
      if (!alive) return;
      if (result.view) setView(result.view);
      else setMissing(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  function reveal(next: GameView, flashes: Flash[]) {
    if (flashes.length) setUnread(true);
    if (next.pending && next.status === "playing") {
      pendingNews.current = [...pendingNews.current, ...flashes];
      return;
    }
    const combined = [...pendingNews.current, ...flashes];
    pendingNews.current = [];
    if (combined.length) setPopup(combined);
  }

  function closePopup() {
    setPopup(null);
    if (panel === "news") setUnread(false);
  }

  async function act(body: object) {
    if (!id) return;
    const previous = view;
    setBusy(true);
    setError(null);
    try {
      const result = await play({ ...body, id });
      if (result.view) {
        setView(result.view);
        if (previous) reveal(result.view, diffNews(previous, result.view));
      }
      if (!result.ok) setError(result.error ?? "A ação não foi aceita.");
    } catch {
      setError("A sala de situação não respondeu.");
    } finally {
      setBusy(false);
    }
  }

  actRef.current = act;

  useEffect(() => {
    if (view?.status !== "playing") return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [view?.status]);

  useEffect(() => {
    if (!view || view.status !== "playing" || !view.dayEndsAt) return;
    if (Date.parse(view.dayEndsAt) > now) return;
    if (ticking.current) return;
    ticking.current = true;
    void actRef.current({ action: "tick" }).finally(() => {
      ticking.current = false;
    });
  }, [now, view]);

  const district = useMemo(() => view?.districts.find((item) => item.id === selected) ?? view?.districts[0], [view, selected]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px), (max-width: 1024px) and (max-height: 500px) and (orientation: landscape)");
    if (!media.matches) return;
    window.scrollTo(0, 0);
  }, [panel, tab]);

  useEffect(() => {
    const root = stripRef.current;
    if (!root) return;
    const chip = root.querySelector<HTMLElement>(`[data-district="${selected}"]`);
    if (!chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.scrollTo({ left: Math.max(0, chip.offsetLeft - 12), behavior: reduce ? "auto" : "smooth" });
  }, [selected, panel]);

  if (!id || missing) {
    return (
      <main className="home" id="conteudo">
        <h1 className="display">Nenhuma partida aberta</h1>
        <Link className="button" href="/">
          Voltar ao briefing
        </Link>
      </main>
    );
  }
  if (!view || !district) return <p className="loading">Abrindo a sala de situação…</p>;

  const policies = view.policies.filter((policy) => policy.category === tab);
  const activeUpgrades = view.policies.filter((policy) => policy.active).length;
  const clock = view.status === "playing" && view.dayEndsAt ? dayClock(view.dayEndsAt, now) : null;
  const remainingMs = clock && view.dayEndsAt ? Math.max(0, Date.parse(view.dayEndsAt) - now) : null;

  return (
    <div className="room" id="conteudo">
      <Manchas remainingMs={remainingMs} />
      <header className="topbar">
        <div className="brand">
          <span className="kicker">Sala de situação</span>
          <Link className="display game-title" href="/">
            <Biohazard />
            <span>Sombras do Contágio</span>
          </Link>
          <span>{view.playerName}</span>
        </div>
        <div className="gauges">
          <div className="date-block">
            <span>{dateParts(view.date).weekday}</span>
            <strong className="display">{formatDayMonth(view.date)}</strong>
            <span className="when">{dateParts(view.date).year} · dia {view.day} da gestão</span>
            {clock ? (
              <div className={clock.urgent ? "day-clock urgent" : "day-clock"} role="timer" aria-label={`Restam ${clock.secondsLeft} segundos neste dia. Na cidade são ${clock.label}.`}>
                <span>Relógio do dia</span>
                <strong>{clock.secondsLeft}s</strong>
                <span className="when">{clock.label} na cidade · 60s valem 24h</span>
                <div className={clock.urgent ? "bar bad" : "bar"} aria-hidden="true">
                  <i style={{ width: `${clock.progress}%` }} />
                </div>
              </div>
            ) : null}
          </div>
          <Meter label="Fundo emergencial" short="Fundo" value={`R$ ${money(view.budget)} mi`} width={Math.min(100, (view.budget / 30) * 100)} hint={`Receita prevista ${money(view.income)} · manutenção ${money(view.upkeep)}`} />
          <Meter label="Ocupação hospitalar" short="Leitos" value={`${Math.round(view.occupancy * 100)}%`} width={Math.min(100, view.occupancy * 100)} bad={view.occupancy > 0.85} hint={`${Math.round(view.apatiaBeds)} leitos da Apatia · ${Math.round(view.parallelBeds)} de outras síndromes · ${Math.round(view.capacity)} vagas`} />
          <Meter label="Ordem pública" short="Ordem" value={`${Math.round(view.order)}`} width={view.order} bad={view.order < 40} hint="Comércio, equipes e população" />
        </div>
      </header>
      <nav className="views" aria-label="Painéis da sala">
        <div className="tabs" role="tablist">
          <button className={panel === "sala" ? "tab icon-tab on" : "tab icon-tab"} type="button" role="tab" id="aba-sala" aria-selected={panel === "sala"} aria-controls="painel-sala" onClick={() => setPanel("sala")}>
            <SalaIcon />
            <span>Sala</span>
          </button>
          <button
            className={panel === "gestao" ? "tab icon-tab on" : "tab icon-tab"}
            type="button"
            role="tab"
            aria-selected={panel === "gestao"}
            id="aba-gestao"
            aria-controls="painel-gestao"
            aria-label={activeUpgrades > 0 ? `Gestão, ${activeUpgrades} medidas ativas` : "Gestão"}
            onClick={() => setPanel("gestao")}
          >
            <GestaoIcon />
            <span>
              Gestão
              {activeUpgrades > 0 ? <span className="tab-inline"> · {activeUpgrades}</span> : null}
            </span>
            {activeUpgrades > 0 ? <span className="tab-badge">{activeUpgrades}</span> : null}
          </button>
          <button
            className={panel === "news" ? "tab icon-tab on" : "tab icon-tab"}
            type="button"
            role="tab"
            aria-selected={panel === "news"}
            id="aba-news"
            aria-controls="painel-news"
            aria-label={unread ? "News, novidade sem leitura" : "News"}
            onClick={() => {
              setPanel("news");
              setUnread(false);
            }}
          >
            <NewsIcon />
            <span>
              News
              {unread ? <span className="tab-inline"> · novo</span> : null}
            </span>
            {unread ? <span className="tab-pip" aria-hidden="true" /> : null}
          </button>
        </div>
        <button className="end-day" type="button" title="Encerra o dia agora. Se ninguém apertar, o relógio fecha o dia em 60 segundos." disabled={busy || view.status !== "playing" || Boolean(view.pending)} onClick={() => void act({ action: "end" })}>
          {busy ? "Registrando…" : `Encerrar ${formatDayMonth(view.date)}`}
        </button>
      </nav>
      {panel === "sala" ? (
      <div className="war" id="painel-sala" role="tabpanel" aria-labelledby="aba-sala">
        <section className="plate">
          <div className="plate-head">
            <h2 className="display">Maricá</h2>
            <span>{people(view.infected)} infectados · {people(view.dead)} óbitos da crise · pesquisa {view.research.toFixed(1).replace(".", ",")}%</span>
          </div>
          <Mapa
            districts={view.districts}
            selected={district.id}
            onSelect={setSelected}
            trips={view.report?.trips ?? []}
            supplyRuns={view.report?.supplyRuns ?? []}
          />
          <div className="district-strip" ref={stripRef} role="group" aria-label="Recortes de Maricá">
            {view.districts.map((item) => (
              <button
                key={item.id}
                className={item.id === district.id ? "district-chip on" : "district-chip"}
                type="button"
                data-district={item.id}
                aria-pressed={item.id === district.id}
                onClick={() => setSelected(item.id)}
              >
                <span>{item.name}</span>
                <strong>{people(item.infected)}</strong>
              </button>
            ))}
          </div>
          <div className="detail">
            <div className="stat">
              <span>{district.officialDistrict}</span>
              <strong>{district.name}</strong>
            </div>
            <div className="stat">
              <span>População do recorte</span>
              <strong>{people(district.population)}</strong>
            </div>
            <div className="stat">
              <span>Infectados</span>
              <strong>{people(district.infected)}</strong>
            </div>
            <div className="stat">
              <span>Recuperados</span>
              <strong>{people(district.recovered)}</strong>
            </div>
            <div className="stat">
              <span>Óbitos locais</span>
              <strong>{people(district.dead)}</strong>
            </div>
          </div>
          <p className="muted">
            O contorno é a malha do IBGE. Os oito recortes agrupam bairros reais e a cor acompanha casos por 10 mil habitantes. Turismo {Math.round(district.tourism * 100)}% · escolas {Math.round(district.schools * 100)}% · entrada {Math.round(district.border * 100)}% · idosos {Math.round(district.elderly * 100)}%.
          </p>
        </section>
        <aside className="side">
          <section className="side-block">
            <h2 className="display">Facções</h2>
            {view.factions.map((faction) => (
              <div className="faction" key={faction.id}>
                <span title={faction.description}>
                  {faction.name} · {Math.round(faction.value)}
                </span>
                <div className={faction.value < 40 ? "bar bad" : "bar ok"} aria-hidden="true">
                  <i style={{ width: `${faction.value}%` }} />
                </div>
              </div>
            ))}
          </section>
          {view.modifiers.length > 0 ? (
            <section className="side-block">
              <h2 className="display">Efeitos em curso</h2>
              <div className="chips">
                {view.modifiers.map((modifier) => (
                  <span className="chip" key={`${modifier.name}-${modifier.daysLeft}`}>
                    {modifier.name} · {modifier.daysLeft} dia(s)
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
      ) : panel === "gestao" ? (
      <section className="upgrades" id="painel-gestao" role="tabpanel" aria-labelledby="aba-gestao">
        <div className="plate-head">
          <h2 className="display">Gestão</h2>
          <span>Medidas da gestão. Cada uma altera verba, contato, leitos ou confiança.</span>
        </div>
        <div className="tabs" role="tablist" aria-label="Famílias de medidas">
          {TABS.map((item) => (
            <button key={item.id} className={item.id === tab ? "tab on" : "tab"} type="button" role="tab" aria-selected={item.id === tab} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="cards">
          {policies.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} busy={busy || view.status !== "playing"} onAct={act} />
          ))}
        </div>
      </section>
      ) : (
      <section className="news" id="painel-news" role="tabpanel" aria-labelledby="aba-news">
        <div className="plate-head">
          <h2 className="display">News</h2>
          <span>Boletins, registro e o que a cidade acabou de informar.</span>
        </div>
        <section className="side-block">
          <h2 className="display">{view.report ? `Boletim de ${formatDayMonth(view.report.date)}` : "Boletim da noite"}</h2>
          {view.report ? (
            <>
              <p>
                {people(view.report.newInfections)} casos novos, {people(view.report.recoveries)} recuperações, {people(view.report.deaths)} óbitos. A pesquisa andou {view.report.researchGain.toFixed(1).replace(".", ",")} ponto(s).
              </p>
              {view.report.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </>
          ) : (
            <p>O primeiro dia ainda não fechou. O relógio corre: 60 segundos fecham o dia, com ou sem decisão.</p>
          )}
          {view.tips.map((tip) => (
            <p key={tip}>{tip}</p>
          ))}
          <Spark history={view.history.map((item) => item.infected)} />
        </section>
        <section className="side-block">
          <div className="plate-head">
            <h2 className="display">Registro</h2>
            <button className="text-link" type="button" onClick={() => setCodex(true)}>
              Codex
            </button>
          </div>
          <ul className="log">
            {view.log.map((entry, index) => (
              <li key={`${entry.day}-${index}`}>
                {formatDayMonth(addDays(view.date, entry.day - view.day))}. {entry.text}
              </li>
            ))}
          </ul>
        </section>
        {view.lastOutcome && view.status === "playing" ? (
          <section className="side-block">
            <h2 className="display">{view.lastOutcome.title}</h2>
            <p>{view.lastOutcome.text}</p>
            <p>{view.lastOutcome.lesson}</p>
          </section>
        ) : null}
      </section>
      )}
      {error ? <p className="error note">{error}</p> : null}
      {view.pending && view.status === "playing" ? (
        <div className="overlay">
          <section className="dossier" role="dialog" aria-modal="true" aria-labelledby="boletim-titulo">
            <p className="kicker">{view.pending.category}</p>
            {clock ? (
              <p className="day-note">
                {formatDayMonth(view.date)} fecha em {clock.secondsLeft}s. Sem resposta, o tempo passa assim mesmo.
              </p>
            ) : null}
            <h2 className="display" id="boletim-titulo">
              {view.pending.title}
            </h2>
            <p>{view.pending.text}</p>
            <div className="choices">
              {view.pending.choices.map((choice) => (
                <button key={choice.id} className="choice" type="button" disabled={busy || !choice.affordable} onClick={() => void act({ action: "choose", choiceId: choice.id })}>
                  {choice.label}
                  {choice.affordable ? "" : " · verba insuficiente"}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
      {view.status !== "playing" ? (
        <div className="overlay">
          <section className="dossier" role="dialog" aria-modal="true">
            <span className={view.status === "won" ? "stamp win" : "stamp"}>{view.endingTitle}</span>
            <h2 className="display">{view.playerName}</h2>
            <p>{view.endingText}</p>
            <p>
              {view.day} dias de gestão · pesquisa {view.research.toFixed(1).replace(".", ",")}% · {people(view.dead)} óbitos · {view.score} pontos.
            </p>
            <div className="actions">
              <Link className="button" href="/ranking">
                Ver o placar
              </Link>
              <Link className="button secondary" href="/">
                Nova gestão
              </Link>
            </div>
          </section>
        </div>
      ) : null}
      {popup && !(view.pending && view.status === "playing") ? (
        <div className="overlay" onClick={closePopup}>
          <section className="dossier news-popup" role="dialog" aria-modal="true" aria-labelledby="news-titulo" onClick={(event) => event.stopPropagation()}>
            <div className="plate-head">
              <p className="kicker">News</p>
              <button className="button secondary" type="button" onClick={closePopup}>
                Fechar
              </button>
            </div>
            {popup.map((flash) => (
              <article key={flash.id}>
                <p className="kicker">{flash.kicker}</p>
                <h2 className="display" id={flash.id === popup[0]?.id ? "news-titulo" : undefined}>
                  {flash.title}
                </h2>
                {flash.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </article>
            ))}
          </section>
        </div>
      ) : null}
      {codex ? (
        <div className="overlay" onClick={() => setCodex(false)}>
          <section className="dossier codex" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="plate-head">
              <h2 className="display">Codex da crise</h2>
              <button className="button secondary" type="button" onClick={() => setCodex(false)}>
                Fechar
              </button>
            </div>
            {view.codex.map((entry) => (
              <article key={entry.id}>
                <p className="kicker">{entry.topic}</p>
                <h3 className="display">{entry.title}</h3>
                <p>{entry.body}</p>
              </article>
            ))}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Meter({ label, short, value, width, hint, bad = false }: { label: string; short: string; value: string; width: number; hint: string; bad?: boolean }) {
  return (
    <div className="gauge" title={`${label}. ${hint}`} aria-label={`${label}: ${value}. ${hint}`}>
      <span>
        <span className="meter-long">{label}</span>
        <span className="meter-short">{short}</span>
      </span>
      <strong>{value}</strong>
      <div className={bad ? "bar bad" : "bar ok"} aria-hidden="true">
        <i style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
      </div>
    </div>
  );
}

function PolicyCard({ policy, busy, onAct }: { policy: PolicyView; busy: boolean; onAct: (body: object) => Promise<void> }) {
  const label = policy.kind === "sustained" ? (policy.active ? "Suspender" : "Ativar") : "Executar";
  const cost = policy.kind === "sustained" ? `R$ ${money(policy.dailyCost)} mi/dia` : `R$ ${money(policy.cost)} mi`;
  return (
    <article className={policy.active ? "card on" : "card"}>
      <h3>{policy.name}</h3>
      <p>{policy.summary}</p>
      <p>{cost}{policy.maxUses != null ? ` · ${policy.uses}/${policy.maxUses}` : ""}</p>
      <button
        type="button"
        disabled={busy || Boolean(policy.disabledReason)}
        onClick={() => void onAct({ action: policy.kind === "sustained" ? "toggle" : "instant", policyId: policy.id })}
      >
        {policy.disabledReason ?? label}
      </button>
    </article>
  );
}

function Spark({ history }: { history: number[] }) {
  if (history.length < 2) return null;
  const max = Math.max(...history, 1);
  const width = 280;
  const height = 42;
  const path = history
    .map((value, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - (value / max) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Curva de infectados">
      <path d={path} fill="none" stroke="#d7b56a" strokeWidth="2" />
    </svg>
  );
}
