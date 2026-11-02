import { Biblioteca } from "@/components/estudio/Biblioteca";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filtros = ["avatar", "upload", "imagem", "audio", "video"];
  return (
    <>
      <h1 className="titulo-pagina">Biblioteca</h1>
      <Biblioteca filtroInicial={filtros.includes(sp.filtro ?? "") ? sp.filtro! : ""} />
    </>
  );
}
