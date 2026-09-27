// Tags de nicho padrão. Você pode editar palavras-chave pelo banco (npm run db:studio).
// categoryIds = categorias RAIZ do Mercado Livre (MLB).

export interface TagPadrao {
  slug: string;
  name: string;
  keywords: string[];
  categoryIds: string[];
}

export const TAGS_PADRAO: TagPadrao[] = [
  {
    slug: "natal",
    name: "Natal",
    keywords: ["natal", "natalina", "natalino", "pisca pisca", "pisca-pisca", "papai noel", "panetone", "guirlanda", "presépio", "arvore de natal", "árvore de natal"],
    categoryIds: [],
  },
  {
    slug: "casa",
    name: "Casa",
    keywords: ["panela", "cozinha", "toalha", "lençol", "organizador", "air fryer", "aspirador", "cafeteira"],
    categoryIds: ["MLB1574", "MLB5726", "MLB1500"], // Casa/Móveis, Eletrodomésticos, Construção
  },
  {
    slug: "moda",
    name: "Moda",
    keywords: ["vestido", "blusa", "tênis", "tenis", "bolsa", "sandália", "calça", "saia", "camiseta"],
    categoryIds: ["MLB1430"], // Calçados, Roupas e Bolsas
  },
  {
    slug: "maternidade",
    name: "Maternidade",
    keywords: ["bebê", "bebe", "fralda", "mamadeira", "carrinho de bebê", "berço", "gestante", "amamentação", "chupeta"],
    categoryIds: ["MLB1384"], // Bebês
  },
  {
    slug: "verao",
    name: "Verão",
    keywords: ["ventilador", "ar condicionado", "ar-condicionado", "piscina", "protetor solar", "biquíni", "biquini", "sunga", "cooler", "guarda-sol", "canga", "chinelo", "verão"],
    categoryIds: [],
  },
];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Descobre as tags de um produto pelo título e pela categoria raiz. */
export function sugerirTags(titulo: string, rootCategoryId: string | null | undefined, tags: { slug: string; keywords: string[]; categoryIds: string[] }[]): string[] {
  const t = ` ${norm(titulo)} `;
  return tags
    .filter((tag) => (rootCategoryId && tag.categoryIds.includes(rootCategoryId)) || tag.keywords.some((k) => new RegExp(`\\b${norm(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t)))
    .map((tag) => tag.slug);
}
