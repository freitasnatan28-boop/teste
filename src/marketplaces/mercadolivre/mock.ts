// Modo demonstração (ML_MOCK=true): imita as respostas da API do ML com
// produtos de exemplo, para você conhecer o painel sem criar o app no ML.
// Os preços variam um pouco a cada consulta para o histórico ter dados.
import { MlHttpError } from "./client";

interface Exemplo {
  produto: string;
  item: string;
  nome: string;
  categoria: string;
  preco: number;
  de: number | null;
  frete: boolean;
  oficial: boolean;
  nota: number;
  avaliacoes: number;
  vendidos: number;
  img: string;
}

const EXEMPLOS: Exemplo[] = [
  { produto: "MLB90000001", item: "MLB5000000001", nome: "Fritadeira Air Fryer 4L Preta 1500W", categoria: "MLB5726", preco: 279.9, de: 399.9, frete: true, oficial: true, nota: 4.8, avaliacoes: 5230, vendidos: 50000, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Air+Fryer" },
  { produto: "MLB90000002", item: "MLB5000000002", nome: "Árvore de Natal Pinheiro 1,80m 580 Galhos", categoria: "MLB1574", preco: 189.9, de: 259.9, frete: true, oficial: false, nota: 4.6, avaliacoes: 812, vendidos: 5000, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Arvore+de+Natal" },
  { produto: "MLB90000003", item: "MLB5000000003", nome: "Vestido Midi Feminino Linho Alça Verão", categoria: "MLB1430", preco: 79.9, de: 399.9, frete: false, oficial: false, nota: 4.1, avaliacoes: 96, vendidos: 500, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Vestido" },
  { produto: "MLB90000004", item: "MLB5000000004", nome: "Carrinho de Bebê Travel System Com Bebê Conforto", categoria: "MLB1384", preco: 899.0, de: 1199.0, frete: true, oficial: true, nota: 4.7, avaliacoes: 1450, vendidos: 5000, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Carrinho+Bebe" },
  { produto: "MLB90000005", item: "MLB5000000005", nome: "Ventilador de Mesa 40cm 6 Pás Turbo Silencioso", categoria: "MLB5726", preco: 129.9, de: 169.9, frete: true, oficial: false, nota: 4.5, avaliacoes: 3100, vendidos: 50000, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Ventilador" },
  { produto: "MLB90000006", item: "MLB5000000006", nome: "Protetor Solar Facial FPS 60 Toque Seco 50g", categoria: "MLB1246", preco: 49.9, de: 69.9, frete: false, oficial: true, nota: 4.9, avaliacoes: 12000, vendidos: 100000, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Protetor+Solar" },
  { produto: "MLB90000007", item: "MLB5000000007", nome: "Jogo de Panelas Antiaderente 5 Peças Cerâmica", categoria: "MLB1574", preco: 219.9, de: null, frete: true, oficial: false, nota: 4.4, avaliacoes: 640, vendidos: 5000, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Panelas" },
  { produto: "MLB90000008", item: "MLB5000000008", nome: "Tênis Feminino Casual Plataforma Branco", categoria: "MLB1430", preco: 119.9, de: 179.9, frete: true, oficial: false, nota: 4.3, avaliacoes: 2100, vendidos: 10000, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Tenis" },
  { produto: "MLB90000009", item: "MLB5000000009", nome: "Fralda Descartável Tamanho G 120 Unidades", categoria: "MLB1384", preco: 139.9, de: 189.9, frete: true, oficial: true, nota: 4.9, avaliacoes: 8900, vendidos: 100000, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Fralda" },
  { produto: "MLB90000010", item: "MLB5000000010", nome: "Pisca Pisca Natal 100 LEDs Luz Quente 8 Funções", categoria: "MLB1574", preco: 24.9, de: 29.9, frete: false, oficial: false, nota: 4.2, avaliacoes: 3300, vendidos: 50000, img: "https://placehold.co/400x400/f6eee6/c2185b/png?text=Pisca+Pisca" },
];

const CATEGORIAS = [
  { id: "MLB5726", name: "Eletrodomésticos" },
  { id: "MLB1574", name: "Casa, Móveis e Decoração" },
  { id: "MLB1430", name: "Calçados, Roupas e Bolsas" },
  { id: "MLB1384", name: "Bebês" },
  { id: "MLB1246", name: "Beleza e Cuidado Pessoal" },
];

// Produtos de exemplo não existem no ML: o link abre a busca real por esse nome.
function linkBusca(e: Exemplo) {
  const slug = norm(e.nome).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `https://lista.mercadolivre.com.br/${slug}`;
}

let consultas = 0;
function precoAtual(e: Exemplo): number {
  consultas++;
  const variacao = 1 + 0.05 * Math.sin(consultas + Number(e.produto.slice(-2)));
  return Math.round(e.preco * variacao * 100) / 100;
}

function produtoJson(e: Exemplo) {
  return {
    id: e.produto,
    status: "active",
    name: e.nome,
    permalink: linkBusca(e),
    pictures: [{ url: e.img }],
    buy_box_winner: {
      item_id: e.item,
      category_id: e.categoria,
      price: precoAtual(e),
      original_price: e.de,
      currency_id: "BRL",
      shipping: { free_shipping: e.frete },
      official_store_id: e.oficial ? 1 : null,
    },
  };
}

function itemJson(e: Exemplo) {
  return {
    id: e.item,
    title: e.nome,
    price: precoAtual(e),
    original_price: e.de,
    currency_id: "BRL",
    permalink: linkBusca(e),
    secure_thumbnail: e.img,
    category_id: e.categoria,
    catalog_product_id: e.produto,
    official_store_id: e.oficial ? 1 : null,
    official_store_name: e.oficial ? "Loja Oficial Exemplo" : null,
    sold_quantity: e.vendidos,
    shipping: { free_shipping: e.frete },
  };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function mockMlGet<T>(path: string): Promise<T> {
  const url = new URL(path, "https://mock.local");
  const p = url.pathname;
  const res = (x: unknown) => Promise.resolve(x as T);

  // Simula a busca pública bloqueada (como acontece na API real hoje)
  if (p === "/sites/MLB/search") throw new MlHttpError(403, path, "forbidden");
  if (p === "/sites/MLB/categories") return res(CATEGORIAS);
  if (p === "/products/search") {
    const q = norm(url.searchParams.get("q") ?? "");
    const termos = q.split(/\s+/).filter(Boolean);
    const achados = EXEMPLOS.filter((e) => termos.some((t) => norm(e.nome).includes(t)));
    return res({ keywords: q, paging: { total: achados.length }, results: achados.map((e) => ({ id: e.produto, name: e.nome })) });
  }
  let m = p.match(/^\/products\/(MLB\d+)$/);
  if (m) {
    const e = EXEMPLOS.find((x) => x.produto === m![1]);
    if (!e) throw new MlHttpError(404, path, "not_found");
    return res(produtoJson(e));
  }
  if (p === "/items/bulk") {
    const ids = (url.searchParams.get("ids") ?? "").split(",");
    return res(
      ids.map((id) => {
        const e = EXEMPLOS.find((x) => x.item === id);
        return e ? { id, status_code: 200, body: itemJson(e) } : { id, status_code: 404, body: null };
      }),
    );
  }
  m = p.match(/^\/items\/(MLB\d+)$/);
  if (m) {
    const e = EXEMPLOS.find((x) => x.item === m![1]);
    if (!e) throw new MlHttpError(404, path, "not_found");
    return res(itemJson(e));
  }
  m = p.match(/^\/reviews\/item\/(MLB\d+)$/);
  if (m) {
    const e = EXEMPLOS.find((x) => x.item === m![1]);
    return res(e ? { rating_average: e.nota, paging: { total: e.avaliacoes } } : { rating_average: 0, paging: { total: 0 } });
  }
  m = p.match(/^\/highlights\/MLB\/category\/(MLB\d+)$/);
  if (m) {
    const lista = EXEMPLOS.filter((e) => e.categoria === m![1]);
    if (!lista.length) throw new MlHttpError(404, path, "Dimension CATEGORY not found");
    return res({ content: lista.map((e, i) => ({ id: i % 2 ? e.item : e.produto, position: i + 1, type: i % 2 ? "ITEM" : "PRODUCT" })) });
  }
  m = p.match(/^\/categories\/(MLB\d+)$/);
  if (m) {
    const c = CATEGORIAS.find((x) => x.id === m![1]);
    if (!c) throw new MlHttpError(404, path, "not_found");
    return res({ id: c.id, name: c.name, path_from_root: [c], children_categories: [] });
  }
  throw new MlHttpError(404, path, "mock sem este endpoint");
}
