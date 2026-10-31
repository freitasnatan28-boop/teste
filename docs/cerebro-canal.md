# Cérebro do Canal Automático

Memória do projeto do canal de vídeos automatizado. Leia isto antes de trabalhar no canal,
em vez de reler conversas antigas. **Atualize este arquivo sempre que uma decisão mudar.**

## Ideia

Canal no YouTube 100% automatizado, organizado como uma "empresa com setores":

1. **Pesquisa**: escolhe o tema e levanta fatos na web.
2. **Roteiro**: escreve o roteiro por capítulos, com gancho nos primeiros 30 s, mais título e descrição.
3. **Narração**: transforma o roteiro em áudio (TTS).
4. **Edição**: corte a cada ~3 s (mapas animados, fotos com punch-in, textos de impacto), destaques de palavras,
   trilha, efeitos sonoros, cartelas de capítulo. Feito em Remotion (React) em `canal/estudio`.
5. **Thumbnail**: modelo automático (foto + texto grande).
6. **Publicação**: sobe no YouTube com capítulos e links na descrição.
7. **Análise**: CTR da thumbnail, tempo médio assistido, retenção por minuto, views.
8. **Estratégia**: pega os melhores vídeos e gera pautas novas com o mesmo *formato* (não clones).

Extra: cortar cerca de 3 Shorts de cada vídeo longo pra puxar público.

## Decisões tomadas

- **Formato:** vídeos LONGOS (não Shorts), base de **8 a 12 min**.
- **Revisão humana:** o robô deixa tudo pronto e o dono aprova com 1 clique antes de publicar (protege contra a regra de "conteúdo inautêntico").
- **Proxy dos EUA:** NÃO usar. Não muda o ganho (o que conta é onde o público está) e arrisca a conta e o AdSense.
- **Nicho:** geopolítica e história explicada (evergreen). Notícia só como gancho, nunca notícia pura
  (anúncio limitado em guerra atual, YouTube prioriza fontes oficiais, risco de erro).
  Ângulos: (1) "por que o país X é assim?", (3) "a guerra explicada em 10 min" como base; (2) "países e lugares
  que ninguém conhece" pra viralizar. Contar guerras de forma analítica, sem imagens violentas.
- **Idioma:** português (PT-BR).
- **Visual:** mapas animados gerados em código + imagens do Wikimedia Commons (com crédito) + Pexels só pra ambiente.
- **Fatos:** todo roteiro passa pelo setor de Pesquisa e lista as fontes na descrição.
- **Nome:** **Por Trás do Mapa**. Arquivos em `canal/identidade/` (foto de perfil 800x800, banner 2560x1440).
- **Voz:** ElevenLabs "Nassif - Documentary, History & Thriller" (`acdKA5HckGxoxxvy40dA`), `eleven_multilingual_v2`,
  stability 0.45, similarity 0.8, style 0.2, seed 1963. Nomes estrangeiros têm grafia fonética em `scripts/roteiro.ts`.
- **Estilo de edição:** referência pedida pelo dono: https://www.youtube.com/watch?v=SAbgY8uPMa0 (canal Top Militar LHB,
  mesmo tema). O nosso é mais rápido: corte a cada ~3 s, texto amarelo com contorno preto, mapas animados, granulado.
- **Código do canal:** neste repositório, em `canal/` (separado do painel da Tia Fifi).

## Roteiros

- `canal/roteiros/001-guerra-da-lagosta.md`: primeiro vídeo (9,4 min). Status: roteiro aprovado, narração pronta,
  edição montada. Thumbnail em `canal/videos/001-guerra-da-lagosta/thumbnail.png`.
  Formato do arquivo serve de modelo pros próximos: títulos A/B, thumbnail, descrição com capítulos e fontes,
  roteiro em blocos com **[VISUAL]** + narração.

## Decisões pendentes

- [ ] E-mail e @ do canal (sugestões: portrasdomapa@gmail.com, @portrasdomapa). O dono cria a conta.

## Como produzir um vídeo (estúdio em `canal/estudio`)

Pasta do vídeo: `canal/videos/NNN-slug/` com `imagens.json`, `storyboard.json`, `narracao/`, `imagens/`, `timeline.json`.

```
npm run narrar -- ../roteiros/NNN-slug.md ../videos/NNN-slug   # voz (não regera o que já existe)
npm run imagens -- ../videos/NNN-slug                           # baixa do Commons + creditos.md
npm run montar -- NNN-slug                                      # storyboard + narração = timeline.json
npm run render -- video NNN-slug [de] [ate]                     # MP4 em out/ (trecho opcional, em frames)
npm run render -- imagens                                       # avatar, banner, thumbs
npm run sons                                                    # efeitos e trilha (uma vez só)
```

- Na nuvem do Claude, rodar com `NODE_USE_ENV_PROXY=1` (o fetch do Node só usa o proxy assim).
- Storyboard: cada beat (= cada **[VISUAL]** do roteiro) tem `cenas` com `em` (palavra que dispara o corte),
  `destaques` (palavras que pulam na tela) e `apoio` (fotos que entram quando um gráfico passa do tempo).
- Render: ~5 quadros/s numa máquina de 4 núcleos (vídeo de 9 min leva ~1 h). Não usar `gl: "swangle"` (4x mais lento).
- Wikimedia Commons às vezes devolve 429 por muito tempo (IP compartilhado). O script tenta de novo e o
  `montar` troca fotos faltantes por outras do beat.

## Fatos e números (conferidos em out/2026, são estimativas)

- **Monetização (YPP):** 1.000 inscritos + 4.000 horas assistidas em vídeos longos públicos em 12 meses.
- **Divisão:** vídeo longo paga 55% ao criador; Shorts paga 45%.
- **Anúncios no meio do vídeo:** a partir de 8 min.
- **RPM vídeo longo:** mediana medida perto de US$ 2,30 por mil views. Público BR fica em torno de R$ 5 a R$ 30, conforme o nicho.
- **RPM Shorts BR:** R$ 0,10 a R$ 1,50 por mil views.
- **Imposto EUA:** views de americanos têm 30% de retenção (Brasil não tem tratado). Preencher o formulário fiscal no AdSense.
- **API do YouTube:** projeto novo só posta como PRIVADO até passar na auditoria. Cota de cerca de 6 uploads por dia.
- **OAuth Google em modo "Teste":** o token expira em 7 dias. Publicar o app como "Em produção".

## Conexões

| Serviço | Status | Variável no .env |
|---|---|---|
| ElevenLabs | ✅ conectado (Starter, 40 mil créditos/mês; o vídeo 001 + efeitos + trilha gastaram ~3 mil) | `ELEVENLABS_API_KEY` |
| Descript | ✅ conectado nas sessões do Claude | — |
| TinyFish (web) | ✅ conectado nas sessões do Claude | — |
| Anthropic | já existe no projeto da Tia Fifi | `ANTHROPIC_API_KEY` |
| Pexels | ❌ falta criar a chave (grátis) | `PEXELS_API_KEY` |
| YouTube (Google Cloud) | ❌ falta: projeto, YouTube Data API v3, YouTube Analytics API, cliente OAuth Web | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` |
| VPS com HTTPS + FFmpeg | ❌ falta (mínimo 4 GB de RAM pra render) | — |

Redirect do YouTube: `{APP_URL}/api/youtube/oauth/callback`.

## Próximos passos

1. Terminar o download das fotos do vídeo 001 e renderizar a versão final.
2. O dono cria o canal (e-mail, @, foto, banner) e as chaves do Google Cloud; pede a auditoria da API do YouTube.
3. Claude monta a tela "Conectar YouTube" + o status das conexões, e o setor de Publicação.
4. Automatizar Roteiro → storyboard com a API do Claude (hoje o storyboard do 001 foi escrito à mão).
5. Depois de 10 a 20 vídeos publicados, ligar os setores 7 e 8 (análise e estratégia).
