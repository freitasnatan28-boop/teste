import QRCode from "qrcode";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { lerConfig } from "@/lib/configuracoes";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { cancelarFila, comando, pausar, retomar, salvarGrupo } from "./actions";

export const dynamic = "force-dynamic";

const ROTULO: Record<string, string> = {
  conectado: "🟢 Conectado",
  aguardando_qr: "🟡 Aguardando leitura do QR code",
  desconectado: "🔴 Desconectado",
};

export default async function WhatsAppPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [sessao, grupos, tags, pendentes, recentes, logBruto, batimento] = await Promise.all([
    prisma.whatsAppSession.findUnique({ where: { id: "principal" } }),
    prisma.whatsAppGroup.findMany({ orderBy: [{ isAdmin: "desc" }, { name: "asc" }] }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.sendJob.findMany({ where: { status: "pendente" }, orderBy: { scheduledAt: "asc" }, take: 20 }),
    prisma.sendJob.findMany({ where: { status: { in: ["enviado", "erro", "cancelado"] } }, orderBy: { createdAt: "desc" }, take: 20 }),
    lerConfig("wa_log"),
    lerConfig("wa_heartbeat"),
  ]);
  const nomes = new Map(grupos.map((g) => [g.jid, g.name]));
  const produtos = new Map(
    (await prisma.product.findMany({ where: { id: { in: [...pendentes, ...recentes].map((j) => j.productId) } }, select: { id: true, title: true } })).map((p) => [p.id, p.title]),
  );
  const qr = sessao?.status === "aguardando_qr" && sessao.qr ? await QRCode.toDataURL(sessao.qr, { margin: 1, width: 280 }) : null;
  const roboParado = !batimento || Date.now() - Number(batimento) > 90_000;
  const pausado = sessao?.pausedUntil && sessao.pausedUntil.getTime() > Date.now();
  const admins = grupos.filter((g) => g.isAdmin);
  const outros = grupos.length - admins.length;
  const log = logBruto ? (JSON.parse(logBruto) as string[]).slice(0, 15) : [];

  return (
    <>
      <h1 className="titulo-pagina">WhatsApp</h1>
      <Flash msg={sp.msg} erro={sp.erro} />
      {(sessao?.status !== "conectado" || pendentes.length > 0) && <AutoRefresh segundos={5} />}

      <div className="aviso">
        ⚠️ <strong>Risco de banimento:</strong> o WhatsApp não tem forma oficial de postar em grupos automaticamente. Use um <strong>número separado</strong> (não o seu pessoal).
        O robô é conservador: só posta em grupos onde você é admin, espera de 20 a 60s entre grupos, tem limite por hora e pausa sozinho se der erro.
      </div>

      <section className="card">
        <h2>📱 Conexão</h2>
        <p>
          <strong>{roboParado ? "⚫ Robô desligado" : (ROTULO[sessao?.status ?? "desconectado"] ?? sessao?.status)}</strong>
          {sessao?.phone && sessao.status === "conectado" ? ` · +${sessao.phone}` : ""}
        </p>
        {sessao?.lastError && <div className="flash flash-erro">{sessao.lastError}</div>}
        {pausado && (
          <div className="aviso">
            ⏸️ Envios pausados até {formatDate(sessao!.pausedUntil!)}.
            <form action={retomar} className="acoes">
              <SubmitButton className="btn btn-sec">Retomar envios agora</SubmitButton>
            </form>
          </div>
        )}

        {roboParado && (
          <div className="aviso">
            O robô do WhatsApp parece desligado. Abra <strong>outro Terminal</strong>, entre na pasta do projeto e rode:
            <pre className="codigo">cd tia-fifi{"\n"}npm run whatsapp</pre>
            Deixe esse Terminal aberto. (No servidor, o PM2 cuida disso sozinho.)
          </div>
        )}

        {!roboParado && qr && (
          <div className="qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code para conectar o WhatsApp" width={280} height={280} />
            <ol className="passos">
              <li>No celular do número que vai postar, abra o WhatsApp.</li>
              <li>
                Toque em <strong>⋮ (ou Configurações) → Dispositivos conectados → Conectar dispositivo</strong>.
              </li>
              <li>Aponte a câmera para este QR code. Ele muda a cada ~20s; a página atualiza sozinha.</li>
            </ol>
          </div>
        )}

        {!roboParado && sessao?.status === "conectado" && (
          <div className="acoes">
            <form action={comando}>
              <input type="hidden" name="cmd" value="sincronizar" />
              <SubmitButton className="btn btn-sec">↻ Atualizar lista de grupos</SubmitButton>
            </form>
            {!pausado && (
              <form action={pausar}>
                <SubmitButton className="btn btn-sec">⏸️ Pausar envios</SubmitButton>
              </form>
            )}
            <form action={comando}>
              <input type="hidden" name="cmd" value="sair" />
              <button className="btn btn-perigo" type="submit">
                Desconectar número
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="card">
        <h2>👥 Grupos em que você é admin ({admins.length})</h2>
        <p className="muted small">
          Marque <strong>Receber ofertas</strong> nos grupos de destino. Tags: o grupo só recebe ofertas com essas tags (sem nenhuma tag = recebe tudo).
          {outros > 0 ? ` ${outros} grupo(s) em que você não é admin não aparecem.` : ""}
        </p>
        {admins.length === 0 && <p className="muted">Nenhum grupo ainda. Conecte o número e toque em “Atualizar lista de grupos”.</p>}
        <div className="grupos">
          {admins.map((g) => {
            const tagsGrupo = JSON.parse(g.tags) as string[];
            return (
              <form key={g.jid} action={salvarGrupo} className="grupo">
                <input type="hidden" name="jid" value={g.jid} />
                <div className="grupo-topo">
                  <strong>{g.name}</strong>
                  <span className="muted small">
                    {g.participants} membros{g.lastSentAt ? ` · último envio ${formatDate(g.lastSentAt)}` : ""}
                  </span>
                </div>
                <label className="check">
                  <input type="checkbox" name="enabled" defaultChecked={g.enabled} /> Receber ofertas
                </label>
                <div className="tags-check">
                  {tags.map((t) => (
                    <label key={t.id} className="check small">
                      <input type="checkbox" name="tags" value={t.slug} defaultChecked={tagsGrupo.includes(t.slug)} /> {t.name}
                    </label>
                  ))}
                </div>
                <SubmitButton className="btn btn-sec">Salvar</SubmitButton>
              </form>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>📤 Fila de envio ({pendentes.length})</h2>
        {pendentes.length === 0 ? (
          <p className="muted">Nada na fila.</p>
        ) : (
          <>
            <table className="tabela">
              <tbody>
                {pendentes.map((j) => (
                  <tr key={j.id}>
                    <td>
                      {produtos.get(j.productId) ?? "oferta"}
                      <br />
                      <span className="muted small">→ {nomes.get(j.groupJid) ?? j.groupJid}</span>
                    </td>
                    <td className="num small">{formatDate(j.scheduledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form action={cancelarFila} className="acoes">
              <button className="btn btn-perigo" type="submit">
                Cancelar todos os pendentes
              </button>
            </form>
          </>
        )}
      </section>

      <section className="card">
        <h2>🧾 Últimos envios</h2>
        {recentes.length === 0 ? (
          <p className="muted">Nenhum envio ainda.</p>
        ) : (
          <table className="tabela">
            <tbody>
              {recentes.map((j) => (
                <tr key={j.id}>
                  <td>
                    {j.status === "enviado" ? "✅" : j.status === "erro" ? "❌" : "⏹️"} {produtos.get(j.productId) ?? "oferta"}
                    <br />
                    <span className="muted small">
                      → {nomes.get(j.groupJid) ?? j.groupJid}
                      {j.error ? ` · ${j.error}` : ""}
                    </span>
                  </td>
                  <td className="num small">{formatDate(j.sentAt ?? j.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {log.length > 0 && (
        <details className="card">
          <summary>Registro do robô</summary>
          <pre className="codigo">{log.join("\n")}</pre>
        </details>
      )}
    </>
  );
}
