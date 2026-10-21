"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { people } from "@/lib/format";
import type { RankingEntry } from "@/lib/types";

export function Placar() {
  const [rows, setRows] = useState<RankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ranking")
      .then((response) => response.json())
      .then((data) => {
        if (data.error) setError(data.error);
        setRows(data.ranking ?? []);
      })
      .catch(() => setError("Não foi possível ler o placar."));
  }, []);

  return (
    <main className="rank-page" id="conteudo">
      <p className="kicker">Dias sobrevividos</p>
      <h1 className="display">Placar</h1>
      <p className="lede">A ordem principal é quantos dias a gestão durou. Vitória, pontuação e óbitos desempata. O registro entra no fim da partida.</p>
      <p>
        <Link className="text-link" href="/">
          Voltar ao briefing
        </Link>
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Gestão</th>
              <th>Dias</th>
              <th>Pesquisa</th>
              <th>Óbitos</th>
              <th>Desfecho</th>
              <th>Pontos</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row, index) => (
              <tr key={row.id}>
                <td data-label="#">{index + 1}</td>
                <td data-label="Gestão">{row.playerName}</td>
                <td data-label="Dias">{row.daysSurvived}</td>
                <td data-label="Pesquisa">{row.research.toFixed(0)}%</td>
                <td data-label="Óbitos">{people(row.dead)}</td>
                <td data-label="Desfecho">
                  <span className={row.outcome === "won" ? "badge win" : "badge lost"}>{row.endingTitle}</span>
                </td>
                <td data-label="Pontos">{row.score}</td>
              </tr>
            ))}
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhuma gestão encerrada ainda.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
