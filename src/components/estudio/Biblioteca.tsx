"use client";
// Tudo o que você enviou e gerou: avatares, imagens, narrações e vídeos.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArquivoCard } from "./ArquivoCard";
import { type Arquivo, apagarArquivoRemoto, atualizarArquivo, baixarTodos, buscarArquivos, enviarImagens } from "./cliente";

const FILTROS = [
  ["", "Tudo"],
  ["avatar", "⭐ Avatares"],
  ["upload", "📤 Enviadas"],
  ["imagem", "🖼️ Imagens"],
  ["audio", "🎙️ Narrações"],
  ["video", "🎬 Vídeos"],
] as const;

export function Biblioteca({ filtroInicial }: { filtroInicial: string }) {
  const [filtro, setFiltro] = useState(filtroInicial);
  const [lista, setLista] = useState<Arquivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [nomeAvatar, setNomeAvatar] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    buscarArquivos(filtro ? { tipo: filtro, limite: "200" } : { limite: "200" })
      .then((l) => !cancelado && setLista(l))
      .catch((e: Error) => !cancelado && setErro(e.message))
      .finally(() => !cancelado && setCarregando(false));
    const url = new URL(window.location.href);
    if (filtro) url.searchParams.set("filtro", filtro);
    else url.searchParams.delete("filtro");
    window.history.replaceState(null, "", url);
    return () => {
      cancelado = true;
    };
  }, [filtro]);

  async function enviarAvatares(files: FileList | null) {
    if (!files?.length) return;
    setEnviando(true);
    setErro(null);
    try {
      const novos = await enviarImagens([...files], { avatar: true, rotulo: nomeAvatar.trim() || undefined });
      setLista((l) => [...novos, ...l]);
      setNomeAvatar("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  async function alternarAvatar(a: Arquivo) {
    try {
      const novo = await atualizarArquivo(a.id, { avatar: !a.avatar });
      setLista((l) => (filtro === "avatar" && !novo.avatar ? l.filter((x) => x.id !== a.id) : l.map((x) => (x.id === a.id ? novo : x))));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falhou");
    }
  }

  async function apagar(a: Arquivo) {
    if (!confirm(`Apagar "${a.rotulo || a.tipo}" para sempre?`)) return;
    try {
      await apagarArquivoRemoto(a.id);
      setLista((l) => l.filter((x) => x.id !== a.id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falhou");
    }
  }

  return (
    <>
      <section className="card">
        <h2>⭐ Enviar avatar / personagem</h2>
        <p className="muted small">
          Avatares ficam salvos para você usar sempre: no chat (📎) ou como referência no <Link href="/estudio/gerar">Gerar</Link>. Dê um nome (ex.: “Luna”) para pedir
          no chat: “usa a Luna nessa cena”.
        </p>
        <div className="linha-form">
          <input value={nomeAvatar} onChange={(e) => setNomeAvatar(e.target.value)} placeholder="Nome do avatar (opcional)" aria-label="Nome do avatar" />
          <button type="button" className="btn" onClick={() => input.current?.click()} disabled={enviando}>
            {enviando ? "Enviando…" : "📤 Enviar imagens"}
          </button>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => enviarAvatares(e.target.files)} />
        </div>
      </section>

      <div className="filtros-chips" role="tablist" aria-label="Filtrar biblioteca">
        {FILTROS.map(([v, r]) => (
          <button key={v} type="button" role="tab" aria-selected={filtro === v} className={filtro === v ? "ativa" : ""} onClick={() => setFiltro(v)}>
            {r}
          </button>
        ))}
      </div>

      {erro && <div className="flash flash-erro">{erro}</div>}

      <div className="lista-topo">
        <span className="muted small">{carregando ? "Carregando…" : `${lista.length} arquivo(s)`}</span>
        {lista.length > 1 && (
          <button type="button" className="btn btn-mini btn-sec" onClick={() => baixarTodos(lista)}>
            ⬇️ Baixar todos
          </button>
        )}
      </div>

      {!carregando && !lista.length ? (
        <p className="vazio muted">Nada por aqui ainda. Gere algo no chat ou em Gerar.</p>
      ) : (
        <div className="grade-arquivos">
          {lista.map((a) => (
            <ArquivoCard key={a.id} arquivo={a} aoApagar={apagar} aoAlternarAvatar={alternarAvatar} />
          ))}
        </div>
      )}
    </>
  );
}
