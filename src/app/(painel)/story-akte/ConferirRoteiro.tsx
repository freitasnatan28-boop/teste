"use client";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { analisarRoteiro, mmss } from "@/lib/story-akte";

/** Cola o roteiro.md e confere na hora: blocos, palavras, duração, números, "sch" e o rascunho do missoes.json */
export function ConferirRoteiro() {
  const [md, setMd] = useState("");
  const a = useMemo(() => analisarRoteiro(md), [md]);
  const temTexto = a.blocos.length > 0;

  return (
    <>
      <label>
        Roteiro (cole o roteiro.md inteiro)
        <textarea
          rows={10}
          value={md}
          onChange={(e) => setMd(e.target.value)}
          placeholder={"[V: #1 intro]\nEin Mann kommt nach fünfzehn Jahren aus dem Gefängnis…\n\n[V: #2 the party]\nKen Rosenberg hat eine Idee…"}
          spellCheck={false}
          lang="de"
        />
      </label>

      {temTexto && (
        <>
          <div className="badges mt">
            <span className="badge">{a.blocos.length} blocos</span>
            <span className="badge">{a.palavras.toLocaleString("pt-BR")} palavras</span>
            <span className="badge">≈ {mmss(a.segundos)} min</span>
            {a.alertas.length === 0 ? <span className="badge badge-ok">Tudo dentro das regras ✓</span> : <span className="badge badge-alerta">{a.alertas.length} ponto(s) para ver</span>}
          </div>

          {a.alertas.length > 0 && (
            <ul className="passos mt">
              {a.alertas.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}

          {a.numeros.length > 0 && (
            <p className="small">
              <strong>Números para escrever por extenso:</strong>{" "}
              {a.numeros.map((n) => `bloco ${n.bloco}: ${n.trechos.join(", ")}`).join(" · ")}
            </p>
          )}

          {a.sch.length > 0 && (
            <p className="small">
              <strong>Palavras com “sch” + consoante</strong> (às vezes a voz erra, como “Schnellboot” → “Fnellboot”; se puder, troque por sinônimo):{" "}
              {a.sch.join(", ")}
            </p>
          )}

          <details className="mt">
            <summary>missoes.json (rascunho a partir das anotações [V: #N])</summary>
            {a.semMissao.length > 0 && <p className="small muted">Blocos sem missão anotada: {a.semMissao.join(", ")} — complete antes de produzir.</p>}
            <pre className="codigo">{a.missoesJson}</pre>
            <CopyButton texto={a.missoesJson} rotulo="Copiar missoes.json" />
          </details>

          <details className="mt">
            <summary>Blocos ({a.blocos.length})</summary>
            <table className="tabela">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Início do bloco</th>
                  <th className="num">Palavras</th>
                  <th>Missões</th>
                </tr>
              </thead>
              <tbody>
                {a.blocos.map((b) => (
                  <tr key={b.indice}>
                    <td className="num">{b.indice}</td>
                    <td>{b.texto.length > 70 ? `${b.texto.slice(0, 70)}…` : b.texto}</td>
                    <td className="num">{b.palavras}</td>
                    <td>{b.missoes.length ? b.missoes.map((n) => `#${n}`).join(" ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </>
  );
}
