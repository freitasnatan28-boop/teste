const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return brl.format(v);
}

export function formatPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v)}%`;
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

export function discountPct(price: number, original: number | null | undefined): number | null {
  if (!original || original <= price || original <= 0) return null;
  return ((original - price) / original) * 100;
}
