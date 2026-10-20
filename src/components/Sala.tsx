"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mapa } from "@/components/Mapa";
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

export function Sala() {
  const params = useSearchParams();
  const id = params.get("partida");
  const [view, setView] = useState<GameView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("saude");
  const [selected, setSelected] = useState("centro");
  const [codex, setCodex] = useState(false);

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

  async function act(body: object) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const result = await play({ ...body, id });
      if (result.view) setView(result.view);
      if (!result.ok) setError(result.error ?? "A ação não foi aceita.");
    } catch {
      setError("A sala de situação não respondeu.");
    } finally {
      setBusy(false);
    }
  }

  const district = useMemo(() => view?.districts.find((item) => item.id === selected) ?? view?.districts[0], [view, selected]);

  if (!id || missing) {
    return (
      <main className="home" id="conteudo">
        <h1 className="display">Nenhuma partida aberta</h1>
        <a className="button" href="/">
          Voltar ao briefing
        </a>
      </main>
    );
  }
  if (!view || !district) return <p className="loading">Abrindo a sala de situação…</p>;

  const policies = view.policies.filter((policy) => policy.category === tab);

  return (
    <div className="room" id="conteudo">
      <header className="topbar">
        <div className="brand">
          <span className="kicker">Sala de situação</span>
          <a className="display" href="/">
            Sombras do Contágio
          </a>
          <span>{view.playerName}</span>
        </div>
        <div className="gauges">
          <div className="date-block">
            <span>{dateParts(view.date).weekday}</span>
            <strong className="display">{formatDayMonth(view.date)}</strong>
            <span className="when">{dateParts(view.date).year} · dia {view.day} da gestão</span>
          </div>
          <Meter label="Fundo emergencial" value={`R$ ${money(view.budget)} mi`} width={Math.min(100, (view.budget / 30) * 100)} hint={`Receita prevista ${money(view.income)} · manutenção ${money(view.upkeep)}`} />
          <Meter label="Ocupação hospitalar" value={`${Math.round(view.occupancy * 100)}%`} width={Math.min(100, view.occupancy * 100)} bad={view.occupancy > 0.85} hint={`${Math.round(view.apatiaBeds)} leitos da Apatia · ${Math.round(view.parallelBeds)} de outras síndromes · ${Math.round(view.capacity)} vagas`} />
          <Meter label="Ordem pública" value={`${Math.round(view.order)}`} width={view.order} bad={view.order < 40} hint="Comércio, equipes e população" />
        </div>
      </header>
      <div className="war">
        <section className="plate">
          <div className="plate-head">
            <h2 className="display">Maricá</h2>
            <span>{people(view.infected)} infectados · {people(view.dead)} óbitos da crise · pesquisa {view.research.toFixed(1).replace(".", ",")}%</span>
          </div>
          <Mapa districts={view.districts} selected={district.id} onSelect={setSelected} />
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
              <p>O primeiro dia ainda não fechou. Resolva o boletim e escolha as medidas antes de encerrar.</p>
            )}
            {view.tips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
            <Spark history={view.history.map((item) => item.infected)} />
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
          <section className="side-block">
            <div className="plate-head">
              <h2 className="display">Registro</h2>
              <button className="text-link" type="button" onClick={() => setCodex(true)}>
                Codex
              </button>
            </div>
            <ul className="log">
              {view.log.slice(0, 8).map((entry, index) => (
                <li key={`${entry.day}-${index}`}>
                  {formatDayMonth(addDays(view.date, entry.day - view.day))}. {entry.text}
                </li>
              ))}
            </ul>
          </section>
          {error ? <p className="error">{error}</p> : null}
          {view.lastOutcome && view.status === "playing" ? (
            <section className="side-block">
              <h2 className="display">{view.lastOutcome.title}</h2>
              <p>{view.lastOutcome.text}</p>
              <p>{view.lastOutcome.lesson}</p>
            </section>
          ) : null}
        </aside>
      </div>
      <footer className="dock">
        <div className="tabs" role="tablist">
          {TABS.map((item) => (
            <button key={item.id} className={item.id === tab ? "tab on" : "tab"} type="button" onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="dock-grid">
          <div className="cards">
            {policies.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} busy={busy || view.status !== "playing"} onAct={act} />
            ))}
          </div>
          <button className="end-day" type="button" disabled={busy || view.status !== "playing" || Boolean(view.pending)} onClick={() => void act({ action: "end" })}>
            {busy ? "Registrando…" : `Encerrar ${formatDayMonth(view.date)}`}
          </button>
        </div>
      </footer>
      {view.pending && view.status === "playing" ? (
        <div className="overlay">
          <section className="dossier" role="dialog" aria-modal="true" aria-labelledby="boletim-titulo">
            <p className="kicker">{view.pending.category}</p>
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
              <a className="button" href="/ranking">
                Ver o placar
              </a>
              <a className="button secondary" href="/">
                Nova gestão
              </a>
            </div>
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

function Meter({ label, value, width, hint, bad = false }: { label: string; value: string; width: number; hint: string; bad?: boolean }) {
  return (
    <div className="gauge" title={hint}>
      <span>{label}</span>
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
      <path d={path} fill="none" stroke="#e7c27a" strokeWidth="2" />
    </svg>
  );
}
