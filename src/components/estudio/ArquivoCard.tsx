"use client";
import { type Arquivo, duracaoTexto, useArquivoVivo } from "./cliente";

const ROTULO_TIPO: Record<string, string> = { upload: "Enviada", imagem: "Imagem", audio: "Narração", video: "Vídeo" };

export function ArquivoCard({
  arquivo,
  aoUsar,
  aoApagar,
  aoAlternarAvatar,
  compacto,
}: {
  arquivo: Arquivo;
  /** Botão "Usar" (anexar no chat / referência) */
  aoUsar?: (a: Arquivo) => void;
  aoApagar?: (a: Arquivo) => void;
  aoAlternarAvatar?: (a: Arquivo) => void;
  compacto?: boolean;
}) {
  const a = useArquivoVivo(arquivo);
  const vertical = (a.altura ?? 0) > (a.largura ?? 0);

  return (
    <figure className={`arq arq-${a.tipo}${compacto ? " arq-compacto" : ""}`}>
      <div className={`arq-midia${vertical ? " vertical" : ""}`}>
        {a.status === "processando" ? (
          <div className="arq-processando" role="status">
            <span className="girando" aria-hidden />
            <span>{a.tipo === "video" ? "Montando o vídeo…" : "Processando…"}</span>
          </div>
        ) : a.status === "erro" ? (
          <div className="arq-erro" role="alert">
            ⚠️ {a.erro ?? "Falhou"}
          </div>
        ) : a.mime.startsWith("image/") ? (
          <a href={a.url} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.url} alt={a.rotulo || a.prompt || "imagem"} loading="lazy" />
          </a>
        ) : a.tipo === "audio" ? (
          <div className="arq-audio">
            <span aria-hidden>🎙️</span>
            <audio controls preload="none" src={a.url} />
          </div>
        ) : a.tipo === "video" ? (
          <video controls playsInline preload="metadata" src={`${a.url}#t=0.1`} />
        ) : null}
      </div>
      <figcaption>
        <div className="arq-info">
          <strong title={a.prompt}>{a.rotulo || ROTULO_TIPO[a.tipo] || a.tipo}</strong>
          <span className="muted small">
            {a.avatar ? "⭐ Salvo · " : ""}
            {ROTULO_TIPO[a.tipo]}
            {a.largura ? ` · ${a.largura}×${a.altura}` : ""}
            {a.duracao ? ` · ${duracaoTexto(a.duracao)}` : ""}
          </span>
        </div>
        <div className="arq-acoes">
          {a.status === "pronto" && (
            <a className="btn btn-mini" href={a.download} download>
              ⬇️ Baixar
            </a>
          )}
          {aoUsar && a.status === "pronto" && a.mime.startsWith("image/") && (
            <button type="button" className="btn btn-mini btn-sec" onClick={() => aoUsar(a)}>
              ➕ Usar
            </button>
          )}
          {aoAlternarAvatar && a.mime.startsWith("image/") && a.status === "pronto" && (
            <button type="button" className="btn btn-mini btn-sec" onClick={() => aoAlternarAvatar(a)} aria-pressed={a.avatar}>
              {a.avatar ? "★ Salvo" : "☆ Salvar"}
            </button>
          )}
          {aoApagar && (
            <button type="button" className="btn btn-mini btn-perigo" onClick={() => aoApagar(a)} aria-label="Apagar">
              🗑️
            </button>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
