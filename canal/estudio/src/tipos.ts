// Tipos do storyboard (escrito por vídeo) e da linha do tempo (gerada por scripts/montar.ts).

export type LonLat = [number, number];

export type Vista = { centro: LonLat; zoom: number };

export type Cena =
  | {
      tipo: "foto";
      img: string; // nome do arquivo em <video>/imagens, sem extensão
      modo?: "cheia" | "retrato";
      rotulo?: string;
      nome?: string; // modo retrato: nome grande
      cargo?: string; // modo retrato: linha de baixo
      focos?: [number, number][]; // pontos (0-1) para os punch-ins de cada subcorte
      pb?: boolean; // preto e branco
      efeito?: "flash" | "noite";
      ia?: boolean; // ilustração gerada por IA: mostra o selo "Ilustração (IA)"
    }
  | {
      tipo: "mapa";
      de?: Vista; // se faltar, a câmera continua de onde o mapa anterior parou
      para: Vista;
      estilo?: "satelite" | "antigo";
      ano?: string; // número grande no topo (ex.: "1963")
      paises?: { iso: string; bandeira?: Pais; cor?: string; em?: string; aos?: number; perto?: LonLat }[]; // território pintado (perto: escolhe a parte do país perto desse ponto, ex.: Alasca)
      atores?: Ator[]; // balões, retratos, ícones etc. presos ao mapa
      zonas?: { pontos: LonLat[]; bandeira?: Pais; cor?: string; em?: string; aos?: number; rotulo?: string }[]; // área listrada (controle/zona)
      fundo?: { img: string; oeste: number; leste: number; norte: number; sul: number }; // calculado
      destaques?: { iso: string; cor?: string; em?: number }[]; // em: 0-1 dentro da cena
      rotas?: { pontos: LonLat[]; cor?: string; icone?: "navio" | "aviao" | "lagosta" | "dinheiro"; pais?: Pais; inicio?: number; fim?: number; tracejada?: boolean }[];
      pontos?: { lonlat: LonLat; rotulo?: string; cor?: string; em?: number; icone?: "navio" | "lagosta" | "alvo" }[];
      titulo?: string;
    }
  | { tipo: "texto"; linhas: string[]; cor?: string; img?: string; tremer?: boolean }
  | { tipo: "data"; texto: string; sub?: string }
  | { tipo: "lista"; titulo?: string; marca?: "x" | "numero"; itens: { texto: string; em?: string; aos?: number }[] } // aos: frame calculado a partir de "em"
  | { tipo: "citacao"; texto: string; autor: string; img?: string }
  | { tipo: "versus"; esquerda: Pais; direita: Pais; titulo?: string }
  | { tipo: "radar"; rotulo?: string }
  | { tipo: "contador"; ate: number; unidade: string; sub?: string; prefixo?: string }
  | { tipo: "plataforma"; destaque?: "plataforma" | "mar"; lagostaPula?: boolean; bandeira?: "BRA" | "FRA" }
  | { tipo: "linhaTempo"; itens: { data: string; texto: string }[] }
  | { tipo: "final" };

export type Pais = "BRA" | "FRA" | "USA" | "ESP" | "MEX" | "RUS" | "DNK" | "GRL" | "GBR" | "CHN" | "URS";

export type Icone = "documento" | "navio" | "aviao" | "lagosta" | "ancora" | "explosao" | "alerta" | "interrogacao" | "acordo" | "radar" | "tropa" | "dinheiro" | "ouro" | "petroleo" | "minerio";

// Elementos presos a um ponto do mapa. "em"/"ate" são palavras da narração (o montar converte em frames).
export type Ator = { lonlat: LonLat; em?: string; ate?: string; aos?: number; ateAos?: number } & (
  | { tipo: "retrato"; img: string; nome: string }
  | { tipo: "fala"; texto: string; dx?: number; dy?: number } // dx/dy: ignorados no modelo de mapa (balão se posiciona sozinho)
  | { tipo: "icone"; icone: Icone; rotulo?: string; cor?: string }
  | { tipo: "bandeira"; pais: Pais }
  | { tipo: "foto"; img: string; rotulo?: string }
  | { tipo: "rotulo"; texto: string; cor?: string }
  // Ficha militar (hexágono com bandeira) ou navio com bandeirinha; "para" + "mover" fazem ela andar no mapa.
  | { tipo: "unidade"; pais: Pais; forma?: "hex" | "navio"; para?: LonLat; mover?: string; moverAos?: number }
  | { tipo: "reacao"; emoji: string; dx?: number; dy?: number } // balão com emoji (😠 😟 😏 😮)
  | { tipo: "lupa"; img: string; raio?: number; rotulo?: string } // círculo que aproxima um detalhe
  | { tipo: "preco"; valor: number; rotulo?: string } // etiqueta de preço com o número subindo (som de caixa registradora)
  | { tipo: "carimbo"; texto: string; cor?: string } // carimbo batendo na tela (ex.: SECRET)
);

export type CenaStoryboard = Cena & { em?: string; som?: string }; // em: palavra que dispara o corte; som: efeito em public/sons

export type Storyboard = {
  titulo: string;
  idioma?: "pt" | "en"; // textos fixos da tela (marca, inscreva-se...). Padrão: pt
  estilo?: "documentario" | "mapa"; // "mapa": modelo dos vídeos de geopolítica (sem granulado, sons de balão)
  trilha?: string; // arquivo em public/sons, sem extensão
  beats: Record<
    string,
    {
      cenas: CenaStoryboard[];
      destaques?: (string | { palavra: string; texto: string })[];
      apoio?: string[]; // fotos de apoio que entram quando um gráfico passa do tempo
    }
  >;
};

// ---------- Linha do tempo (tudo em frames) ----------

export type TCena = {
  inicio: number;
  duracao: number;
  cena: Cena;
  parte: number; // índice do subcorte
  partes: number;
  offset: number; // frames desde o começo da cena (para animações contínuas)
  duracaoCena: number;
  corte: boolean;
  transicao: Transicao;
};

export type Transicao = "zoom" | "deslize-esq" | "deslize-dir" | "escurecer" | "flash" | "suave" | "luz" | "nenhuma";

export type Timeline = {
  pasta: string; // ex.: videos/001-guerra-da-lagosta
  idioma?: "pt" | "en";
  estilo: "documentario" | "mapa";
  trilha: string;
  fps: number;
  duracao: number;
  beats: { id: string; inicio: number; audio: string; duracao: number }[];
  cenas: TCena[];
  destaques: { inicio: number; duracao: number; texto: string }[];
  largura: number;
  altura: number;
  capitulos: { inicio: number; numero: number; titulo: string }[];
  sons: { inicio: number; som: string; volume: number }[];
};
