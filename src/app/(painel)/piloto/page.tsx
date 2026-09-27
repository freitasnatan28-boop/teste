import Link from "next/link";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { lerPersona } from "@/lib/persona";
import { horariosDoDia, lerPiloto } from "@/lib/piloto-config";
import { iaDisponivel } from "@/services/mensagens";
import { aprovar, descartar, rodarAgora, salvarConfigPiloto, salvarPersonagem } from "./actions";

export const dynamic = "force-dynamic";

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function PilotoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [cfg, persona, aguardando, gruposAtivos, sessao] = await Promise.all([
    lerPiloto(),
    lerPersona(),
    prisma.offerMessage.findMany({ where: { status: "aguardando_aprovacao" }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.whatsAppGroup.count({ where: { enabled: true, isAdmin: true } }),
    prisma.whatsAppSession.findUnique({ where: { id: "principal" } }),
  ]);
  const produtos = new Map(
    (await prisma.product.findMany({ where: { id: { in: aguardando.map((m) => m.productId) } } })).map((p) => [p.id, p]),
  );
  const horarios = horariosDoDia(cfg);
  const ia = iaDisponivel();

  return (
    <>
      <h1 className="titulo-pagina">Piloto automático</h1>
      <Flash msg={sp.msg} erro={sp.erro} />

      <section className="card">
        <h2>✅ Checklist</h2>
        <ul className="dados">
          <li>{sessao?.status === "conectado" ? "✅" : "❌"} WhatsApp conectado {sessao?.status !== "conectado" && <Link href="/whatsapp">→ conectar</Link>}</li>
          <li>{gruposAtivos > 0 ? "✅" : "❌"} {gruposAtivos} grupo(s) marcado(s) para receber {gruposAtivos === 0 && <Link href="/whatsapp">→ marcar grupos</Link>}</li>
          <li>
            {ia ? "✅ Mensagens escritas pela IA (Claude)" : "⚪ IA desligada — usando frases prontas da Tia (coloque ANTHROPIC_API_KEY no .env para ligar)"}
          </li>
          <li>{cfg.ativo ? "✅ Piloto ligado" : "⚪ Piloto desligado"}</li>
        </ul>
        <form action={rodarAgora} className="acoes">
          <SubmitButton className="btn" pendente="Procurando a melhor oferta… (até 1 min)">
            ▶️ Rodar uma rodada agora
          </SubmitButton>
        </form>
        <p className="muted small">
          Uma rodada: busca ofertas com a próxima palavra-chave, escolhe a de melhor score que ainda não foi enviada, confere o preço de novo, escreve a mensagem e põe na
          fila dos grupos {cfg.aprovacao ? "(esperando sua aprovação)" : ""}.
        </p>
      </section>

      {aguardando.length > 0 && (
        <section className="card">
          <h2>📝 Aguardando sua aprovação ({aguardando.length})</h2>
          {aguardando.map((m) => {
            const p = produtos.get(m.productId);
            return (
              <form key={m.id} action={aprovar} className="aprovacao">
                <input type="hidden" name="id" value={m.id} />
                <p className="small muted">
                  {p?.title} · {p ? formatBRL(p.price) : ""}
                </p>
                <textarea name="texto" defaultValue={m.text} rows={8} aria-label="Texto da mensagem" />
                <div className="acoes">
                  <SubmitButton pendente="Enviando para a fila…">Aprovar e enviar</SubmitButton>
                  <button className="btn btn-perigo" formAction={descartar} type="submit">
                    Descartar
                  </button>
                </div>
              </form>
            );
          })}
        </section>
      )}

      <section className="card">
        <h2>⚙️ Configuração</h2>
        <form action={salvarConfigPiloto} className="grid-form">
          <label className="check col-2">
            <input type="checkbox" name="ativo" defaultChecked={cfg.ativo} /> <strong>Ligar piloto automático</strong>
          </label>
          <label className="col-2">
            Palavras-chave que a Tia procura (uma por linha)
            <textarea name="termos" rows={5} defaultValue={cfg.termos.join("\n")} />
          </label>
          <label>
            Ofertas por dia
            <input name="ofertasPorDia" inputMode="numeric" defaultValue={cfg.ofertasPorDia} />
          </label>
          <label className="check">
            <input type="checkbox" name="aprovacao" defaultChecked={cfg.aprovacao} /> Quero aprovar cada mensagem antes
          </label>
          <label>
            Começa às
            <input name="inicio" type="time" defaultValue={cfg.inicio} />
          </label>
          <label>
            Termina às
            <input name="fim" type="time" defaultValue={cfg.fim} />
          </label>
          <label>
            Score mínimo (0–100)
            <input name="scoreMinimo" inputMode="numeric" defaultValue={cfg.scoreMinimo} />
          </label>
          <label>
            Desconto real mínimo (%)
            <input name="descontoMinimo" inputMode="numeric" defaultValue={cfg.descontoMinimo} />
          </label>
          <label>
            Não repetir o mesmo produto por (dias)
            <input name="naoRepetirDias" inputMode="numeric" defaultValue={cfg.naoRepetirDias} />
          </label>
          <p className="col-2 muted small">
            Horários de hoje (Brasília): {horarios.length ? horarios.map(hhmm).join(" · ") : "nenhum"}
          </p>
          <details className="col-2">
            <summary>🛡️ Anti-banimento (avançado)</summary>
            <div className="grid-form mt">
              <label>
                Máx. de mensagens por hora
                <input name="limitePorHora" inputMode="numeric" defaultValue={cfg.limitePorHora} />
              </label>
              <span />
              <label>
                Intervalo mínimo entre grupos (s)
                <input name="intervaloMin" inputMode="numeric" defaultValue={cfg.intervaloMin} />
              </label>
              <label>
                Intervalo máximo entre grupos (s)
                <input name="intervaloMax" inputMode="numeric" defaultValue={cfg.intervaloMax} />
              </label>
            </div>
          </details>
          <SubmitButton className="btn col-2">Salvar configuração</SubmitButton>
        </form>
      </section>

      <section className="card" id="personagem">
        <h2>💅 Personagem</h2>
        <form action={salvarPersonagem} className="grid-form">
          <label>
            Nome
            <input name="name" defaultValue={persona.name} required />
          </label>
          <label>
            Emojis (separados por espaço)
            <input name="emojis" defaultValue={persona.emojis.join(" ")} />
          </label>
          <label className="col-2">
            Personalidade
            <textarea name="personality" rows={4} defaultValue={persona.personality} required />
          </label>
          <label className="col-2">
            Bordões (um por linha — use R$X onde entra o preço)
            <textarea name="catchphrases" rows={4} defaultValue={persona.catchphrases.join("\n")} />
          </label>
          <label className="col-2">
            Palavras proibidas (uma por linha)
            <textarea name="forbidden" rows={3} defaultValue={persona.forbidden.join("\n")} />
          </label>
          <SubmitButton className="btn btn-sec col-2">Salvar personagem</SubmitButton>
        </form>
      </section>
    </>
  );
}
