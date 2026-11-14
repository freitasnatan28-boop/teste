import { CopyButton } from "@/components/CopyButton";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import {
  dataBR,
  hojeBR,
  ideiasDisponiveis,
  JOGOS_GTA,
  meusTemas,
  proximoNumero,
  relatorioDoDia,
  SITUACOES,
  temasParaMarkdown,
  type TemaSA,
} from "@/lib/story-akte";
import { lerTemas } from "@/lib/story-akte-dados";
import { adicionarTema, atualizarTema, removerTema } from "./actions";
import { ConferirRoteiro } from "./ConferirRoteiro";

export const dynamic = "force-dynamic";

const DESCRICAO_CANAL = `Die ganze Story. Kompakt erzählt.

Auf Story Akte bekommst du die komplette Geschichte der größten Videospiele – verständlich, spannend und ohne stundenlanges Durchspielen. Wir starten mit der Grand-Theft-Auto-Reihe: Vice City, San Andreas, GTA IV, GTA V und natürlich GTA VI.

Jede Woche neue Story-Zusammenfassungen, Hintergründe und Erklärungen.

Abonnieren und die Glocke aktivieren, damit du keine Akte verpasst.

Hinweis: Story Akte ist ein unabhängiger Fan-Kanal und steht in keiner Verbindung zu Rockstar Games oder Take-Two Interactive. Alle Marken gehören ihren jeweiligen Inhabern. Gameplay-Aufnahmen stammen aus Creative-Commons-Videos (Quellen in jeder Videobeschreibung).`;

const PALAVRAS_CHAVE =
  "GTA Story, GTA Geschichte, GTA Zusammenfassung, GTA deutsch, GTA 6, GTA VI, GTA Vice City, GTA San Andreas, GTA 5 Story, GTA 4 Story, Videospiel Story, Story erklärt, Gaming deutsch, Rockstar Games, Lore";

const REGRAS = [
  "Tudo em alemão correto (roteiro, título, descrição, tags, capas). Números SEMPRE por extenso no roteiro.",
  "Vídeo de 10 a 14 min (mínimo 8, para caber anúncio no meio). Narração própria: nunca cutscene longa sem narração por cima.",
  "Só gameplay de YouTube com licença Creative Commons BY, conferida vídeo a vídeo, e creditada na descrição e no comentário fixado.",
  "Nada de logo, fonte ou arte oficial da Rockstar/GTA nas capas. A descrição traz o aviso de canal de fã.",
  "História +18 contada sem violência/drogas gráficas e sem palavrão. Fatos certos: na dúvida, pesquise ou deixe genérico.",
  "Nunca escrever tokens ou chaves (Kaggle etc.) em arquivos do vídeo ou mensagens. Cada um usa a própria conta.",
  "Render com 3 threads; a narração roda só no Kaggle, nunca no PC.",
  "Nada é publicado automaticamente: o vídeo é entregue em PRONTOS/ e você mesmo sobe no YouTube.",
];

function passos(proj: string, numero: string) {
  const slug = `${numero.replace("SA_", "").toLowerCase()}_slug`;
  return [
    { titulo: "Achar gameplay CC BY (filtro de licença)", cmd: `yt-dlp --flat-playlist --playlist-end 15 --print "%(id)s|%(duration)s|%(title)s" "https://www.youtube.com/results?search_query=<busca>&sp=EgIwAQ%253D%253D"` },
    { titulo: "Salvar a lista do canal", cmd: `yt-dlp --flat-playlist --print "%(id)s|%(duration)s|%(title)s" "<url do canal>/videos" > acervo/lista_<jogo>.txt` },
    { titulo: "Baixar (confere a licença de cada vídeo)", cmd: `bash ferramentas/baixa_lista.sh acervo/lista_<jogo>.txt <jogo>` },
    { titulo: "Gravar os créditos", cmd: `python ferramentas/creditos_lista.py <jogo>` },
    { titulo: "Preparar a narração", cmd: `python kaggle/prepara_de.py videos/${slug}/roteiro.md:${proj}` },
    { titulo: "Subir o texto para o Kaggle (em kaggle/narr_in; 1ª vez: datasets create -p .)", cmd: `kaggle datasets version -p . -m ${proj}` },
    { titulo: "Rodar a voz na GPU (em kaggle/narr)", cmd: `kaggle kernels push -p .` },
    { titulo: "Acompanhar (6 a 10 min)", cmd: `kaggle kernels status <usuario>/story-akte-narr` },
    { titulo: "Baixar os áudios (limpe kaggle/out antes)", cmd: `kaggle kernels output <usuario>/story-akte-narr -p kaggle/out --force` },
    { titulo: "Produzir e entregar em PRONTOS/", cmd: `bash ferramentas/produz_sa.sh ${slug} ${proj} <jogo> lista_<jogo>.txt "${numero} - Nome" "${numero}_nome.mp4"` },
    { titulo: "Capas A, B e C", cmd: `python ferramentas/capa_sa.py <video bruto.mp4> <segundo> videos/${slug}/_capa_A.jpg "LINHA 1" "linha 2 rosa" <zoom> <cx> <cy>` },
  ];
}

function CartaoTema({ t }: { t: TemaSA }) {
  const badge = t.situacao === "pronto" ? "badge-ok" : t.situacao === "em_producao" ? "badge-alerta" : t.situacao === "planejado" ? "badge-tag" : "badge-pendente";
  return (
    <div className="grupo">
      <div className="grupo-topo">
        <strong>
          {t.numero} · {t.tema}
        </strong>
        {t.tituloDE && <span className="small">„{t.tituloDE}“</span>}
        <div className="badges">
          <span className={`badge ${badge}`}>{SITUACOES[t.situacao]}</span>
          <span className="badge">{t.jogo}</span>
          <span className="badge">{t.dono}</span>
          {t.duracao && <span className="badge">{t.duracao}</span>}
          <span className="badge badge-pendente">{dataBR(t.prontoEm ?? t.criadoEm)}</span>
        </div>
        {t.pasta && <span className="small muted">PRONTOS/{t.pasta}</span>}
      </div>
      <details>
        <summary>Editar</summary>
        <form action={atualizarTema} className="grid-form mt">
          <input type="hidden" name="numero" value={t.numero} />
          <label>
            Situação
            <select name="situacao" defaultValue={t.situacao}>
              {Object.entries(SITUACOES).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Duração
            <input name="duracao" defaultValue={t.duracao} placeholder="12:30" />
          </label>
          <label className="col-2">
            Título em alemão
            <input name="tituloDE" defaultValue={t.tituloDE} lang="de" />
          </label>
          <label className="col-2">
            Pasta em PRONTOS/
            <input name="pasta" defaultValue={t.pasta} placeholder={`${t.numero} - Nome`} />
          </label>
          <div className="acoes col-2">
            <SubmitButton>Salvar</SubmitButton>
            <button className="btn btn-perigo" formAction={removerTema} type="submit">
              Remover
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

export default async function StoryAktePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const temas = await lerTemas();
  const hoje = hojeBR();
  const meus = temas.filter((t) => t.dono === "Amigo");
  const doFelipe = temas.filter((t) => t.dono === "Felipe");
  const ideias = ideiasDisponiveis(temas);
  const proximo = proximoNumero(temas, "Amigo");
  const proj = proximo.replace("SA_", "").toLowerCase();
  const relatorio = relatorioDoDia(temas, hoje);
  const markdown = temasParaMarkdown(temas, hoje);
  const lista = meusTemas(temas);

  return (
    <>
      <p className="sobretitulo">Canal de YouTube · GTA em alemão</p>
      <h1 className="titulo-pagina">Story Akte</h1>
      <Flash msg={sp.msg} erro={sp.erro} />

      <section className="card">
        <p style={{ marginTop: 0 }}>
          Controle do canal que você faz com o Felipe: quem pega cada tema, o relatório do dia, a conferência do roteiro e o passo a passo do kit. Os vídeos continuam
          sendo produzidos no seu PC com o <strong>StoryAkte_Kit</strong>; aqui fica o que precisa ser combinado.
        </p>
        <div className="badges">
          <span className="badge badge-ok">{meus.filter((t) => t.situacao === "pronto").length} pronto(s) seus</span>
          <span className="badge badge-alerta">{meus.filter((t) => t.situacao === "em_producao").length} em produção</span>
          <span className="badge badge-tag">{meus.filter((t) => t.situacao === "planejado").length} na fila</span>
          <span className="badge">{doFelipe.length} do Felipe</span>
          <span className="badge">Próximo número: {proximo}</span>
        </div>
      </section>

      <section className="card" id="temas">
        <h2>🗂️ Temas (não repetir)</h2>
        <p className="small muted">Seus vídeos são numerados SA_A01, SA_A02… O painel avisa quando um tema novo parece com um que já existe.</p>

        <h3 className="mt">Seus temas</h3>
        {meus.length ? (
          <div className="grupos">
            {meus.map((t) => (
              <CartaoTema key={t.numero} t={t} />
            ))}
          </div>
        ) : (
          <p className="muted">Nenhum ainda. Pegue uma ideia livre abaixo ou cadastre um tema.</p>
        )}

        <details className="mt">
          <summary>Temas do Felipe ({doFelipe.length})</summary>
          <div className="grupos">
            {doFelipe.map((t) => (
              <CartaoTema key={t.numero} t={t} />
            ))}
          </div>
        </details>

        {ideias.length > 0 && (
          <>
            <h3 className="mt">💡 Ideias livres</h3>
            <div className="grupos">
              {ideias.map((i) => (
                <form key={i.tema} action={adicionarTema} className="grupo">
                  <input type="hidden" name="tema" value={i.tema} />
                  <input type="hidden" name="jogo" value={i.jogo} />
                  <input type="hidden" name="dono" value="Amigo" />
                  <input type="hidden" name="situacao" value="planejado" />
                  <strong>{i.tema}</strong>
                  <span className="small muted">
                    {i.jogo}
                    {i.obs ? ` · ${i.obs}` : ""}
                  </span>
                  <SubmitButton className="btn btn-sec">Pegar como {proximo}</SubmitButton>
                </form>
              ))}
            </div>
          </>
        )}

        <h3 className="mt">➕ Cadastrar tema</h3>
        <form action={adicionarTema} className="grid-form">
          <label className="col-2">
            Tema
            <input name="tema" required placeholder="Ex.: GTA Liberty City Stories — história completa" />
          </label>
          <label>
            Jogo
            <input name="jogo" list="jogos-gta" placeholder="GTA Liberty City Stories" />
            <datalist id="jogos-gta">
              {JOGOS_GTA.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
          </label>
          <label>
            Quem faz
            <select name="dono" defaultValue="Amigo">
              <option value="Amigo">Eu (SA_A…)</option>
              <option value="Felipe">Felipe (SA_…)</option>
            </select>
          </label>
          <label>
            Situação
            <select name="situacao" defaultValue="planejado">
              {Object.entries(SITUACOES).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" name="forcar" /> Salvar mesmo se parecer repetido
          </label>
          <SubmitButton className="btn col-2">Salvar tema</SubmitButton>
        </form>

        <details className="mt">
          <summary>TEMAS_FEITOS.md atualizado (para colar no kit)</summary>
          <pre className="codigo">{markdown}</pre>
          <CopyButton texto={markdown} rotulo="Copiar TEMAS_FEITOS.md" />
        </details>
      </section>

      <section className="card" id="relatorio">
        <h2>📋 Relatório do dia</h2>
        <p className="small muted">
          Salve como <code>RELATORIOS/{hoje}.md</code> no kit e mande para o Felipe. Ele junta o que ficou pronto hoje, o que está em produção e o que vem a seguir.
        </p>
        <pre className="codigo">{relatorio}</pre>
        <div className="acoes">
          <CopyButton texto={relatorio} rotulo="Copiar relatório" />
          <CopyButton texto={lista} rotulo="Copiar “quais temas eu fiz?”" />
        </div>
      </section>

      <section className="card" id="roteiro">
        <h2>📝 Conferir roteiro</h2>
        <p className="small muted">
          Lê o roteiro do mesmo jeito que o <code>prepara_de.py</code>: cada parágrafo é um bloco e linhas começando com <code>[</code> ou <code>#</code> não são narradas. Meta:
          22 a 28 blocos e 1.400 a 1.800 palavras.
        </p>
        <ConferirRoteiro />
      </section>

      <section className="card" id="passos">
        <h2>🎬 Passo a passo do vídeo {proximo}</h2>
        <p className="small muted">
          Rode na pasta do kit (Git Bash no Windows). Projeto da narração: <code>{proj}</code>. Troque <code>&lt;jogo&gt;</code>, <code>&lt;usuario&gt;</code> e o slug da pasta
          em <code>videos/</code>.
        </p>
        <ol className="passos">
          {passos(proj, proximo).map((p) => (
            <li key={p.titulo}>
              <strong>{p.titulo}</strong>
              <pre className="codigo">{p.cmd}</pre>
            </li>
          ))}
        </ol>
        <div className="aviso">
          Conferência obrigatória: abra <code>confere_narracao.txt</code> e procure frase faltando ou palavra trocada; olhe uma grade de 20 quadros do vídeo final (sem
          texto grande de outro idioma, tela preta ou carregamento) e as 3 capas antes de entregar. Se o yt-dlp disser “not a bot”, pare e espere algumas horas.
        </div>
      </section>

      <section className="card" id="regras">
        <h2>📏 Regras do canal</h2>
        <ol className="passos">
          {REGRAS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
        <p className="small muted">
          YouTube (já configurado pelo Felipe, não mudar): país Alemanha · idioma do vídeo e da legenda “Alemão (Alemanha)” · categoria Jogos · não é para crianças · anúncios
          mid-roll automáticos.
        </p>
      </section>

      <section className="card" id="canal">
        <h2>🪪 Dados do canal</h2>
        <ul className="dados">
          <li>
            <strong>Nome:</strong> Story Akte · <strong>@</strong>StoryAkte (alternativas: @StoryAkteDE, @DieStoryAkte)
          </li>
          <li>
            <strong>País e idioma:</strong> Alemanha · Alemão
          </li>
        </ul>
        <details className="mt">
          <summary>Descrição do canal</summary>
          <pre className="codigo" lang="de">
            {DESCRICAO_CANAL}
          </pre>
          <CopyButton texto={DESCRICAO_CANAL} rotulo="Copiar descrição" />
        </details>
        <details className="mt">
          <summary>Palavras-chave do canal</summary>
          <pre className="codigo">{PALAVRAS_CHAVE}</pre>
          <CopyButton texto={PALAVRAS_CHAVE} rotulo="Copiar palavras-chave" />
        </details>
        <details className="mt">
          <summary>Instalação do kit no PC (uma vez só)</summary>
          <ol className="passos">
            <li>
              No PowerShell: <code>winget install Python.Python.3.12</code>, <code>winget install Gyan.FFmpeg</code>, <code>winget install DenoLand.Deno</code>,{" "}
              <code>winget install Git.Git</code>.
            </li>
            <li>
              Na pasta do kit: <code>python -m pip install -r requirements.txt</code>.
            </li>
            <li>
              Conta no Kaggle com celular confirmado; <em>Settings → API → Create New Token</em>; coloque o <code>kaggle.json</code> em{" "}
              <code>C:\Users\&lt;você&gt;\.kaggle\</code>.
            </li>
            <li>
              Ponha seu usuário do Kaggle no <code>config.json</code> e rode <code>python kaggle/configura_kaggle.py</code>.
            </li>
            <li>
              Teste: <code>ffmpeg -version</code>, <code>yt-dlp --version</code>, <code>deno --version</code>, <code>kaggle --version</code>.
            </li>
          </ol>
        </details>
      </section>
    </>
  );
}
