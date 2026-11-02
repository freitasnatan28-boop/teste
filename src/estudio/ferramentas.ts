// Ferramentas que a IA do chat pode usar: gerar imagem, narração, montar vídeo
// e consultar seus avatares/arquivos. As mesmas definições servem para o
// Claude e para o GPT.
import { z } from "zod";
import { prisma } from "@/lib/db";
import { type ArquivoPublico, publico } from "./armazenamento";
import { type ConfigEstudio, FORMATOS, type Formato } from "./config";
import { gerarImagens } from "./imagem";
import { iniciarMontagem } from "./video";
import { gerarNarracao } from "./voz";

export interface DefinicaoFerramenta {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required: string[]; additionalProperties: false };
}

const formatos = Object.keys(FORMATOS) as Formato[];

export const DEFINICOES: DefinicaoFerramenta[] = [
  {
    name: "gerar_imagem",
    description:
      "Gera imagens com IA (gpt-image-2) e salva na biblioteca do usuário, que pode baixar. Use para cenas de Reels, capas e carrosséis. " +
      "Para manter um personagem/avatar ou transformar uma foto enviada pelo usuário, passe os IDs em 'referencias' e descreva no prompt o que fazer com elas " +
      "(ex.: 'the same man from the reference image, now standing in a foggy forest at night'). Escreva o prompt em inglês, bem descritivo (cena, luz, estilo, enquadramento). " +
      "Não escreva textos/legendas dentro da imagem, a menos que o usuário peça. Devolve os IDs das imagens criadas.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Descrição detalhada da imagem, em inglês." },
        formato: { type: "string", enum: formatos, description: "Proporção. 9:16 para Reels/Stories (padrão), 4:5 feed, 1:1 quadrado, 16:9 horizontal." },
        referencias: { type: "array", items: { type: "string" }, description: "IDs de imagens/avatares do usuário para usar como referência (opcional)." },
        quantidade: { type: "integer", minimum: 1, maximum: 4, description: "Quantas variações (padrão 1)." },
        rotulo: { type: "string", description: "Nome curto para o arquivo, ex.: 'cena 1 - farol'." },
      },
      required: ["prompt", "formato", "referencias", "quantidade", "rotulo"],
      additionalProperties: false,
    },
  },
  {
    name: "gerar_narracao",
    description:
      "Gera a narração em áudio (MP3) com a voz configurada do canal (ElevenLabs) e salva na biblioteca. Passe só o texto que será falado, sem marcações de cena. " +
      "Devolve o ID do áudio e a duração. Máximo de 5000 caracteres.",
    input_schema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Texto exato a ser narrado (normalmente em inglês)." },
        rotulo: { type: "string", description: "Nome curto para o arquivo." },
      },
      required: ["texto", "rotulo"],
      additionalProperties: false,
    },
  },
  {
    name: "montar_video",
    description:
      "Monta um vídeo MP4 com as imagens em sequência (com zoom suave), a narração e legendas sincronizadas palavra por palavra. " +
      "O tempo de cada imagem é dividido igualmente pela duração da narração. A montagem roda em segundo plano e aparece pronta no chat em alguns segundos/minutos.",
    input_schema: {
      type: "object",
      properties: {
        imagens: { type: "array", items: { type: "string" }, description: "IDs das imagens na ordem das cenas." },
        narracao: { type: "string", description: "ID do áudio de narração (ou string vazia para vídeo sem áudio)." },
        legendas: { type: "boolean", description: "Queimar legendas no vídeo (precisa de narração). Padrão true." },
        formato: { type: "string", enum: formatos, description: "Proporção do vídeo (padrão 9:16)." },
        rotulo: { type: "string", description: "Nome curto para o vídeo." },
      },
      required: ["imagens", "narracao", "legendas", "formato", "rotulo"],
      additionalProperties: false,
    },
  },
  {
    name: "listar_arquivos",
    description:
      "Lista os arquivos da biblioteca do usuário (avatares/fotos enviadas, imagens, narrações e vídeos gerados) com ID, nome e descrição. " +
      "Use para achar um avatar salvo pelo nome ou reaproveitar imagens de antes.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["avatar", "upload", "imagem", "audio", "video", "todos"], description: "Filtro por tipo." },
        limite: { type: "integer", minimum: 1, maximum: 50, description: "Quantos itens (mais recentes primeiro)." },
      },
      required: ["tipo", "limite"],
      additionalProperties: false,
    },
  },
];

// Validação das entradas (a IA pode errar o formato; nunca confiamos às cegas)
const fmt = z.enum(formatos as [Formato, ...Formato[]]).catch("9:16");
const esquemas = {
  gerar_imagem: z.object({
    prompt: z.string().min(1).max(4000),
    formato: fmt.optional(),
    referencias: z.array(z.string()).max(8).optional().default([]),
    quantidade: z.number().int().min(1).max(4).optional().default(1),
    rotulo: z.string().max(120).optional().default(""),
  }),
  gerar_narracao: z.object({ texto: z.string().min(1), rotulo: z.string().max(120).optional().default("") }),
  montar_video: z.object({
    imagens: z.array(z.string()).min(1).max(40),
    narracao: z.string().optional().default(""),
    legendas: z.boolean().optional().default(true),
    formato: fmt.optional(),
    rotulo: z.string().max(120).optional().default(""),
  }),
  listar_arquivos: z.object({
    tipo: z.enum(["avatar", "upload", "imagem", "audio", "video", "todos"]).optional().default("todos"),
    limite: z.number().int().min(1).max(50).optional().default(20),
  }),
};

export interface ContextoFerramenta {
  config: ConfigEstudio;
  conversaId: string;
  /** Avisa a tela quando um arquivo é criado */
  aoCriarArquivo: (a: ArquivoPublico) => void;
}

export interface ResultadoFerramenta {
  texto: string;
  erro: boolean;
}

function descreverArquivo(a: ArquivoPublico): Record<string, unknown> {
  return {
    id: a.id,
    tipo: a.avatar ? "avatar" : a.tipo,
    nome: a.rotulo || undefined,
    descricao: a.prompt ? a.prompt.slice(0, 200) : undefined,
    tamanho: a.largura ? `${a.largura}x${a.altura}` : undefined,
    duracao_s: a.duracao ?? undefined,
    status: a.status !== "pronto" ? a.status : undefined,
  };
}

export async function executarFerramenta(nome: string, entrada: unknown, ctx: ContextoFerramenta): Promise<ResultadoFerramenta> {
  try {
    switch (nome) {
      case "gerar_imagem": {
        const e = esquemas.gerar_imagem.parse(entrada);
        const imgs = await gerarImagens({
          prompt: e.prompt,
          formato: e.formato ?? ctx.config.formatoPadrao,
          qualidade: ctx.config.qualidadeImagem,
          referencias: e.referencias,
          quantidade: e.quantidade,
          rotulo: e.rotulo,
          conversaId: ctx.conversaId,
        });
        const pub = imgs.map(publico);
        pub.forEach(ctx.aoCriarArquivo);
        return { texto: JSON.stringify({ ok: true, imagens: pub.map((a) => ({ id: a.id, nome: a.rotulo, tamanho: `${a.largura}x${a.altura}` })) }), erro: false };
      }
      case "gerar_narracao": {
        const e = esquemas.gerar_narracao.parse(entrada);
        const a = publico(
          await gerarNarracao({
            texto: e.texto,
            vozId: ctx.config.vozId,
            vozNome: ctx.config.vozNome,
            modelo: ctx.config.modeloVoz,
            rotulo: e.rotulo,
            conversaId: ctx.conversaId,
          }),
        );
        ctx.aoCriarArquivo(a);
        return { texto: JSON.stringify({ ok: true, audio: { id: a.id, nome: a.rotulo, duracao_s: a.duracao } }), erro: false };
      }
      case "montar_video": {
        const e = esquemas.montar_video.parse(entrada);
        const v = publico(
          await iniciarMontagem({
            imagens: e.imagens,
            audioId: e.narracao || null,
            formato: e.formato ?? ctx.config.formatoPadrao,
            legendas: e.legendas,
            movimento: true,
            rotulo: e.rotulo,
            conversaId: ctx.conversaId,
          }),
        );
        ctx.aoCriarArquivo(v);
        return {
          texto: JSON.stringify({ ok: true, video: { id: v.id, nome: v.rotulo, status: "montando — aparece pronto no chat para o usuário baixar" } }),
          erro: false,
        };
      }
      case "listar_arquivos": {
        const e = esquemas.listar_arquivos.parse(entrada);
        const where = e.tipo === "todos" ? {} : e.tipo === "avatar" ? { avatar: true } : { tipo: e.tipo };
        const lista = await prisma.estudioArquivo.findMany({ where, orderBy: { createdAt: "desc" }, take: e.limite });
        return { texto: JSON.stringify({ arquivos: lista.map((a) => descreverArquivo(publico(a))) }), erro: false };
      }
      default:
        return { texto: `Ferramenta desconhecida: ${nome}`, erro: true };
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { texto: `Entrada inválida para ${nome}: ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, erro: true };
    }
    return { texto: err instanceof Error ? err.message : "Erro inesperado", erro: true };
  }
}

/** Texto curto mostrado na tela enquanto a ferramenta roda. */
export function rotuloFerramenta(nome: string): string {
  return (
    {
      gerar_imagem: "🖼️ Gerando imagem…",
      gerar_narracao: "🎙️ Gerando narração…",
      montar_video: "🎬 Montando vídeo…",
      listar_arquivos: "📁 Consultando sua biblioteca…",
    }[nome] ?? `⚙️ ${nome}…`
  );
}
