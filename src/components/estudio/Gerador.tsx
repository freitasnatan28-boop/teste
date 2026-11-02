"use client";
// Geração direta, sem chat: imagem (com ou sem avatar de referência), narração e vídeo.
import { useEffect, useState } from "react";
import { ArquivoCard } from "./ArquivoCard";
import { type Arquivo, baixarTodos, buscarArquivos } from "./cliente";
import { SeletorImagens } from "./SeletorImagens";

type Aba = "imagem" | "narracao" | "video";

interface Voz {
  id: string;
  nome: string;
  descricao: string;
  preview: string | null;
}

export function Gerador({
  formatos,
  qualidades,
  modelosVoz,
  padrao,
  servicos,
  abaInicial,
}: {
  formatos: { valor: string; rotulo: string }[];
  qualidades: { valor: string; rotulo: string }[];
  modelosVoz: { valor: string; rotulo: string }[];
  padrao: { formato: string; qualidade: string; vozId: string; vozNome: string; modeloVoz: string };
  servicos: { openai: boolean; elevenlabs: boolean };
  abaInicial: Aba;
}) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [resultados, setResultados] = useState<Arquivo[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Imagem
  const [prompt, setPrompt] = useState("");
  const [formato, setFormato] = useState(padrao.formato);
  const [qualidade, setQualidade] = useState(padrao.qualidade);
  const [quantidade, setQuantidade] = useState(1);
  const [referencias, setReferencias] = useState<Arquivo[]>([]);
  const [seletorRef, setSeletorRef] = useState(false);

  // Narração
  const [textoVoz, setTextoVoz] = useState("");
  const [vozes, setVozes] = useState<Voz[]>([]);
  const [vozId, setVozId] = useState(padrao.vozId);
  const [modeloVoz, setModeloVoz] = useState(padrao.modeloVoz);
  const [erroVozes, setErroVozes] = useState<string | null>(null);

  // Vídeo
  const [cenas, setCenas] = useState<Arquivo[]>([]);
  const [seletorCenas, setSeletorCenas] = useState(false);
  const [audios, setAudios] = useState<Arquivo[]>([]);
  const [audioId, setAudioId] = useState("");
  const [legendas, setLegendas] = useState(true);
  const [movimento, setMovimento] = useState(true);
  const [segundos, setSegundos] = useState(3);
  const [formatoVideo, setFormatoVideo] = useState(padrao.formato);

  useEffect(() => {
    if (aba === "narracao" && !vozes.length && servicos.elevenlabs) {
      fetch("/api/estudio/vozes")
        .then(async (r) => {
          const j = (await r.json()) as { vozes?: Voz[]; erro?: string };
          if (!r.ok) throw new Error(j.erro ?? "Falha ao listar vozes");
          setVozes(j.vozes ?? []);
        })
        .catch((e: Error) => setErroVozes(e.message));
    }
    if (aba === "video") {
      buscarArquivos({ tipo: "audio", limite: "50" })
        .then(setAudios)
        .catch(() => undefined);
    }
  }, [aba, vozes.length, servicos.elevenlabs]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("aba", aba);
    window.history.replaceState(null, "", url);
  }, [aba]);

  async function gerar(corpo: Record<string, unknown>) {
    setOcupado(true);
    setErro(null);
    try {
      const r = await fetch("/api/estudio/gerar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const j = (await r.json().catch(() => ({}))) as { arquivos?: Arquivo[]; erro?: string };
      if (!r.ok || !j.arquivos) throw new Error(j.erro ?? `Erro ${r.status}`);
      setResultados((l) => [...j.arquivos!, ...l]);
      return j.arquivos;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falhou");
      return null;
    } finally {
      setOcupado(false);
    }
  }

  const voz = vozes.find((v) => v.id === vozId);
  const caracteres = textoVoz.length;

  return (
    <>
      <div className="abas-estudio" role="tablist">
        {(
          [
            ["imagem", "🖼️ Imagem"],
            ["narracao", "🎙️ Narração"],
            ["video", "🎬 Vídeo"],
          ] as const
        ).map(([v, r]) => (
          <button key={v} type="button" role="tab" aria-selected={aba === v} className={aba === v ? "ativa" : ""} onClick={() => setAba(v)}>
            {r}
          </button>
        ))}
      </div>

      {aba === "imagem" && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            gerar({ tipo: "imagem", prompt, formato, qualidade, quantidade, referencias: referencias.map((a) => a.id), rotulo: prompt.slice(0, 40) });
          }}
        >
          {!servicos.openai && <div className="flash flash-erro">Falta a OPENAI_API_KEY no .env para gerar imagens.</div>}
          <label>
            Descreva a imagem
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              required
              placeholder={
                referencias.length
                  ? "Ex.: o mesmo personagem da referência, de capuz, numa rua escura de Nova York à noite, chuva, luz neon, cinematográfico"
                  : "Ex.: farol abandonado numa ilha à noite, tempestade, lua atrás das nuvens, fotografia cinematográfica, tons frios"
              }
            />
          </label>
          <div className="referencias">
            <div className="referencias-topo">
              <strong>Referências (avatar, foto, personagem)</strong>
              <button type="button" className="btn btn-mini btn-sec" onClick={() => setSeletorRef(true)}>
                📎 Escolher / enviar
              </button>
            </div>
            {referencias.length ? (
              <div className="composer-anexos">
                {referencias.map((a) => (
                  <div key={a.id} className="composer-anexo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.rotulo || "referência"} />
                    <button type="button" onClick={() => setReferencias((l) => l.filter((x) => x.id !== a.id))} aria-label="Remover referência">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">Opcional. Com referência, a IA transforma a imagem ou mantém o mesmo rosto/estilo na nova cena.</p>
            )}
          </div>
          <div className="grid-form">
            <label>
              Formato
              <select value={formato} onChange={(e) => setFormato(e.target.value)}>
                {formatos.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Qualidade
              <select value={qualidade} onChange={(e) => setQualidade(e.target.value)}>
                {qualidades.map((q) => (
                  <option key={q.valor} value={q.valor}>
                    {q.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Variações
              <select value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="acoes">
            <button className="btn" type="submit" disabled={ocupado || !prompt.trim() || !servicos.openai}>
              {ocupado ? "Gerando… (até 1 min)" : referencias.length ? "✨ Transformar" : "✨ Gerar imagem"}
            </button>
          </div>
        </form>
      )}

      {aba === "narracao" && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            gerar({ tipo: "narracao", texto: textoVoz, vozId, vozNome: voz?.nome ?? padrao.vozNome, modelo: modeloVoz, rotulo: textoVoz.slice(0, 40) });
          }}
        >
          {!servicos.elevenlabs && <div className="flash flash-erro">Falta a ELEVENLABS_API_KEY no .env para gerar narrações.</div>}
          {erroVozes && <div className="flash flash-erro">{erroVozes}</div>}
          <label>
            Texto da narração
            <textarea value={textoVoz} onChange={(e) => setTextoVoz(e.target.value)} rows={7} required placeholder="In 1872, a ship was found drifting in the Atlantic. Nobody was on board…" />
          </label>
          <p className={`small ${caracteres > 5000 ? "erro-texto" : "muted"}`}>{caracteres}/5000 caracteres</p>
          <div className="grid-form">
            <label>
              Voz
              <select value={vozId} onChange={(e) => setVozId(e.target.value)}>
                {!vozes.some((v) => v.id === vozId) && <option value={vozId}>{padrao.vozNome || vozId}</option>}
                {vozes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                    {v.descricao ? ` — ${v.descricao}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Modelo
              <select value={modeloVoz} onChange={(e) => setModeloVoz(e.target.value)}>
                {modelosVoz.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {voz?.preview && (
            <div className="previa-voz">
              <span className="small muted">Prévia da voz:</span>
              <audio controls preload="none" src={voz.preview} />
            </div>
          )}
          <div className="acoes">
            <button className="btn" type="submit" disabled={ocupado || !textoVoz.trim() || caracteres > 5000 || !servicos.elevenlabs}>
              {ocupado ? "Gerando narração…" : "🎙️ Gerar narração"}
            </button>
          </div>
        </form>
      )}

      {aba === "video" && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            gerar({
              tipo: "video",
              imagens: cenas.map((a) => a.id),
              audioId: audioId || null,
              formato: formatoVideo,
              legendas,
              movimento,
              segundosPorImagem: segundos,
              rotulo: "vídeo",
            });
          }}
        >
          <p className="muted small">
            Junta as imagens em sequência (com zoom suave), a narração e legendas palavra por palavra. O tempo de cada imagem acompanha a narração.
          </p>
          <div className="referencias">
            <div className="referencias-topo">
              <strong>Cenas (na ordem)</strong>
              <button type="button" className="btn btn-mini btn-sec" onClick={() => setSeletorCenas(true)}>
                ➕ Adicionar imagens
              </button>
            </div>
            {cenas.length ? (
              <ol className="cenas">
                {cenas.map((a, i) => (
                  <li key={`${a.id}-${i}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.rotulo || `cena ${i + 1}`} />
                    <div className="cena-acoes">
                      <button type="button" disabled={i === 0} onClick={() => setCenas((l) => mover(l, i, -1))} aria-label="Mover para cima">
                        ↑
                      </button>
                      <button type="button" disabled={i === cenas.length - 1} onClick={() => setCenas((l) => mover(l, i, 1))} aria-label="Mover para baixo">
                        ↓
                      </button>
                      <button type="button" onClick={() => setCenas((l) => l.filter((_, j) => j !== i))} aria-label="Remover cena">
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted small">Nenhuma cena ainda.</p>
            )}
          </div>
          <div className="grid-form">
            <label>
              Narração
              <select value={audioId} onChange={(e) => setAudioId(e.target.value)}>
                <option value="">Sem narração</option>
                {audios
                  .filter((a) => a.status === "pronto")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {(a.rotulo || a.prompt).slice(0, 60)} {a.duracao ? `(${Math.round(a.duracao)}s)` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Formato
              <select value={formatoVideo} onChange={(e) => setFormatoVideo(e.target.value)}>
                {formatos.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </option>
                ))}
              </select>
            </label>
            {!audioId && (
              <label>
                Segundos por imagem
                <input type="number" min={1} max={20} value={segundos} onChange={(e) => setSegundos(Number(e.target.value) || 3)} />
              </label>
            )}
          </div>
          <div className="acoes">
            <label className="check">
              <input type="checkbox" checked={legendas} onChange={(e) => setLegendas(e.target.checked)} disabled={!audioId} />
              Legendas animadas {audioId ? "" : "(precisa de narração)"}
            </label>
            <label className="check">
              <input type="checkbox" checked={movimento} onChange={(e) => setMovimento(e.target.checked)} />
              Movimento (zoom suave)
            </label>
          </div>
          <div className="acoes">
            <button className="btn" type="submit" disabled={ocupado || !cenas.length}>
              {ocupado ? "Enviando…" : "🎬 Montar vídeo"}
            </button>
          </div>
        </form>
      )}

      {erro && <div className="flash flash-erro">{erro}</div>}

      {resultados.length > 0 && (
        <section>
          <div className="lista-topo">
            <h2>Resultados</h2>
            {resultados.length > 1 && (
              <button type="button" className="btn btn-mini btn-sec" onClick={() => baixarTodos(resultados)}>
                ⬇️ Baixar todos
              </button>
            )}
          </div>
          <div className="grade-arquivos">
            {resultados.map((a) => (
              <ArquivoCard
                key={a.id}
                arquivo={a}
                aoUsar={(x) => {
                  if (aba === "video") setCenas((l) => [...l, x]);
                  else setReferencias((l) => (l.some((y) => y.id === x.id) ? l : [...l, x]));
                }}
              />
            ))}
          </div>
        </section>
      )}

      <SeletorImagens
        aberto={seletorRef}
        aoFechar={() => setSeletorRef(false)}
        aoEscolher={(l) => setReferencias((r) => [...r, ...l.filter((x) => !r.some((y) => y.id === x.id))].slice(0, 8))}
        titulo="Imagens de referência"
      />
      <SeletorImagens aberto={seletorCenas} aoFechar={() => setSeletorCenas(false)} aoEscolher={(l) => setCenas((c) => [...c, ...l].slice(0, 40))} titulo="Cenas do vídeo" />
    </>
  );
}

function mover<T>(lista: T[], i: number, d: number): T[] {
  const c = [...lista];
  const [x] = c.splice(i, 1);
  c.splice(i + d, 0, x);
  return c;
}
