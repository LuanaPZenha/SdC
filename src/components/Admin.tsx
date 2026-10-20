"use client";

import { useState } from "react";
import { EFFECT_KEYS, type Catalog, type GameEvent, type Parameter } from "@/lib/types";
import { validateCatalog } from "@/lib/validate";

const TABS = ["Parâmetros", "Fórmulas", "Políticas", "Eventos", "Lições", "Dicas", "Bairros"] as const;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const VARIANT: GameEvent = {
  id: "variante-docente",
  title: "Nova variante",
  category: "Vigilância",
  priority: 46,
  opening: false,
  body: "Descreva aqui a linhagem nova. O texto aparece no boletim sem alteração de código.",
  lesson: "Explique o que muda na transmissão e qual medida passa a fazer sentido.",
  monthStart: null,
  monthEnd: null,
  dayStart: null,
  dayEnd: null,
  repeatable: false,
  cooldown: 20,
  trigger: { type: "all", all: [{ type: "random", chance: 0.08 }, { type: "metric", metric: "day", op: "gt", value: 10 }] },
  choices: [
    {
      id: "conter",
      label: "Ajustar a resposta",
      outcome: "A cidade reage à linhagem.",
      lesson: "Diga o que o estudante deve levar desta escolha.",
      effects: { budget: -1.5, betaAdd: 0.03, durationDays: 10 },
    },
    {
      id: "nao-agir",
      label: "Não agir",
      outcome: "A linhagem circula sem resposta dedicada.",
      lesson: "A omissão também ensina.",
      effects: { betaAdd: 0.08, durationDays: 12 },
    },
  ],
};

export function Admin() {
  const [key, setKey] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [storage, setStorage] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Parâmetros");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(adminKey: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin", { headers: { "x-admin-key": adminKey } });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Chave recusada.");
        setCatalog(null);
        return;
      }
      setCatalog(data.catalog);
      setStorage(data.storage);
      setMessage(null);
    } catch {
      setError("O painel não respondeu.");
    } finally {
      setBusy(false);
    }
  }

  async function save(next: Catalog, action?: "reset") {
    setBusy(true);
    setError(null);
    setMessage(null);
    if (!action) {
      const errors = validateCatalog(next);
      if (errors.length) {
        setError(errors.slice(0, 6).join(" "));
        setBusy(false);
        return;
      }
    }
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify(action === "reset" ? { action: "reset" } : { catalog: next }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError([data.error, ...(data.errors ?? [])].filter(Boolean).slice(0, 6).join(" "));
        return;
      }
      setCatalog(data.catalog);
      setStorage(data.storage);
      setMessage(action === "reset" ? "Conteúdo original restaurado." : "Conteúdo gravado. O próximo turno já usa estes dados.");
    } catch {
      setError("Falha ao gravar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-page" id="conteudo">
      <p className="kicker">Conteúdo editável</p>
      <h1 className="display">Painel docente</h1>
      <p className="lede">
        Políticas, eventos, parâmetros e as fórmulas de casos novos, óbitos, receita, pesquisa e pontuação ficam fora do código.
      </p>
      <p>
        <a className="text-link" href="/">
          Voltar ao briefing
        </a>
      </p>
      {!catalog ? (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            void load(key);
          }}
        >
          <label className="field">
            Chave do painel
            <input type="password" value={key} onChange={(event) => setKey(event.target.value)} />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="button" disabled={busy} type="submit">
            {busy ? "Abrindo…" : "Abrir o conteúdo"}
          </button>
        </form>
      ) : (
        <div className="admin-layout">
          <nav className="admin-nav">
            {TABS.map((item) => (
              <button key={item} className={tab === item ? "on" : ""} type="button" onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </nav>
          <div>
            <div className="actions">
              <button className="button" type="button" disabled={busy} onClick={() => void save(catalog)}>
                Gravar conteúdo
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Restaurar eventos, políticas e fórmulas originais?")) void save(catalog, "reset");
                }}
              >
                Restaurar original
              </button>
              <span className="storage">{storage === "postgres" ? "PostgreSQL" : "Arquivo local"}</span>
            </div>
            {message ? <p className="ok-note">{message}</p> : null}
            {error ? <p className="error">{error}</p> : null}
            {tab === "Parâmetros" ? <Parameters catalog={catalog} setCatalog={setCatalog} /> : null}
            {tab === "Fórmulas" ? <Formulas catalog={catalog} setCatalog={setCatalog} /> : null}
            {tab === "Políticas" ? <JsonList catalog={catalog} setCatalog={setCatalog} field="policies" /> : null}
            {tab === "Eventos" ? <Events catalog={catalog} setCatalog={setCatalog} /> : null}
            {tab === "Lições" ? <JsonList catalog={catalog} setCatalog={setCatalog} field="lessons" /> : null}
            {tab === "Dicas" ? <JsonList catalog={catalog} setCatalog={setCatalog} field="tips" /> : null}
            {tab === "Bairros" ? <Districts catalog={catalog} setCatalog={setCatalog} /> : null}
            <p className="muted">Chaves de efeito: {EFFECT_KEYS.join(", ")}. Métricas de gatilho: day, occupancy, order, vaccine, research, deathsToday, quarantine, passport, gathering, infected, faction.comerciantes, faction.saude, faction.civil.</p>
          </div>
        </div>
      )}
    </main>
  );
}

function Parameters({ catalog, setCatalog }: { catalog: Catalog; setCatalog: (catalog: Catalog) => void }) {
  function update(parameter: Parameter, value: number) {
    setCatalog({
      ...catalog,
      parameters: catalog.parameters.map((item) => (item.key === parameter.key ? { ...item, value } : item)),
    });
  }
  return (
    <div className="admin-card">
      {catalog.parameters.map((parameter) => (
        <label className="field" key={parameter.key}>
          {parameter.label}
          {parameter.key.endsWith("Mask") ? (
            <span className="bits">
              {MONTHS.map((month, index) => {
                const on = (Math.floor(parameter.value) & (1 << index)) !== 0;
                return (
                  <button
                    key={month}
                    className={on ? "on" : ""}
                    type="button"
                    onClick={() => update(parameter, Math.floor(parameter.value) ^ (1 << index))}
                  >
                    {month}
                  </button>
                );
              })}
            </span>
          ) : (
            <input
              type="number"
              step="0.01"
              value={parameter.value}
              onChange={(event) => update(parameter, Number(event.target.value))}
            />
          )}
          <small>{parameter.hint}</small>
        </label>
      ))}
    </div>
  );
}

function Formulas({ catalog, setCatalog }: { catalog: Catalog; setCatalog: (catalog: Catalog) => void }) {
  return (
    <div className="admin-card">
      {catalog.formulas.map((formula) => (
        <label className="field" key={formula.id}>
          {formula.label}
          <textarea
            value={formula.expression}
            onChange={(event) =>
              setCatalog({
                ...catalog,
                formulas: catalog.formulas.map((item) => (item.id === formula.id ? { ...item, expression: event.target.value } : item)),
              })
            }
          />
          <small>{formula.explanation}</small>
        </label>
      ))}
    </div>
  );
}

function Events({ catalog, setCatalog }: { catalog: Catalog; setCatalog: (catalog: Catalog) => void }) {
  const [current, setCurrent] = useState(catalog.events[0]?.id ?? "");
  const event = catalog.events.find((item) => item.id === current) ?? catalog.events[0];
  const [draft, setDraft] = useState(() => JSON.stringify(catalog.events[0] ?? {}, null, 2));
  const [draftError, setDraftError] = useState<string | null>(null);
  if (!event) return null;
  function replace(next: GameEvent) {
    setCatalog({ ...catalog, events: catalog.events.map((item) => (item.id === event.id ? next : item)) });
    setDraft(JSON.stringify(next, null, 2));
  }
  function select(id: string) {
    setCurrent(id);
    const found = catalog.events.find((item) => item.id === id);
    if (found) setDraft(JSON.stringify(found, null, 2));
    setDraftError(null);
  }
  return (
    <div className="admin-card">
      <div className="actions">
        <select value={event.id} onChange={(input) => select(input.target.value)}>
          {catalog.events.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            const id = `variante-${catalog.events.length + 1}`;
            const created = { ...structuredClone(VARIANT), id, title: `Nova variante ${catalog.events.length + 1}` };
            setCatalog({ ...catalog, events: [...catalog.events, created] });
            setCurrent(id);
            setDraft(JSON.stringify(created, null, 2));
          }}
        >
          Adicionar variante
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            if (event.opening) return;
            const remaining = catalog.events.filter((item) => item.id !== event.id);
            setCatalog({ ...catalog, events: remaining });
            select(remaining[0]?.id ?? "");
          }}
        >
          Excluir
        </button>
      </div>
      <label className="field">
        Título
        <input value={event.title} onChange={(input) => replace({ ...event, title: input.target.value })} />
      </label>
      <label className="field">
        Texto do boletim
        <textarea value={event.body} onChange={(input) => replace({ ...event, body: input.target.value })} />
      </label>
      <label className="field">
        Lição
        <textarea value={event.lesson} onChange={(input) => replace({ ...event, lesson: input.target.value })} />
      </label>
      <label className="field">
        Gatilho, calendário e escolhas
        <textarea value={draft} onChange={(input) => setDraft(input.target.value)} />
        <small>Edite choices, trigger, monthStart, monthEnd, dayStart, dayEnd, repeatable, cooldown e priority. Uma escolha precisa não gastar verba. Aplique o JSON antes de gravar.</small>
      </label>
      {draftError ? <p className="error">{draftError}</p> : null}
      <button
        className="button secondary"
        type="button"
        onClick={() => {
          try {
            const parsed = JSON.parse(draft) as GameEvent;
            if (!parsed.id || !parsed.choices?.length) {
              setDraftError("O JSON precisa de id e de ao menos uma escolha.");
              return;
            }
            setCatalog({
              ...catalog,
              events: catalog.events.map((item) => (item.id === event.id ? parsed : item)),
            });
            setCurrent(parsed.id);
            setDraftError(null);
          } catch {
            setDraftError("JSON inválido.");
          }
        }}
      >
        Aplicar JSON do evento
      </button>
    </div>
  );
}

function JsonList({
  catalog,
  setCatalog,
  field,
}: {
  catalog: Catalog;
  setCatalog: (catalog: Catalog) => void;
  field: "policies" | "lessons" | "tips";
}) {
  const [draft, setDraft] = useState(JSON.stringify(catalog[field], null, 2));
  const [draftError, setDraftError] = useState<string | null>(null);
  return (
    <div className="admin-card">
      <label className="field">
        {field}
        <textarea value={draft} onChange={(input) => setDraft(input.target.value)} />
      </label>
      {draftError ? <p className="error">{draftError}</p> : null}
      <button
        className="button secondary"
        type="button"
        onClick={() => {
          try {
            const parsed = JSON.parse(draft) as Catalog[typeof field];
            setCatalog({ ...catalog, [field]: parsed });
            setDraftError(null);
          } catch {
            setDraftError("JSON inválido.");
          }
        }}
      >
        Aplicar JSON
      </button>
    </div>
  );
}

function Districts({ catalog, setCatalog }: { catalog: Catalog; setCatalog: (catalog: Catalog) => void }) {
  return (
    <div className="admin-card">
      {catalog.districts.map((district) => (
        <fieldset key={district.id}>
          <legend>{district.name}</legend>
          <label className="field">
            População
            <input
              type="number"
              value={district.population}
              onChange={(input) =>
                setCatalog({
                  ...catalog,
                  districts: catalog.districts.map((item) =>
                    item.id === district.id ? { ...item, population: Number(input.target.value) } : item,
                  ),
                })
              }
            />
          </label>
        </fieldset>
      ))}
    </div>
  );
}
