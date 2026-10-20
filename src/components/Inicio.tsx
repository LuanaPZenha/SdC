"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { STARTS } from "@/lib/starts";

type Health = { storage: string; events: number; policies: number; districts: number; lessons: number };

export function Inicio() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startId, setStartId] = useState<string>(STARTS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", playerName: name, startId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível abrir a gestão.");
        return;
      }
      router.push(`/jogo?partida=${data.view.id}`);
    } catch {
      setError("O servidor não respondeu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="home" id="conteudo">
      <p className="kicker">Secretaria Municipal de Saúde · Maricá/RJ</p>
      <h1 className="display">Sombras do Contágio</h1>
      <p className="lede">
        Você assume a gestão da saúde pública enquanto a Apatia, uma condição fictícia transmitida pelo toque, se espalha
        pelos recortes da cidade. O trabalho é segurar a rede, a adesão e a pesquisa até a cura. Dengue, sarampo, pólio,
        meningite e a SRAG entram como são: doenças reais, com outras vias, disputando os mesmos leitos.
      </p>
      <div className="grid-3">
        <section className="sheet">
          <h2 className="display">O que você gere</h2>
          <ul>
            <li>Verba do fundo emergencial.</li>
            <li>Leitos das UPAs e das Clínicas da Família.</li>
            <li>Comércio, equipes de saúde e população.</li>
            <li>Pesquisa da cura, até 100%.</li>
          </ul>
        </section>
        <section className="sheet">
          <h2 className="display">O que a cidade ensina</h2>
          <ul>
            <li>Isolamento, quarentena e adesão.</li>
            <li>Via de transmissão muda a medida.</li>
            <li>Imunidade coletiva e doenças eliminadas.</li>
            <li>Lotação muda a letalidade.</li>
          </ul>
        </section>
        <section className="sheet">
          <h2 className="display">Como a gestão cai</h2>
          <ul>
            <li>Rede acima de 100% por dias seguidos.</li>
            <li>Ordem pública rompida.</li>
            <li>Óbitos além do limite da simulação.</li>
            <li>A cura interrompe a crise.</li>
          </ul>
        </section>
      </div>
      <div className="grid-2">
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            void start();
          }}
        >
          <h2 className="display">Assumir a sala de situação</h2>
          <label className="field">
            Nome no placar
            <input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" />
          </label>
          <div className="checks">
            {STARTS.map((start) => (
              <label className="check" key={start.id}>
                <input type="radio" name="inicio" checked={startId === start.id} onChange={() => setStartId(start.id)} />
                <span>
                  {start.label}
                  <br />
                  <small>{start.detail}</small>
                </span>
              </label>
            ))}
          </div>
          {error ? <p className="error">{error}</p> : null}
          <div className="actions">
            <button className="button" disabled={busy} type="submit">
              {busy ? "Abrindo…" : "Assumir a gestão"}
            </button>
            <a className="button secondary" href="/ranking">
              Placar
            </a>
            <a className="button secondary" href="/admin">
              Painel docente
            </a>
          </div>
        </form>
        <aside className="panel">
          <h2 className="display">De onde vem o conteúdo</h2>
          <p>
            Eventos, políticas, parâmetros e as fórmulas de contágio e de óbito ficam no banco. Um professor altera um
            número ou inclui uma variante nova sem mexer no código. A placa do mapa é esquemática: Maricá tem quatro
            distritos oficiais e a soma das populações segue a estimativa do IBGE para 2026, 212.703 pessoas.
          </p>
          <p className="storage">
            {health
              ? `Conteúdo ativo: ${health.storage === "postgres" ? "PostgreSQL" : "arquivo local"} · ${health.events} eventos · ${health.policies} políticas · ${health.districts} recortes.`
              : "Lendo o conteúdo…"}
          </p>
          <p>
            Os 180 leitos iniciais são uma abstração para a aula, não o inventário real das unidades. A Apatia não existe
            fora do jogo.
          </p>
        </aside>
      </div>
    </main>
  );
}
