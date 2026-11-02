"use client";
// Janela para escolher imagens da biblioteca (avatares primeiro) ou enviar novas.
import { useEffect, useRef, useState } from "react";
import { type Arquivo, buscarArquivos, enviarImagens } from "./cliente";

export function SeletorImagens({
  aberto,
  aoFechar,
  aoEscolher,
  multiplo = true,
  titulo = "Escolher imagens",
  incluirVideos = false,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoEscolher: (lista: Arquivo[]) => void;
  multiplo?: boolean;
  titulo?: string;
  /** Também lista vídeos prontos (para a montagem) */
  incluirVideos?: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [lista, setLista] = useState<Arquivo[]>([]);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvarAvatar, setSalvarAvatar] = useState(false);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberto && !d.open) {
      d.showModal();
      setMarcados([]);
      setErro(null);
      setCarregando(true);
      buscarArquivos({ tipo: incluirVideos ? "cenas" : "referencias", limite: "120" })
        .then(setLista)
        .catch((e: Error) => setErro(e.message))
        .finally(() => setCarregando(false));
    } else if (!aberto && d.open) d.close();
  }, [aberto, incluirVideos]);

  function alternar(id: string) {
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : multiplo ? [...m, id] : [id]));
  }

  async function enviar(files: FileList | null) {
    if (!files?.length) return;
    setEnviando(true);
    setErro(null);
    try {
      const novos = await enviarImagens([...files], { avatar: salvarAvatar });
      setLista((l) => [...novos, ...l]);
      setMarcados((m) => (multiplo ? [...novos.map((a) => a.id), ...m] : [novos[0].id]));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  const avatares = lista.filter((a) => a.avatar);
  const videos = lista.filter((a) => !a.avatar && a.tipo === "video");
  const outras = lista.filter((a) => !a.avatar && a.tipo !== "video");

  const grade = (itens: Arquivo[]) => (
    <div className="seletor-grade">
      {itens.map((a) => (
        <button
          type="button"
          key={a.id}
          className={`seletor-item${marcados.includes(a.id) ? " marcado" : ""}`}
          onClick={() => alternar(a.id)}
          aria-pressed={marcados.includes(a.id)}
          title={a.rotulo || a.prompt}
        >
          {a.tipo === "video" ? (
            <video src={`${a.url}#t=0.1`} muted playsInline preload="metadata" aria-label={a.rotulo || "vídeo"} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.url} alt={a.rotulo || "imagem"} loading="lazy" />
          )}
          <span>{a.tipo === "video" ? "🎥 " : ""}{a.rotulo || (a.tipo === "upload" ? "enviada" : "gerada")}</span>
        </button>
      ))}
    </div>
  );

  return (
    <dialog ref={dialogo} className="dialogo" onClose={aoFechar} onCancel={aoFechar}>
      <div className="dialogo-topo">
        <h2>{titulo}</h2>
        <button type="button" className="btn btn-mini btn-sec" onClick={aoFechar} aria-label="Fechar">
          ✕
        </button>
      </div>
      <div className="dialogo-corpo">
        <div className="enviar-linha">
          <button type="button" className="btn" onClick={() => input.current?.click()} disabled={enviando}>
            {enviando ? "Enviando…" : "📤 Enviar do aparelho"}
          </button>
          <label className="check">
            <input type="checkbox" checked={salvarAvatar} onChange={(e) => setSalvarAvatar(e.target.checked)} />
            Salvar (⭐ produto/avatar)
          </label>
          <input ref={input} type="file" accept="image/*" multiple={multiplo} hidden onChange={(e) => enviar(e.target.files)} />
        </div>
        {erro && <div className="flash flash-erro">{erro}</div>}
        {carregando ? (
          <p className="muted">Carregando…</p>
        ) : !lista.length ? (
          <p className="muted">Nenhuma imagem ainda. Envie a foto do produto acima.</p>
        ) : (
          <>
            {avatares.length > 0 && (
              <>
                <h3 className="seletor-secao">⭐ Produtos e avatares salvos</h3>
                {grade(avatares)}
              </>
            )}
            {videos.length > 0 && (
              <>
                <h3 className="seletor-secao">🎥 Vídeos</h3>
                {grade(videos)}
              </>
            )}
            {outras.length > 0 && (
              <>
                <h3 className="seletor-secao">Imagens</h3>
                {grade(outras)}
              </>
            )}
          </>
        )}
      </div>
      <div className="dialogo-rodape">
        <span className="muted small">{marcados.length ? `${marcados.length} selecionada(s)` : "Toque para selecionar"}</span>
        <button
          type="button"
          className="btn"
          disabled={!marcados.length}
          onClick={() => {
            const porId = new Map(lista.map((a) => [a.id, a]));
            aoEscolher(marcados.map((id) => porId.get(id)).filter((a): a is Arquivo => Boolean(a)));
            aoFechar();
          }}
        >
          Usar
        </button>
      </div>
    </dialog>
  );
}
