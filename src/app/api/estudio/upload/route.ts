// Envio de imagens (avatares, fotos, personagens) para o estúdio.
import { NextResponse } from "next/server";
import { dimensoesImagem, mimeImagem, publico, registrarArquivo } from "@/estudio/armazenamento";
import { erroJson, semLogin } from "@/estudio/api";

export const dynamic = "force-dynamic";

const LIMITE = 20 * 1024 * 1024;

export async function POST(req: Request) {
  const bloqueio = await semLogin();
  if (bloqueio) return bloqueio;
  try {
    const form = await req.formData();
    const avatar = form.get("avatar") === "1";
    const rotulo = String(form.get("rotulo") ?? "").trim();
    const arquivos = form.getAll("arquivo").filter((f): f is File => f instanceof File);
    if (!arquivos.length) return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
    const salvos = [];
    for (const f of arquivos.slice(0, 10)) {
      if (f.size > LIMITE) return NextResponse.json({ erro: `"${f.name}" passa de 20 MB.` }, { status: 400 });
      const bytes = Buffer.from(await f.arrayBuffer());
      const mime = mimeImagem(bytes);
      if (!mime) return NextResponse.json({ erro: `"${f.name}" não é uma imagem PNG, JPG, WEBP ou GIF.` }, { status: 400 });
      const dim = dimensoesImagem(bytes);
      const nome = rotulo || f.name.replace(/\.[a-z0-9]+$/i, "");
      salvos.push(
        publico(
          await registrarArquivo({ tipo: "upload", bytes, mime, rotulo: nome, avatar, largura: dim?.largura, altura: dim?.altura }),
        ),
      );
    }
    return NextResponse.json({ arquivos: salvos });
  } catch (e) {
    return erroJson(e, 500);
  }
}
