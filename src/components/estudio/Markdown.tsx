// Markdown simples e seguro (sem HTML cru): títulos, listas, negrito, itálico,
// código, citações e links. Suficiente para as respostas do chat.
import { Fragment, type ReactNode } from "react";

function inline(texto: string, chave: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const t = m[0];
    const k = `${chave}-${i++}`;
    if (t.startsWith("**") || t.startsWith("__")) partes.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) partes.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t);
      partes.push(
        lm ? (
          <a key={k} href={lm[2]} target="_blank" rel="noreferrer">
            {lm[1]}
          </a>
        ) : (
          t
        ),
      );
    } else partes.push(<em key={k}>{t.slice(1, -1)}</em>);
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

export function Markdown({ texto }: { texto: string }) {
  const linhas = texto.replace(/\r/g, "").split("\n");
  const blocos: ReactNode[] = [];
  let i = 0;
  let n = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    const k = `b${n++}`;
    if (l.trim().startsWith("```")) {
      const corpo: string[] = [];
      i++;
      while (i < linhas.length && !linhas[i].trim().startsWith("```")) corpo.push(linhas[i++]);
      i++;
      blocos.push(
        <pre key={k}>
          <code>{corpo.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) {
      const Tag = (["h3", "h3", "h4", "h4"] as const)[h[1].length - 1];
      blocos.push(<Tag key={k}>{inline(h[2], k)}</Tag>);
      i++;
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
      const ordenada = /^\s*\d+[.)]\s+/.test(l);
      const itens: string[] = [];
      while (i < linhas.length && /^\s*([-*•]|\d+[.)])\s+/.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
      const Lista = ordenada ? "ol" : "ul";
      blocos.push(
        <Lista key={k}>
          {itens.map((t, j) => (
            <li key={j}>{inline(t, `${k}-${j}`)}</li>
          ))}
        </Lista>,
      );
      continue;
    }
    if (/^>\s?/.test(l)) {
      const cit: string[] = [];
      while (i < linhas.length && /^>\s?/.test(linhas[i])) cit.push(linhas[i++].replace(/^>\s?/, ""));
      blocos.push(<blockquote key={k}>{inline(cit.join(" "), k)}</blockquote>);
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(l)) {
      blocos.push(<hr key={k} />);
      i++;
      continue;
    }
    if (!l.trim()) {
      i++;
      continue;
    }
    const par: string[] = [];
    while (
      i < linhas.length &&
      linhas[i].trim() &&
      !/^(#{1,4})\s+/.test(linhas[i]) &&
      !/^\s*([-*•]|\d+[.)])\s+/.test(linhas[i]) &&
      !linhas[i].trim().startsWith("```") &&
      !/^>\s?/.test(linhas[i])
    )
      par.push(linhas[i++]);
    blocos.push(
      <p key={k}>
        {par.map((t, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(t, `${k}-${j}`)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="md">{blocos}</div>;
}
