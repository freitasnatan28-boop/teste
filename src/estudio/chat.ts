// Orquestra uma rodada do chat: salva sua mensagem, monta o histórico,
// chama o provedor escolhido (Claude ou GPT) e salva a resposta com os arquivos gerados.
import { prisma } from "@/lib/db";
import { lerBytes, publico } from "./armazenamento";
import { rodarClaude } from "./chat-claude";
import { rodarOpenAI } from "./chat-openai";
import type { AnexoHistorico, EventoChat, MensagemHistorico } from "./chat-tipos";
import { lerConfigEstudio, servicos } from "./config";

const COMPLEMENTO_SISTEMA = `

---
SOBRE ESTE ESTÚDIO (instruções técnicas)
- Você está num site próprio do usuário, com ferramentas reais: gerar_imagem, gerar_narracao, montar_video e listar_arquivos.
- Tudo o que você gera aparece na hora para o usuário, com botão de baixar. Não diga que não consegue gerar imagens, áudios ou vídeos: use as ferramentas.
- Imagens enviadas pelo usuário chegam com um id. Se for foto de produto, use o id em "referencias" de TODAS as cenas para o produto sair igual ao real. Para transformar uma foto/avatar, também use o id em "referencias".
- Se o usuário falar de um produto ou avatar salvo antes (pelo nome), use listar_arquivos com tipo "avatar" (são os salvos com estrela) para achar o id.
- Para um vídeo completo: gere as imagens das cenas, depois a narração, e por último chame montar_video com os ids na ordem, o hook em "gancho" e o CTA em "cta". Pode gerar várias imagens em paralelo.
- Nunca mostre os ids para o usuário (eles são só para você usar nas ferramentas); os arquivos já aparecem na tela com botão de baixar.
- Antes de gastar com muitas imagens (mais de 8) ou refazer tudo, confirme com o usuário.
- Formate as respostas em Markdown simples (títulos curtos, listas, **negrito**).`;

function tituloDe(texto: string): string {
  const t = texto.replace(/\s+/g, " ").trim();
  if (!t) return "Nova conversa";
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

function lerJson<T>(s: string | null | undefined, padrao: T): T {
  if (!s) return padrao;
  try {
    return JSON.parse(s) as T;
  } catch {
    return padrao;
  }
}

export async function conversar(opts: { conversaId?: string | null; texto: string; anexos: string[]; emitir: (e: EventoChat) => void }) {
  const config = await lerConfigEstudio();
  const disp = servicos();
  const provedor = config.provedorChat === "claude" && disp.claude ? "claude" : disp.openai ? "openai" : disp.claude ? "claude" : null;
  if (!provedor) {
    opts.emitir({ tipo: "erro", mensagem: "Nenhuma IA de chat configurada. Coloque ANTHROPIC_API_KEY ou OPENAI_API_KEY no .env e reinicie o painel." });
    return;
  }

  // Conversa (cria se for nova)
  let conversa = opts.conversaId ? await prisma.estudioConversa.findUnique({ where: { id: opts.conversaId } }) : null;
  if (!conversa) conversa = await prisma.estudioConversa.create({ data: { titulo: tituloDe(opts.texto) } });
  opts.emitir({ tipo: "conversa", conversaId: conversa.id, titulo: conversa.titulo });

  const anexosValidos = opts.anexos.length
    ? (await prisma.estudioArquivo.findMany({ where: { id: { in: opts.anexos } } })).filter((a) => a.status === "pronto" && a.mime.startsWith("image/"))
    : [];
  await prisma.estudioMensagem.create({
    data: { conversaId: conversa.id, papel: "user", texto: opts.texto, arquivos: JSON.stringify(anexosValidos.map((a) => a.id)) },
  });

  // Histórico completo (em ordem)
  const mensagens = await prisma.estudioMensagem.findMany({ where: { conversaId: conversa.id }, orderBy: { createdAt: "asc" } });
  const idsAnexos = new Set<string>();
  for (const m of mensagens) if (m.papel === "user") lerJson<string[]>(m.arquivos, []).forEach((id) => idsAnexos.add(id));
  const arquivosAnexos = await prisma.estudioArquivo.findMany({ where: { id: { in: [...idsAnexos] } } });
  const cacheAnexos = new Map<string, AnexoHistorico>();
  for (const a of arquivosAnexos) {
    try {
      cacheAnexos.set(a.id, { id: a.id, mime: a.mime, base64: (await lerBytes(a)).toString("base64"), rotulo: a.rotulo, avatar: a.avatar });
    } catch {
      /* arquivo apagado: segue sem ele */
    }
  }
  const historico: MensagemHistorico[] = mensagens.map((m) => ({
    papel: m.papel === "assistant" ? "assistant" : "user",
    texto: m.texto,
    anexos: m.papel === "user" ? lerJson<string[]>(m.arquivos, []).map((id) => cacheAnexos.get(id)).filter((a): a is AnexoHistorico => Boolean(a)) : [],
    bruto: m.papel === "assistant" && m.provedor === provedor ? lerJson<unknown[] | null>(m.bruto, null) : null,
  }));

  const gerados: string[] = [];
  const ctx = {
    config,
    conversaId: conversa.id,
    aoCriarArquivo: (a: ReturnType<typeof publico>) => {
      gerados.push(a.id);
      opts.emitir({ tipo: "arquivo", arquivo: a });
    },
  };
  // A geração continua mesmo se você fechar a página (os arquivos ficam salvos na conversa)
  const sinal = new AbortController().signal;
  const system = config.instrucoes.trim() + COMPLEMENTO_SISTEMA;
  const params = { system, historico, ctx, emitir: opts.emitir, sinal };

  let resultado: { texto: string; bruto: unknown[] | null };
  try {
    resultado = provedor === "claude" ? await rodarClaude(params) : await rodarOpenAI(params);
  } catch (e) {
    opts.emitir({ tipo: "erro", mensagem: e instanceof Error ? e.message : "Erro inesperado" });
    resultado = { texto: "", bruto: null };
  }

  const salva = await prisma.estudioMensagem.create({
    data: {
      conversaId: conversa.id,
      papel: "assistant",
      texto: resultado.texto.trim() || (gerados.length ? "" : "⚠️ Não houve resposta. Tente de novo."),
      arquivos: JSON.stringify(gerados),
      provedor,
      bruto: resultado.bruto ? JSON.stringify(resultado.bruto) : null,
    },
  });
  await prisma.estudioConversa.update({ where: { id: conversa.id }, data: { updatedAt: new Date() } });
  opts.emitir({ tipo: "fim", mensagemId: salva.id });
}

/** Mensagens de uma conversa no formato da tela. */
export async function carregarConversa(id: string) {
  const conversa = await prisma.estudioConversa.findUnique({ where: { id }, include: { mensagens: { orderBy: { createdAt: "asc" } } } });
  if (!conversa) return null;
  const ids = new Set<string>();
  conversa.mensagens.forEach((m) => lerJson<string[]>(m.arquivos, []).forEach((x) => ids.add(x)));
  const arquivos = new Map((await prisma.estudioArquivo.findMany({ where: { id: { in: [...ids] } } })).map((a) => [a.id, publico(a)]));
  return {
    id: conversa.id,
    titulo: conversa.titulo,
    mensagens: conversa.mensagens.map((m) => ({
      id: m.id,
      papel: m.papel as "user" | "assistant",
      texto: m.texto,
      arquivos: lerJson<string[]>(m.arquivos, [])
        .map((x) => arquivos.get(x))
        .filter((a): a is NonNullable<typeof a> => Boolean(a)),
    })),
  };
}
