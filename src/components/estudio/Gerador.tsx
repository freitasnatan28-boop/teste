"use client";
// Geração direta, sem chat: imagem (com ou sem avatar de referência), narração e vídeo.
import { useEffect, useState } from "react";
import { ArquivoCard } from "./ArquivoCard";
import { type Arquivo, baixarTodos, buscarArquivos } from "./cliente";
import { SeletorImagens } from "./SeletorImagens";

type Aba = "imagem" | "avatar" | "videoia" | "narracao" | "video";

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
  modelosVideo,
}: {
  formatos: { valor: string; rotulo: string }[];
  qualidades: { valor: string; rotulo: string }[];
  modelosVoz: { valor: string; rotulo: string }[];
  padrao: { formato: string; qualidade: string; vozId: string; vozNome: string; modeloVoz: string };
  servicos: { openai: boolean; elevenlabs: boolean };
  modelosVideo: { valor: string; rotulo: string }[];
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
  const [gancho, setGancho] = useState("");
  const [cta, setCta] = useState("Tap the orange cart");

  // Avatar (criar pessoa/personagem)
  const [avDescricao, setAvDescricao] = useState("");
  const [avEstilo, setAvEstilo] = useState(ESTILOS_AVATAR[0].valor);
  const [avNome, setAvNome] = useState("");
  const [avQtd, setAvQtd] = useState(2);
  const [avRefs, setAvRefs] = useState<Arquivo[]>([]);
  const [seletorAvRef, setSeletorAvRef] = useState(false);

  // Vídeo com IA
  const [modoIA, setModoIA] = useState<"cena" | "falando">("cena");
  const [iaPrompt, setIaPrompt] = useState("");
  const [iaInicial, setIaInicial] = useState<Arquivo | null>(null);
  const [seletorIaInicial, setSeletorIaInicial] = useState(false);
  const [iaModelo, setIaModelo] = useState(modelosVideo[0]?.valor ?? "veo-3.1-fast-generate-001");
  const [iaDuracao, setIaDuracao] = useState(8);
  const [iaSom, setIaSom] = useState(true);
  const [falAvatar, setFalAvatar] = useState<Arquivo | null>(null);
  const [seletorFalAvatar, setSeletorFalAvatar] = useState(false);
  const [falAudioId, setFalAudioId] = useState("");
  const [falTexto, setFalTexto] = useState("");

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
    if (aba === "video" || aba === "videoia") {
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
            ["avatar", "🧑 Avatar"],
            ["videoia", "🎥 Vídeo IA"],
            ["narracao", "🎙️ Narração"],
            ["video", "🎬 Montar vídeo"],
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
                  ? "Ex.: the exact same product from the reference image on a clean marble kitchen counter, morning light, hands using it, close-up, TikTok style"
                  : "Ex.: messy kitchen counter full of cables, warm light, realistic phone photo, vertical"
              }
            />
          </label>
          <div className="referencias">
            <div className="referencias-topo">
              <strong>Referências (foto do produto, avatar)</strong>
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
              <p className="muted small">
                Mande a foto real do produto para ele aparecer igual na cena. Dica: escreva “the exact same product from the reference image” no começo da descrição.
              </p>
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

      {aba === "avatar" && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            const estilo = ESTILOS_AVATAR.find((x) => x.valor === avEstilo)?.prompt ?? "";
            const prompt = avRefs.length
              ? `Create a consistent character based on the person in the reference image. ${avDescricao}. ${estilo}`
              : `${avDescricao}. ${estilo}`;
            gerar({ tipo: "imagem", prompt, formato: "9:16", qualidade, quantidade: avQtd, referencias: avRefs.map((a) => a.id), rotulo: avNome || "avatar", avatar: true });
          }}
        >
          {!servicos.openai && <div className="flash flash-erro">Falta a OPENAI_API_KEY no .env para gerar avatares.</div>}
          <p className="muted small">
            Crie a pessoa (ou personagem) que vai aparecer e falar nos seus vídeos. Os avatares ficam salvos com ⭐ e você usa no chat ou em “Vídeo IA → Avatar falando”.
          </p>
          <label>
            Como é o avatar?
            <textarea
              value={avDescricao}
              onChange={(e) => setAvDescricao(e.target.value)}
              rows={3}
              required
              placeholder="Ex.: American woman, late 20s, long brown hair, friendly smile, casual beige sweater, cozy apartment"
            />
          </label>
          <div className="grid-form">
            <label>
              Estilo
              <select value={avEstilo} onChange={(e) => setAvEstilo(e.target.value)}>
                {ESTILOS_AVATAR.map((x) => (
                  <option key={x.valor} value={x.valor}>
                    {x.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nome do avatar
              <input value={avNome} onChange={(e) => setAvNome(e.target.value)} placeholder="Ex.: Emma" maxLength={60} />
            </label>
            <label>
              Variações
              <select value={avQtd} onChange={(e) => setAvQtd(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="referencias">
            <div className="referencias-topo">
              <strong>Basear numa foto (opcional)</strong>
              <button type="button" className="btn btn-mini btn-sec" onClick={() => setSeletorAvRef(true)}>
                📎 Escolher / enviar
              </button>
            </div>
            {avRefs.length ? (
              <div className="composer-anexos">
                {avRefs.map((a) => (
                  <div key={a.id} className="composer-anexo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.rotulo || "referência"} />
                    <button type="button" onClick={() => setAvRefs((l) => l.filter((x) => x.id !== a.id))} aria-label="Remover foto">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">Ex.: sua própria foto para virar um avatar seu, ou um personagem que você já tem. Use só fotos de pessoas que autorizaram.</p>
            )}
          </div>
          <p className="muted small">Para o avatar falar bem depois: rosto de frente, bem iluminado, boca fechada.</p>
          <div className="acoes">
            <button className="btn" type="submit" disabled={ocupado || !avDescricao.trim() || !servicos.openai}>
              {ocupado ? "Criando… (até 1 min)" : "🧑 Criar avatar"}
            </button>
          </div>
        </form>
      )}

      {aba === "videoia" && (
        <div className="card">
          {!servicos.elevenlabs && <div className="flash flash-erro">Falta a ELEVENLABS_API_KEY no .env.</div>}
          <div className="aviso small">
            Vídeo com IA usa a API de vídeo da ElevenLabs, que exige o plano <strong>Pro</strong> (ou acima). Cada vídeo leva alguns minutos e gasta créditos.
          </div>
          <div className="abas-estudio" role="tablist" aria-label="Tipo de vídeo com IA">
            <button type="button" role="tab" aria-selected={modoIA === "cena"} className={modoIA === "cena" ? "ativa" : ""} onClick={() => setModoIA("cena")}>
              🎥 Cena com movimento
            </button>
            <button type="button" role="tab" aria-selected={modoIA === "falando"} className={modoIA === "falando" ? "ativa" : ""} onClick={() => setModoIA("falando")}>
              🗣️ Avatar falando
            </button>
          </div>

          {modoIA === "cena" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                gerar({
                  tipo: "video_ia",
                  prompt: iaPrompt,
                  formato: formatoVideo === "16:9" ? "16:9" : "9:16",
                  modelo: iaModelo,
                  duracao: iaDuracao,
                  som: iaSom,
                  imagemInicialId: iaInicial?.id ?? null,
                  rotulo: iaPrompt.slice(0, 40),
                });
              }}
            >
              <div className="referencias">
                <div className="referencias-topo">
                  <strong>Imagem inicial (recomendado)</strong>
                  <button type="button" className="btn btn-mini btn-sec" onClick={() => setSeletorIaInicial(true)}>
                    📎 Escolher
                  </button>
                </div>
                {iaInicial ? (
                  <div className="composer-anexos">
                    <div className="composer-anexo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={iaInicial.url} alt={iaInicial.rotulo || "imagem inicial"} />
                      <button type="button" onClick={() => setIaInicial(null)} aria-label="Remover imagem inicial">
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="muted small">Gere antes a cena com o produto (aba Imagem) e escolha aqui: o vídeo começa dela, e o produto fica igual.</p>
                )}
              </div>
              <label className="mt">
                O que acontece na cena (de preferência em inglês)
                <textarea
                  value={iaPrompt}
                  onChange={(e) => setIaPrompt(e.target.value)}
                  rows={3}
                  required
                  placeholder="Slow push-in, a hand picks up the pink bottle, condensation drips, soft morning light, realistic"
                />
              </label>
              <div className="grid-form mt">
                <label>
                  Modelo
                  <select value={iaModelo} onChange={(e) => setIaModelo(e.target.value)}>
                    {modelosVideo.map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.rotulo}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Duração
                  <select value={iaDuracao} onChange={(e) => setIaDuracao(Number(e.target.value))}>
                    {[4, 6, 8].map((d) => (
                      <option key={d} value={d}>
                        {d} segundos
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Formato
                  <select value={formatoVideo === "16:9" ? "16:9" : "9:16"} onChange={(e) => setFormatoVideo(e.target.value)}>
                    <option value="9:16">TikTok vertical (9:16)</option>
                    <option value="16:9">Horizontal (16:9)</option>
                  </select>
                </label>
              </div>
              <div className="acoes">
                <label className="check">
                  <input type="checkbox" checked={iaSom} onChange={(e) => setIaSom(e.target.checked)} />
                  Som ambiente gerado pela IA
                </label>
              </div>
              <div className="acoes">
                <button className="btn" type="submit" disabled={ocupado || !iaPrompt.trim() || !servicos.elevenlabs}>
                  {ocupado ? "Enviando…" : "🎥 Gerar vídeo"}
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!falAvatar) return;
                gerar({
                  tipo: "avatar_falando",
                  avatarId: falAvatar.id,
                  audioId: falAudioId || null,
                  texto: falAudioId ? "" : falTexto,
                  rotulo: `${falAvatar.rotulo || "avatar"} falando`,
                });
              }}
            >
              <div className="referencias">
                <div className="referencias-topo">
                  <strong>Avatar</strong>
                  <button type="button" className="btn btn-mini btn-sec" onClick={() => setSeletorFalAvatar(true)}>
                    📎 Escolher
                  </button>
                </div>
                {falAvatar ? (
                  <div className="composer-anexos">
                    <div className="composer-anexo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={falAvatar.url} alt={falAvatar.rotulo || "avatar"} />
                      <button type="button" onClick={() => setFalAvatar(null)} aria-label="Remover avatar">
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="muted small">Escolha um avatar salvo (ou crie um na aba Avatar). Rosto de frente funciona melhor.</p>
                )}
              </div>
              <label className="mt">
                Narração
                <select value={falAudioId} onChange={(e) => setFalAudioId(e.target.value)}>
                  <option value="">Escrever o texto agora (gera a narração com a voz do canal)</option>
                  {audios
                    .filter((a) => a.status === "pronto")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {(a.rotulo || a.prompt).slice(0, 60)} {a.duracao ? `(${Math.round(a.duracao)}s)` : ""}
                      </option>
                    ))}
                </select>
              </label>
              {!falAudioId && (
                <label className="mt">
                  O que o avatar vai falar (inglês)
                  <textarea
                    value={falTexto}
                    onChange={(e) => setFalTexto(e.target.value)}
                    rows={4}
                    placeholder="Okay, I need to show you this bottle. It keeps my water ice cold all day, even at the gym. It's in the orange cart below."
                  />
                </label>
              )}
              <p className="muted small mt">
                Depois de pronto, vá em “Montar vídeo”, coloque o vídeo do avatar + cenas do produto e a mesma narração para ter legendas, hook e CTA.
              </p>
              <div className="acoes">
                <button className="btn" type="submit" disabled={ocupado || !falAvatar || (!falAudioId && !falTexto.trim()) || !servicos.elevenlabs}>
                  {ocupado ? "Enviando…" : "🗣️ Criar avatar falando"}
                </button>
              </div>
            </form>
          )}
        </div>
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
            <textarea value={textoVoz} onChange={(e) => setTextoVoz(e.target.value)} rows={7} required placeholder="I was tired of tangled cables everywhere… until I found this. It holds five cables, sticks anywhere, and takes ten seconds to set up. Tap the orange cart before it sells out." />
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
              gancho,
              cta,
              rotulo: gancho ? gancho.slice(0, 40) : "vídeo",
            });
          }}
        >
          <p className="muted small">
            Junta as cenas (com zoom suave), a narração, legendas palavra por palavra, o hook no topo e o CTA no final. Os textos ficam fora da área dos botões do
            TikTok.
          </p>
          <div className="referencias">
            <div className="referencias-topo">
              <strong>Cenas (na ordem)</strong>
              <button type="button" className="btn btn-mini btn-sec" onClick={() => setSeletorCenas(true)}>
                ➕ Adicionar cenas
              </button>
            </div>
            {cenas.length ? (
              <ol className="cenas">
                {cenas.map((a, i) => (
                  <li key={`${a.id}-${i}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.tipo === "video" ? (
                      <video src={`${a.url}#t=0.1`} muted playsInline preload="metadata" aria-label={a.rotulo || `cena ${i + 1}`} />
                    ) : (
                      <img src={a.url} alt={a.rotulo || `cena ${i + 1}`} />
                    )}
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
            <label>
              Hook na tela (primeiros 3 s)
              <input value={gancho} onChange={(e) => setGancho(e.target.value)} maxLength={200} placeholder="This $20 gadget fixed my kitchen" />
            </label>
            <label>
              CTA no final (últimos 3 s)
              <input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={120} placeholder="Tap the orange cart" />
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
                usarVideos={aba === "video"}
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
      <SeletorImagens aberto={seletorAvRef} aoFechar={() => setSeletorAvRef(false)} aoEscolher={(l) => setAvRefs(l.slice(0, 3))} titulo="Foto base do avatar" />
      <SeletorImagens aberto={seletorIaInicial} aoFechar={() => setSeletorIaInicial(false)} aoEscolher={(l) => setIaInicial(l[0] ?? null)} multiplo={false} titulo="Imagem inicial do vídeo" />
      <SeletorImagens aberto={seletorFalAvatar} aoFechar={() => setSeletorFalAvatar(false)} aoEscolher={(l) => setFalAvatar(l[0] ?? null)} multiplo={false} titulo="Escolher avatar" />
      <SeletorImagens aberto={seletorCenas} incluirVideos aoFechar={() => setSeletorCenas(false)} aoEscolher={(l) => setCenas((c) => [...c, ...l].slice(0, 40))} titulo="Cenas do vídeo" />
    </>
  );
}

const ESTILOS_AVATAR = [
  {
    valor: "ugc",
    rotulo: "UGC realista (selfie de celular)",
    prompt: "Vertical selfie-style UGC photo, realistic smartphone photo, looking straight at the camera, mouth closed, natural light, head and shoulders framing.",
  },
  {
    valor: "estudio",
    rotulo: "Retrato de estúdio",
    prompt: "Professional studio portrait, soft key light, clean background, looking at the camera, mouth closed, head and shoulders framing, photorealistic.",
  },
  {
    valor: "3d",
    rotulo: "Personagem 3D animado",
    prompt: "Stylized 3D animated character, friendly expression, looking at the camera, mouth closed, soft lighting, upper body, vertical framing.",
  },
  {
    valor: "dark",
    rotulo: "Cinematográfico sombrio",
    prompt: "Cinematic moody portrait, low-key lighting, dark background, looking at the camera, mouth closed, photorealistic, vertical framing.",
  },
];

function mover<T>(lista: T[], i: number, d: number): T[] {
  const c = [...lista];
  const [x] = c.splice(i, 1);
  c.splice(i + d, 0, x);
  return c;
}
