// Interface comum a todos os marketplaces ("marketplace adapter").
// Cada marketplace (Mercado Livre, Shopee, ...) implementa estes métodos,
// e o resto do sistema não precisa saber de qual loja o produto veio.

export type MarketplaceId = "mercadolivre" | "shopee";

export interface FiltroBusca {
  /** Palavra-chave, ex.: "air fryer" */
  palavraChave?: string;
  /** ID de categoria do marketplace, ex.: "MLB1574" */
  categoriaId?: string;
  /** Máximo de resultados desejados (padrão 20) */
  limite?: number;
}

/** Oferta já normalizada, igual para qualquer marketplace. */
export interface OfertaNormalizada {
  marketplace: MarketplaceId;
  /** ID principal no marketplace (produto de catálogo ou anúncio) */
  idExterno: string;
  /** Anúncio que está vendendo (no ML: vencedor do "buy box") */
  itemId?: string | null;
  titulo: string;
  urlProduto?: string | null;
  imagemUrl?: string | null;
  categoriaId?: string | null;
  preco: number;
  precoOriginal?: number | null;
  moeda: string;
  avaliacao?: number | null;
  numAvaliacoes?: number | null;
  quantidadeVendida?: number | null;
  /** Posição no ranking de mais vendidos da categoria (1 = mais vendido) */
  posicaoMaisVendidos?: number | null;
  freteGratis: boolean;
  lojaOficial: boolean;
  nomeLojaOficial?: string | null;
}

export type ResultadoLinkAfiliado =
  | { tipo: "automatico"; url: string }
  | {
      tipo: "manual";
      /** Passo a passo mostrado no painel */
      instrucoes: string[];
      /** Página oficial para gerar o link */
      urlGerador: string;
      /** Link do produto para colar no gerador */
      urlProduto: string | null;
    };

export interface ResultadoBusca {
  ofertas: OfertaNormalizada[];
  /** Avisos para mostrar no painel (ex.: itens ignorados, fallback usado) */
  avisos: string[];
}

export interface MarketplaceAdapter {
  readonly id: MarketplaceId;
  readonly nome: string;
  /** Ligado/desligado pela configuração do .env */
  habilitado(): boolean;
  /** Motivo de estar desligado (para mostrar no painel) */
  motivoDesabilitado(): string | null;

  buscarOfertas(filtro: FiltroBusca): Promise<ResultadoBusca>;
  detalhesProduto(idExterno: string): Promise<OfertaNormalizada | null>;
  gerarLinkAfiliado(oferta: Pick<OfertaNormalizada, "idExterno" | "urlProduto">): Promise<ResultadoLinkAfiliado>;

  /** Confere se um link colado pelo usuário parece um link de afiliado válido desta loja */
  validarLinkAfiliado(url: string): { ok: true; url: string } | { ok: false; erro: string };
  /** Tenta descobrir o ID do produto a partir de um link (de produto ou de afiliado) */
  extrairIdDeLink(url: string): Promise<string | null>;
}

export class MarketplaceError extends Error {
  constructor(
    message: string,
    public readonly codigo: "nao_conectado" | "proibido" | "limite" | "nao_encontrado" | "desabilitado" | "outro" = "outro",
  ) {
    super(message);
    this.name = "MarketplaceError";
  }
}
