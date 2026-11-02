"use client";
// Chat do Canal Dark: conversa com a IA, que gera imagens, narrações e vídeos
// direto na conversa (com botão de baixar).
import Link from "next/link";
import { type ClipboardEvent, type DragEvent, type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import type { EventoChat } from "@/estudio/chat-tipos";
import { ArquivoCard } from "./ArquivoCard";
import { type Arquivo, baixarTodos, enviarImagens } from "./cliente";
import { Markdown } from "./Markdown";
import { SeletorImagens } from "./SeletorImagens";

interface Ferramenta {
  id: string;
  nome: string;
  rotulo: string;
  status: "inicio" | "ok" | "erro";
  detalhe?: string;
}

interface Msg {
  id: string;
  papel: "user" | "assistant";
  texto: string;
  arquivos: Arquivo[];
  ferramentas?: Ferramenta[];
  avisos?: string[];
  pendente?: boolean;
}

interface ConversaResumo {
  id: string;
  titulo: string;
  atualizadaEm: string;
}

const SUGESTOES = [
  {
    rotulo: "🎬 Reels completo",
    texto: "Crie um Reels completo para o canal: escolha um tema forte, escreva o roteiro em cenas, gere as imagens de cada cena, a narração e monte o vídeo com legendas. No final, me dê a caption e as hashtags.",
  },
  { rotulo: "💡 10 ideias virais", texto: "Me dê 10 ideias de Reels com potencial viral para o público dos EUA, cada uma com o hook dos 3 primeiros segundos." },
  {
    rotulo: "🧑‍🎨 Transformar avatar",
    texto: "Vou te mandar um avatar/foto. Transforme em um personagem para o canal dark, no estilo cinematográfico sombrio, e gere 3 variações.",
  },
  { rotulo: "✍️ Caption + hashtags", texto: "Escreva a caption e 10 hashtags (em inglês) para este Reels: " },
];

const FEITO: Record<string, string> = {
  gerar_imagem: "Imagem gerada",
  gerar_narracao: "Narração gerada",
  montar_video: "Vídeo enviado para montagem",
  listar_arquivos: "Biblioteca consultada",
};

function idTemp() {
  return `t${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

export function ChatEstudio({
  conversaInicial,
  provedor,
  avisoConfig,
}: {
  conversaInicial: string | null;
  provedor: string;
  avisoConfig: string | null;
}) {
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(conversaInicial);
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<Arquivo[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [seletor, setSeletor] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const [carregandoConversa, setCarregandoConversa] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const seguirRolagem = useRef(true);

  const carregarConversas = useCallback(async () => {
    const r = await fetch("/api/estudio/conversas", { cache: "no-store" });
    if (r.ok) setConversas(((await r.json()) as { conversas: ConversaResumo[] }).conversas);
  }, []);

  useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  // Carrega a conversa escolhida
  useEffect(() => {
    if (!conversaId) return;
    if (mensagens.some((m) => m.pendente)) return;
    let cancelado = false;
    setCarregandoConversa(true);
    fetch(`/api/estudio/conversas/${conversaId}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Conversa não encontrada");
        const c = (await r.json()) as { mensagens: Msg[] };
        if (!cancelado) {
          setMensagens(c.mensagens);
          seguirRolagem.current = true;
        }
      })
      .catch(() => {
        if (!cancelado) {
          setConversaId(null);
          setMensagens([]);
        }
      })
      .finally(() => !cancelado && setCarregandoConversa(false));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaId]);

  // Mantém o ?c= da URL (recarregar a página volta para a mesma conversa)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (conversaId) url.searchParams.set("c", conversaId);
    else url.searchParams.delete("c");
    window.history.replaceState(null, "", url);
  }, [conversaId]);

  useEffect(() => {
    if (seguirRolagem.current) fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens]);

  useEffect(() => {
    const aoRolar = () => {
      seguirRolagem.current = window.innerHeight + window.scrollY >= document.body.scrollHeight - 160;
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  function novaConversa() {
    if (enviando) return;
    setConversaId(null);
    setMensagens([]);
    setAnexos([]);
    setErro(null);
    setPainelAberto(false);
    campo.current?.focus();
  }

  async function apagarConversa(id: string) {
    if (!confirm("Apagar esta conversa? (As imagens, áudios e vídeos continuam na Biblioteca.)")) return;
    await fetch(`/api/estudio/conversas/${id}`, { method: "DELETE" });
    if (id === conversaId) novaConversa();
    carregarConversas();
  }

  async function anexarArquivos(files: File[]) {
    const imagens = files.filter((f) => f.type.startsWith("image/"));
    if (!imagens.length) return;
    setEnviandoAnexo(true);
    setErro(null);
    try {
      const novos = await enviarImagens(imagens);
      setAnexos((a) => [...a, ...novos].slice(0, 10));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar imagem");
    } finally {
      setEnviandoAnexo(false);
    }
  }

  function aoColar(e: ClipboardEvent) {
    const files = [...e.clipboardData.files];
    if (files.some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      anexarArquivos(files);
    }
  }

  function aoSoltar(e: DragEvent) {
    e.preventDefault();
    anexarArquivos([...e.dataTransfer.files]);
  }

  function atualizarUltima(fn: (m: Msg) => Msg) {
    setMensagens((lista) => {
      const copia = [...lista];
      const i = copia.length - 1;
      if (i >= 0 && copia[i].papel === "assistant") copia[i] = fn(copia[i]);
      return copia;
    });
  }

  function tratarEvento(ev: EventoChat) {
    switch (ev.tipo) {
      case "conversa":
        if (ev.conversaId !== conversaId) setConversaId(ev.conversaId);
        break;
      case "texto":
        atualizarUltima((m) => ({ ...m, texto: m.texto + ev.delta }));
        break;
      case "ferramenta":
        atualizarUltima((m) => {
          const fs = [...(m.ferramentas ?? [])];
          const i = fs.findIndex((f) => f.id === ev.id);
          const f = { id: ev.id, nome: ev.nome, rotulo: ev.rotulo, status: ev.status, detalhe: ev.detalhe };
          if (i >= 0) fs[i] = f;
          else fs.push(f);
          return { ...m, ferramentas: fs };
        });
        break;
      case "arquivo":
        atualizarUltima((m) => ({ ...m, arquivos: [...m.arquivos, ev.arquivo] }));
        break;
      case "aviso":
        atualizarUltima((m) => ({ ...m, avisos: [...(m.avisos ?? []), ev.mensagem] }));
        break;
      case "erro":
        atualizarUltima((m) => ({ ...m, avisos: [...(m.avisos ?? []), `⚠️ ${ev.mensagem}`] }));
        break;
      case "fim":
        atualizarUltima((m) => ({ ...m, id: ev.mensagemId, pendente: false }));
        break;
    }
  }

  async function enviar(textoEnviar = texto) {
    const t = textoEnviar.trim();
    if ((!t && !anexos.length) || enviando) return;
    setErro(null);
    setEnviando(true);
    seguirRolagem.current = true;
    const anexosEnviar = anexos;
    setMensagens((m) => [
      ...m,
      { id: idTemp(), papel: "user", texto: t, arquivos: anexosEnviar },
      { id: idTemp(), papel: "assistant", texto: "", arquivos: [], pendente: true },
    ]);
    setTexto("");
    setAnexos([]);
    try {
      const r = await fetch("/api/estudio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId, texto: t, anexos: anexosEnviar.map((a) => a.id) }),
      });
      if (!r.ok || !r.body) {
        const j = (await r.json().catch(() => ({}))) as { erro?: string };
        throw new Error(j.erro ?? `Erro ${r.status}`);
      }
      const leitor = r.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        buffer += value;
        let corte: number;
        while ((corte = buffer.indexOf("\n")) >= 0) {
          const linha = buffer.slice(0, corte).trim();
          buffer = buffer.slice(corte + 1);
          if (!linha) continue;
          try {
            tratarEvento(JSON.parse(linha) as EventoChat);
          } catch {
            /* linha incompleta */
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha de conexão";
      atualizarUltima((m) => ({ ...m, avisos: [...(m.avisos ?? []), `⚠️ ${msg}. Se a conexão caiu, a resposta pode ter sido salva: abra a conversa de novo.`] }));
    } finally {
      atualizarUltima((m) => ({ ...m, pendente: false }));
      setEnviando(false);
      carregarConversas();
    }
  }

  function aoEnviarForm(e: FormEvent) {
    e.preventDefault();
    enviar();
  }

  function aoTeclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia (no computador); Shift+Enter quebra linha
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
      e.preventDefault();
      enviar();
    }
  }

  function usarNoChat(a: Arquivo) {
    setAnexos((l) => (l.some((x) => x.id === a.id) ? l : [...l, a].slice(0, 10)));
    campo.current?.focus();
  }

  const vazia = !mensagens.length && !carregandoConversa;

  return (
    <div className="chat-layout">
      <aside className={`chat-lateral${painelAberto ? " aberta" : ""}`} aria-label="Conversas">
        <button type="button" className="btn chat-nova" onClick={novaConversa} disabled={enviando}>
          ➕ Nova conversa
        </button>
        <ul className="chat-lista">
          {conversas.map((c) => (
            <li key={c.id} className={c.id === conversaId ? "ativa" : ""}>
              <button
                type="button"
                onClick={() => {
                  if (enviando) return;
                  setMensagens([]);
                  setConversaId(c.id);
                  setPainelAberto(false);
                }}
                title={c.titulo}
              >
                {c.titulo}
              </button>
              <button type="button" className="chat-apagar" onClick={() => apagarConversa(c.id)} aria-label={`Apagar conversa ${c.titulo}`}>
                ✕
              </button>
            </li>
          ))}
          {!conversas.length && <li className="muted small">Suas conversas aparecem aqui.</li>}
        </ul>
      </aside>

      <section className="chat-principal" onDragOver={(e) => e.preventDefault()} onDrop={aoSoltar}>
        <div className="chat-barra">
          <button type="button" className="btn btn-mini btn-sec chat-abrir-lista" onClick={() => setPainelAberto((v) => !v)} aria-expanded={painelAberto}>
            💬 Conversas
          </button>
          <span className="badge">IA: {provedor}</span>
          <button type="button" className="btn btn-mini btn-sec chat-nova-mini" onClick={novaConversa} disabled={enviando}>
            ➕ Nova
          </button>
        </div>

        {avisoConfig && <div className="aviso">{avisoConfig}</div>}

        {vazia ? (
          <div className="chat-vazio">
            <p className="sobretitulo">Canal Dark · IG/EUA</p>
            <h2>O que vamos criar hoje?</h2>
            <p className="muted">
              Peça roteiros, imagens, narrações e vídeos prontos. Envie um avatar ou foto (📎) para a IA transformar. Tudo fica salvo na{" "}
              <Link href="/estudio/biblioteca">Biblioteca</Link> para baixar.
            </p>
            <div className="sugestoes">
              {SUGESTOES.map((s) => (
                <button
                  key={s.rotulo}
                  type="button"
                  className="sugestao"
                  onClick={() => {
                    setTexto(s.texto);
                    campo.current?.focus();
                  }}
                >
                  {s.rotulo}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-mensagens" aria-live="polite">
            {carregandoConversa && !mensagens.length && <p className="muted">Carregando conversa…</p>}
            {mensagens.map((m) => (
              <article key={m.id} className={`msg msg-${m.papel}`}>
                {m.papel === "user" ? (
                  <div className="msg-balao">
                    {m.arquivos.length > 0 && (
                      <div className="msg-anexos">
                        {m.arquivos.map((a) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={a.id} src={a.url} alt={a.rotulo || "anexo"} />
                        ))}
                      </div>
                    )}
                    {m.texto && <p>{m.texto}</p>}
                  </div>
                ) : (
                  <div className="msg-ia">
                    {m.texto && <Markdown texto={m.texto} />}
                    {m.ferramentas?.map((f) => (
                      <div key={f.id} className={`ferramenta ferramenta-${f.status}`}>
                        {f.status === "inicio" ? <span className="girando" aria-hidden /> : f.status === "ok" ? "✅" : "⚠️"}{" "}
                        {f.status === "ok" ? (FEITO[f.nome] ?? "Pronto") : f.status === "erro" ? "Não deu certo" : f.rotulo}
                        {f.status === "erro" && f.detalhe && <span className="small"> — {f.detalhe}</span>}
                      </div>
                    ))}
                    {m.arquivos.length > 0 && (
                      <>
                        <div className="grade-arquivos">
                          {m.arquivos.map((a) => (
                            <ArquivoCard key={a.id} arquivo={a} aoUsar={usarNoChat} />
                          ))}
                        </div>
                        {m.arquivos.length > 1 && (
                          <button type="button" className="btn btn-mini btn-sec" onClick={() => baixarTodos(m.arquivos)}>
                            ⬇️ Baixar todos ({m.arquivos.length})
                          </button>
                        )}
                      </>
                    )}
                    {m.avisos?.map((a, i) => (
                      <div key={i} className="flash flash-erro small">
                        {a}
                      </div>
                    ))}
                    {m.pendente && !m.texto && !m.ferramentas?.length && (
                      <div className="digitando" aria-label="A IA está pensando">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
            <div ref={fim} />
          </div>
        )}

        <form className="chat-composer" onSubmit={aoEnviarForm}>
          {erro && <div className="flash flash-erro small">{erro}</div>}
          {(anexos.length > 0 || enviandoAnexo) && (
            <div className="composer-anexos">
              {anexos.map((a) => (
                <div key={a.id} className="composer-anexo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.rotulo || "anexo"} />
                  <button type="button" onClick={() => setAnexos((l) => l.filter((x) => x.id !== a.id))} aria-label="Remover anexo">
                    ✕
                  </button>
                </div>
              ))}
              {enviandoAnexo && <div className="composer-anexo carregando">…</div>}
            </div>
          )}
          <div className="composer-linha">
            <button type="button" className="btn btn-icone btn-sec" onClick={() => setSeletor(true)} aria-label="Anexar imagem ou avatar" title="Anexar imagem/avatar">
              📎
            </button>
            <textarea
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={aoTeclar}
              onPaste={aoColar}
              placeholder="Escreva para a IA do canal…"
              rows={1}
              aria-label="Mensagem"
            />
            <button type="submit" className="btn btn-icone" disabled={enviando || enviandoAnexo || (!texto.trim() && !anexos.length)} aria-label="Enviar">
              {enviando ? <span className="girando claro" aria-hidden /> : "➤"}
            </button>
          </div>
        </form>
      </section>

      <SeletorImagens aberto={seletor} aoFechar={() => setSeletor(false)} aoEscolher={(l) => setAnexos((a) => [...a, ...l.filter((x) => !a.some((y) => y.id === x.id))].slice(0, 10))} titulo="Anexar imagens / avatares" />
    </div>
  );
}
