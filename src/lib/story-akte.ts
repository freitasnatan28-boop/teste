// Story Akte — canal de YouTube (histórias de GTA em alemão) feito com o Felipe.
// Funções puras da seção /story-akte: temas (quem faz o quê), relatório diário e conferência do roteiro.
// As regras vêm do kit de produção (PROMPT_PARA_O_CLAUDE.md, TEMAS_FEITOS.md, kaggle/prepara_de.py).

export type DonoTema = "Felipe" | "Amigo";
export type SituacaoTema = "reservado" | "planejado" | "em_producao" | "pronto";

export interface TemaSA {
  /** SA_01, SA_02… (Felipe) ou SA_A01, SA_A02… (Amigo) */
  numero: string;
  tema: string;
  jogo: string;
  dono: DonoTema;
  situacao: SituacaoTema;
  /** Título final em alemão (quando pronto) */
  tituloDE?: string;
  /** Duração do vídeo, ex.: "12:30" */
  duracao?: string;
  /** Pasta em PRONTOS/, ex.: "SA_A01 - Liberty City Stories" */
  pasta?: string;
  /** Datas AAAA-MM-DD (horário de Brasília) */
  criadoEm: string;
  prontoEm?: string;
}

export const SITUACOES: Record<SituacaoTema, string> = {
  reservado: "Reservado",
  planejado: "Vou fazer",
  em_producao: "Em produção",
  pronto: "Pronto",
};

/** Lista do TEMAS_FEITOS.md (atualizada em 14/11/2026 pelo Felipe) */
export const TEMAS_INICIAIS: TemaSA[] = [
  { numero: "SA_01", tema: "GTA Vice City — a história completa (Tommy Vercetti)", jogo: "GTA Vice City", dono: "Felipe", situacao: "pronto", criadoEm: "2026-11-14", prontoEm: "2026-11-14", tituloDE: "GTA Vice City: Die komplette Story (vor GTA 6 erklärt)" },
  { numero: "SA_02", tema: "GTA San Andreas — a história completa (CJ, Grove Street)", jogo: "GTA San Andreas", dono: "Felipe", situacao: "reservado", criadoEm: "2026-11-14" },
  { numero: "SA_03", tema: "GTA V — a história completa (Michael, Franklin, Trevor)", jogo: "GTA V", dono: "Felipe", situacao: "reservado", criadoEm: "2026-11-14" },
  { numero: "SA_04", tema: "GTA IV — a história completa (Niko Bellic)", jogo: "GTA IV", dono: "Felipe", situacao: "reservado", criadoEm: "2026-11-14" },
  { numero: "SA_05", tema: "GTA III — a história completa (Claude, Liberty City 2001)", jogo: "GTA III", dono: "Felipe", situacao: "reservado", criadoEm: "2026-11-14" },
  { numero: "SA_06", tema: "GTA IV Episodes — The Lost and Damned + The Ballad of Gay Tony", jogo: "GTA IV Episodes", dono: "Felipe", situacao: "reservado", criadoEm: "2026-11-14" },
];

/** Ideias livres do TEMAS_FEITOS.md */
export const IDEIAS_LIVRES: { tema: string; jogo: string; obs?: string }[] = [
  { tema: "GTA Liberty City Stories (Toni Cipriani) — história completa", jogo: "GTA Liberty City Stories" },
  { tema: "GTA Vice City Stories (Victor Vance) — história completa", jogo: "GTA Vice City Stories" },
  { tema: "GTA Chinatown Wars (Huang Lee) — história completa", jogo: "GTA Chinatown Wars" },
  { tema: "Die Geschichte von Lance Vance", jogo: "GTA Vice City" },
  { tema: "Wer ist Ken Rosenberg?", jogo: "GTA Vice City" },
  { tema: "Die Geschichte von Trevor Philips", jogo: "GTA V" },
  { tema: "Big Smoke: der Verrat erklärt", jogo: "GTA San Andreas" },
  { tema: "Alle GTA-Geschichten in chronologischer Reihenfolge", jogo: "Vários" },
  { tema: "Das GTA-Universum erklärt (3D-Ära vs. HD-Ära)", jogo: "Vários" },
  { tema: "Was geschah mit Tommy Vercetti nach Vice City?", jogo: "GTA Vice City" },
  { tema: "Alle Enden von GTA V erklärt", jogo: "GTA V" },
  { tema: "Alle Enden von GTA IV erklärt", jogo: "GTA IV" },
  { tema: "GTA 6 Story erklärt", jogo: "GTA VI", obs: "Só depois do lançamento (19/11/2026) e com gameplay CC BY conferido" },
];

export const JOGOS_GTA = [
  "GTA III",
  "GTA Vice City",
  "GTA San Andreas",
  "GTA Liberty City Stories",
  "GTA Vice City Stories",
  "GTA IV",
  "GTA IV Episodes",
  "GTA Chinatown Wars",
  "GTA V",
  "GTA VI",
  "Vários",
];

// ---------------- Temas ----------------

/** Data de hoje (AAAA-MM-DD) no horário de Brasília */
export function hojeBR(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

/** "2026-11-14" → "14/11/2026" */
export function dataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

/** Próximo número livre: SA_07 (Felipe) ou SA_A01 (Amigo) */
export function proximoNumero(temas: TemaSA[], dono: DonoTema): string {
  const prefixo = dono === "Amigo" ? "SA_A" : "SA_";
  const re = dono === "Amigo" ? /^SA_A(\d+)$/ : /^SA_(\d+)$/;
  const maior = temas.reduce((mx, t) => {
    const m = re.exec(t.numero);
    return m ? Math.max(mx, Number(m[1])) : mx;
  }, 0);
  return `${prefixo}${String(maior + 1).padStart(2, "0")}`;
}

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ß]+/g, " ")
    .trim();

// Palavras que não ajudam a diferenciar um tema de outro
const VAZIAS = new Set(
  "gta a o e de da do das dos em no na com historia completa die der das von und ist erklart erklaert story geschichte komplette ganze alle".split(" "),
);
const palavras = (s: string) => new Set(normalizar(s).split(" ").filter((p) => p.length > 1 && !VAZIAS.has(p)));

/** Quão parecidos são dois temas (0 a 1), ignorando "GTA", "história completa" etc. */
export function semelhanca(a: string, b: string): number {
  const pa = palavras(a);
  const pb = palavras(b);
  if (!pa.size || !pb.size) return 0;
  let comum = 0;
  for (const p of pa) if (pb.has(p)) comum++;
  return comum / Math.min(pa.size, pb.size);
}

const ehHistoriaCompleta = (t: string) => /completa|komplett|ganze/.test(normalizar(t));

/**
 * Temas já existentes que batem com o novo — para não repetir nada do Felipe (nem do amigo).
 * Conta como repetido: mesmo texto, texto muito parecido, ou "história completa" do mesmo jogo.
 */
export function temasParecidos(novo: { tema: string; jogo: string }, temas: TemaSA[]): TemaSA[] {
  return temas.filter((t) => {
    if (normalizar(t.tema) === normalizar(novo.tema)) return true;
    if (semelhanca(t.tema, novo.tema) >= 0.75) return true;
    const mesmoJogo = novo.jogo && normalizar(t.jogo) === normalizar(novo.jogo);
    return Boolean(mesmoJogo && ehHistoriaCompleta(t.tema) && ehHistoriaCompleta(novo.tema));
  });
}

/** Ideias livres que ninguém pegou ainda */
export function ideiasDisponiveis(temas: TemaSA[]) {
  return IDEIAS_LIVRES.filter((i) => temasParecidos(i, temas).length === 0);
}

const ordemNumero = (a: TemaSA, b: TemaSA) => a.numero.localeCompare(b.numero, "pt-BR", { numeric: true });

/** Conteúdo do TEMAS_FEITOS.md (para colar no kit) */
export function temasParaMarkdown(temas: TemaSA[], hoje = hojeBR()): string {
  const linhas = [...temas]
    .sort((a, b) => (a.dono === b.dono ? ordemNumero(a, b) : a.dono === "Felipe" ? -1 : 1))
    .map((t) => `| ${t.numero} | ${t.tema}${t.tituloDE ? ` — „${t.tituloDE}“` : ""} | ${SITUACOES[t.situacao].toUpperCase()} | ${t.dono} |`);
  return [
    "# Story Akte — temas JÁ FEITOS ou RESERVADOS (não repetir)",
    `Atualizado em ${dataBR(hoje)}. Antes de escolher um tema novo, confira esta lista E os relatórios diários.`,
    "",
    "| Nº | Tema | Situação | Quem faz |",
    "|---|---|---|---|",
    ...linhas,
    "",
  ].join("\n");
}

const linhaTema = (t: TemaSA) =>
  [t.numero, t.tituloDE ? `„${t.tituloDE}“` : t.tema, t.jogo, t.duracao, t.pasta ? `PRONTOS/${t.pasta}` : ""].filter(Boolean).join(" · ");

/** Relatório do dia (RELATORIOS/AAAA-MM-DD.md) e texto para mandar ao Felipe */
export function relatorioDoDia(temas: TemaSA[], dia = hojeBR()): string {
  const meus = temas.filter((t) => t.dono === "Amigo").sort(ordemNumero);
  const prontosHoje = meus.filter((t) => t.situacao === "pronto" && t.prontoEm === dia);
  const emProducao = meus.filter((t) => t.situacao === "em_producao");
  const proximos = meus.filter((t) => t.situacao === "planejado");
  const bloco = (titulo: string, lista: TemaSA[]) => [`## ${titulo}`, ...(lista.length ? lista.map((t) => `- ${linhaTema(t)}`) : ["- (nenhum)"]), ""];
  return [
    `# Story Akte — relatório de ${dataBR(dia)} (Amigo)`,
    "",
    ...bloco("Vídeos produzidos hoje", prontosHoje),
    ...bloco("Comecei e não terminei", emProducao),
    ...bloco("Vou fazer em seguida (Felipe, não pega esses)", proximos),
  ].join("\n");
}

/** Resposta para "quais temas eu fiz?" — lista completa para mandar ao Felipe */
export function meusTemas(temas: TemaSA[]): string {
  const meus = temas.filter((t) => t.dono === "Amigo").sort(ordemNumero);
  if (!meus.length) return "Ainda não peguei nenhum tema do Story Akte.";
  return [
    "Story Akte — todos os temas que eu já fiz ou comecei (não repetir):",
    ...meus.map((t) => `- ${t.numero} · ${t.tituloDE ? `„${t.tituloDE}“ — ` : ""}${t.tema} · ${t.jogo} · ${SITUACOES[t.situacao]} · ${dataBR(t.prontoEm ?? t.criadoEm)}`),
  ].join("\n");
}

// ---------------- Roteiro ----------------

export interface BlocoRoteiro {
  indice: number;
  texto: string;
  palavras: number;
  /** Missões anotadas em [V: #12, #13 …] logo antes do bloco */
  missoes: number[];
}

export interface AnaliseRoteiro {
  blocos: BlocoRoteiro[];
  palavras: number;
  /** Duração estimada em segundos */
  segundos: number;
  /** Blocos com algarismos (a voz lê errado; escrever por extenso) */
  numeros: { bloco: number; trechos: string[] }[];
  /** Palavras com "sch" + consoante (às vezes a voz erra: "Schnellboot" → "Fnellboot") */
  sch: string[];
  /** Blocos sem anotação [V: #N] (missoes.json precisa de pelo menos uma missão por bloco) */
  semMissao: number[];
  alertas: string[];
  /** Rascunho do missoes.json montado a partir das anotações [V:] */
  missoesJson: string;
}

/** Palavras por minuto da voz (o kit: 1.400–1.800 palavras ≈ 10–13 min) */
export const PALAVRAS_POR_MINUTO = 140;
const PAUSA_ENTRE_BLOCOS = 0.35;

function missoesDaAnotacao(linha: string): number[] {
  const out: number[] = [];
  // Intervalos: "#48 a #52", "#48-#52", "#48 bis #52"
  const semIntervalos = linha.replace(/#(\d+)\s*(?:a|bis|-|–|até)\s*#?(\d+)/g, (_, a: string, b: string) => {
    const [x, y] = [Number(a), Number(b)];
    if (y > x && y - x <= 30) for (let n = x; n <= y; n++) out.push(n);
    else out.push(x, y);
    return " ";
  });
  for (const m of semIntervalos.matchAll(/#(\d+)/g)) out.push(Number(m[1]));
  return [...new Set(out)];
}

/** Lê o roteiro.md como o prepara_de.py: parágrafo = bloco; linhas com [ ou # não são narradas */
export function analisarRoteiro(md: string): AnaliseRoteiro {
  const txt = md.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
  const blocos: BlocoRoteiro[] = [];
  let pendentes: number[] = [];
  for (const par of txt.split(/\n\s*\n/)) {
    const linhas = par.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const l of linhas) if (l.startsWith("[V") || l.startsWith("[v")) pendentes.push(...missoesDaAnotacao(l));
    const falas = linhas.filter((l) => !l.startsWith("[") && !l.startsWith("#"));
    if (!falas.length) continue;
    const texto = falas.join(" ");
    blocos.push({ indice: blocos.length, texto, palavras: texto.split(/\s+/).filter(Boolean).length, missoes: [...new Set(pendentes)] });
    pendentes = [];
  }

  const palavras = blocos.reduce((s, b) => s + b.palavras, 0);
  const segundos = Math.round((palavras / PALAVRAS_POR_MINUTO) * 60 + blocos.length * PAUSA_ENTRE_BLOCOS);

  const numeros = blocos
    .map((b) => ({ bloco: b.indice, trechos: [...new Set(b.texto.match(/\S*\d\S*/g) ?? [])] }))
    .filter((n) => n.trechos.length);

  const sch = [
    ...new Set(
      blocos.flatMap((b) => b.texto.match(/[A-Za-zÄÖÜäöüß]*sch[lmnrw][A-Za-zÄÖÜäöüß]*/gi) ?? []),
    ),
  ];

  const semMissao = blocos.filter((b) => !b.missoes.length).map((b) => b.indice);

  const alertas: string[] = [];
  if (!blocos.length) return { blocos, palavras, segundos, numeros, sch, semMissao, alertas, missoesJson: "[]" };
  if (blocos.length < 22) alertas.push(`Só ${blocos.length} blocos — o ideal é de 22 a 28.`);
  if (blocos.length > 28) alertas.push(`${blocos.length} blocos — o ideal é de 22 a 28.`);
  if (palavras < 1400) alertas.push(`${palavras} palavras — o ideal é de 1.400 a 1.800 (vídeo de 10 a 13 min).`);
  if (palavras > 1800) alertas.push(`${palavras} palavras — passa de 1.800; o vídeo pode ficar longo demais.`);
  if (segundos < 8 * 60) alertas.push("Menos de 8 minutos: não cabe anúncio no meio (mid-roll).");
  if (segundos > 14 * 60) alertas.push("Mais de 14 minutos: o canal trabalha com 10 a 14.");
  if (numeros.length) alertas.push(`Algarismos em ${numeros.length} bloco(s): escreva os números por extenso.`);
  const ultimo = blocos[blocos.length - 1].texto;
  if (!/\?/.test(ultimo)) alertas.push("O último bloco não tem pergunta (ex.: „Welche Story als Nächstes?“).");
  if (!/abonnier/i.test(ultimo)) alertas.push("O último bloco não pede a inscrição („abonniere Story Akte“).");

  const missoesJson = `[${blocos.map((b) => `[${b.missoes.join(",")}]`).join(",")}]`;
  return { blocos, palavras, segundos, numeros, sch, semMissao, alertas, missoesJson };
}

/** 754 → "12:34" */
export function mmss(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
