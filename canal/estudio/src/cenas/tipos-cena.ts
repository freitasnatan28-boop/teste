export type PropsCena<C> = {
  cena: C;
  parte: number;
  partes: number;
  duracao: number; // frames deste subcorte
  offset: number; // frames desde o começo da cena
  duracaoCena: number;
  pasta: string;
};
