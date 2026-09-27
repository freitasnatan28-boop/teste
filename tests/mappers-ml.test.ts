import { describe, expect, it } from "vitest";
import { enriquecer, mapItem, mapProduto, parseIdExterno } from "@/marketplaces/mercadolivre/mappers";

describe("mappers do Mercado Livre", () => {
  it("produto de catálogo com buy box vira oferta", () => {
    const o = mapProduto({
      id: "MLB123",
      name: "Air Fryer",
      pictures: [{ url: "http://http2.mlstatic.com/x.jpg" }],
      buy_box_winner: { item_id: "MLB999", category_id: "MLB5726", price: 279.9, original_price: 399.9, shipping: { free_shipping: true }, official_store_id: 7 },
    });
    expect(o).toMatchObject({ idExterno: "produto:MLB123", itemId: "MLB999", preco: 279.9, precoOriginal: 399.9, freteGratis: true, lojaOficial: true });
    expect(o?.imagemUrl?.startsWith("https://")).toBe(true);
  });

  it("produto sem vendedor (buy box nulo) é ignorado", () => {
    expect(mapProduto({ id: "MLB1", name: "x", buy_box_winner: null })).toBeNull();
  });

  it("anúncio vira oferta", () => {
    const o = mapItem({ id: "MLB5", title: "Tênis", price: 100, original_price: null, sold_quantity: 50, shipping: { free_shipping: false } });
    expect(o).toMatchObject({ idExterno: "item:MLB5", preco: 100, quantidadeVendida: 50, freteGratis: false, lojaOficial: false });
  });

  it("enriquece com avaliações e vendas", () => {
    const o = mapProduto({ id: "MLB1", name: "x", buy_box_winner: { item_id: "MLB2", price: 10 } })!;
    const r = enriquecer(o, { id: "MLB2", title: "x", price: 10, original_price: 15, sold_quantity: 500 }, { rating_average: 4.66, paging: { total: 30 } });
    expect(r).toMatchObject({ precoOriginal: 15, quantidadeVendida: 500, avaliacao: 4.7, numAvaliacoes: 30 });
  });

  it("parseIdExterno entende os prefixos", () => {
    expect(parseIdExterno("produto:MLB1")).toEqual({ tipo: "produto", id: "MLB1" });
    expect(parseIdExterno("item:MLB2")).toEqual({ tipo: "item", id: "MLB2" });
    expect(parseIdExterno("MLB3")).toEqual({ tipo: "desconhecido", id: "MLB3" });
  });
});
