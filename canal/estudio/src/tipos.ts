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
    }
  | {
      tipo: "mapa";
      de?: Vista;
      para: Vista;
      destaques?: { iso: string; cor?: string; em?: number }[]; // em: 0-1 dentro da cena
      rotas?: { pontos: LonLat[]; cor?: string; icone?: "navio" | "aviao" | "lagosta"; inicio?: number; fim?: number; tracejada?: boolean }[];
      pontos?: { lonlat: LonLat; rotulo?: string; cor?: string; em?: number; icone?: "navio" | "lagosta" | "alvo" }[];
      titulo?: string;
    }
  | { tipo: "texto"; linhas: string[]; cor?: string; img?: string; tremer?: boolean }
  | { tipo: "data"; texto: string; sub?: string }
  | { tipo: "lista"; titulo?: string; marca?: "x" | "numero"; itens: { texto: string; em?: string; aos?: number }[] } // aos: frame calculado a partir de "em"
  | { tipo: "citacao"; texto: string; autor: string; img?: string }
  | { tipo: "versus"; esquerda: "BRA" | "FRA" | "USA"; direita: "BRA" | "FRA" | "USA"; titulo?: string }
  | { tipo: "radar"; rotulo?: string }
  | { tipo: "contador"; ate: number; unidade: string; sub?: string; prefixo?: string }
  | { tipo: "plataforma"; destaque?: "plataforma" | "mar"; lagostaPula?: boolean; bandeira?: "BRA" | "FRA" }
  | { tipo: "linhaTempo"; itens: { data: string; texto: string }[] }
  | { tipo: "final" };

export type CenaStoryboard = Cena & { em?: string; som?: string }; // em: palavra que dispara o corte; som: efeito em public/sons

export type Storyboard = {
  titulo: string;
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
  corte: boolean; // true no primeiro subcorte de cada cena (toca whoosh)
};

export type Timeline = {
  pasta: string; // ex.: videos/001-guerra-da-lagosta
  fps: number;
  duracao: number;
  beats: { id: string; inicio: number; audio: string; duracao: number }[];
  cenas: TCena[];
  destaques: { inicio: number; duracao: number; texto: string }[];
  capitulos: { inicio: number; numero: number; titulo: string }[];
  sons: { inicio: number; som: string; volume: number }[];
};
