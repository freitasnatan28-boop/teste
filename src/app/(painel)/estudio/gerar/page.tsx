import { Gerador } from "@/components/estudio/Gerador";
import { FORMATOS, lerConfigEstudio, QUALIDADES, servicos } from "@/estudio/config";
import { MODELOS_VOZ } from "@/estudio/voz";

export const dynamic = "force-dynamic";

export default async function GerarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const c = await lerConfigEstudio();
  const aba = sp.aba === "narracao" || sp.aba === "video" ? sp.aba : "imagem";
  return (
    <>
      <h1 className="titulo-pagina">Gerar</h1>
      <Gerador
        abaInicial={aba}
        formatos={Object.entries(FORMATOS).map(([valor, f]) => ({ valor, rotulo: f.rotulo }))}
        qualidades={Object.entries(QUALIDADES).map(([valor, rotulo]) => ({ valor, rotulo }))}
        modelosVoz={Object.entries(MODELOS_VOZ).map(([valor, rotulo]) => ({ valor, rotulo }))}
        padrao={{ formato: c.formatoPadrao, qualidade: c.qualidadeImagem, vozId: c.vozId, vozNome: c.vozNome, modeloVoz: c.modeloVoz }}
        servicos={servicos()}
      />
    </>
  );
}
