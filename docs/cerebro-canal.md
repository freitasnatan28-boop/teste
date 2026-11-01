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
- **Público e idioma (MUDOU em out/2026):** canal dark (sem rosto) **para o público dos EUA, em inglês (EN-US)**.
  Motivo: o anúncio paga bem mais por view americano. Sem proxy/VPN: o que conta é onde o público está, e vídeo
  em inglês já chega nele. O país do canal e o AdSense continuam no Brasil, com os dados reais do dono.
  Views dos EUA têm 30% de imposto retido (Brasil sem tratado). O inglês é o mercado mais visado pela regra de
  "conteúdo inautêntico", então a revisão humana, a pesquisa de verdade e o formato variado ficam obrigatórios.
  O vídeo 001 em PT-BR fica como teste do motor de edição.
- **Visual:** mapas animados gerados em código + imagens do Wikimedia Commons (com crédito) + Pexels só pra ambiente.
- **Fatos:** todo roteiro passa pelo setor de Pesquisa e lista as fontes na descrição.
- **Nome:** **Por Trás do Mapa** (versão PT). Em inglês: **Behind the Map** (@ a confirmar pelo dono). Logo 800x800 e
  banner 2560x1440 e marca d'água 150x150 (PNG transparente) em `canal/identidade/en/` (`Avatar-EN`/`Banner-EN`/`MarcaDagua-EN` no Remotion; slogan "Money, power & borders — explained with maps").
- **Ritmo de trabalho (pedido do dono):** uma etapa por vez, entregar e esperar o ok antes da próxima, pra não gastar à toa
  (créditos da ElevenLabs e tempo de render). Não adiantar roteiro/voz/render sem ele pedir. Arquivos em `canal/identidade/` (foto de perfil 800x800, banner 2560x1440).
- **Voz:** ElevenLabs "Nassif - Documentary, History & Thriller" (`acdKA5HckGxoxxvy40dA`), `eleven_multilingual_v2`,
  stability 0.45, similarity 0.8, style 0.2, seed 1963. Nomes estrangeiros têm grafia fonética em `scripts/roteiro.ts`.
- **Estilo de edição (ATUAL): "modelo de mapa"**, igual ao vídeo de referência que o dono mandou (Reel estilo GeoAnalyst
  sobre Guantánamo): satélite (NASA Blue Marble), câmera que passeia sem parar, países pintados com a bandeira,
  balões de fala digitados, retratos redondos com faixa de nome, ícones em hexágono, foto em moldura sobre o mapa,
  ano grande no topo, flash de luz rosado na troca de capítulo.
- **Legenda (MUDOU em nov/2026, pedido do dono com vídeo de referência "Fifty Million Problems"):** COM legenda,
  2 a 4 palavras por vez, fonte Inter 800, embaixo no centro; a palavra acende (cinza → branco) quando é falada;
  números e palavras-chave (`chaves` no storyboard) ficam **amarelos** com um pulinho. `legenda: false` desliga.
  Atores do mapa não descem na faixa da legenda (retratos ficam 330 px acima do pé da tela).
  Som igual ao da referência: trilha leve (`trilha-mapa`), pop a cada elemento que entra, digitação nos balões,
  whoosh quando a câmera anda, ding no ano, flash de luz no capítulo. Storyboard com `"estilo": "mapa"`.
  A referência tem narração rápida (~205 palavras/min); a nossa está em ~135. Dá pra acelerar se o dono pedir.
- Estilo antigo ("documentario": fotos em tela cheia, granulado, cortes a cada ~3 s) continua disponível;
  o storyboard desse jeito do vídeo 001 está em `storyboard-documentario.json`.
- **Código do canal:** neste repositório, em `canal/` (separado do painel da Tia Fifi).

## Roteiros

- **002 (EN, aprovado; v2 entregue em nov/2026 com kit de upload: MP4 1080p 123 MB, thumbnail, legenda-en.srt gerada da timeline, texto do YouTube; título escolhido "Why America Offered $100 Million in Gold for Greenland"):** `canal/roteiros/002-buying-greenland.md`, 9,2 min,
  voz David - Documentary (`ppLqTilh7rH7fbUVlXsf`). Storyboard gerado por `videos/002-buying-greenland/storyboard-gerar.py`.
  Títulos "Why America Keeps Trying to Buy Greenland" / B: "America Didn't Conquer Its Land. It Bought It."
  Gancho: Groenlândia (2019, 2025) → Louisiana 1803 (US$ 15 mi), Flórida 1819, México 1848 (US$ 15 mi após a guerra),
  Gadsden 1853 (US$ 10 mi), Alasca 1867 (US$ 7,2 mi), Ilhas Virgens 1917 (US$ 25 mi em ouro), oferta secreta de 1946
  (US$ 100 mi em ouro, revelada em 1991), base de Pituffik, terras raras, gelo do Ártico. Fatos já pesquisados (out/2026).

- `canal/roteiros/001-guerra-da-lagosta.md`: primeiro vídeo (9,4 min). Status: roteiro aprovado, narração pronta,
  edição montada. Thumbnail em `canal/videos/001-guerra-da-lagosta/thumbnail.png`.
  Formato do arquivo serve de modelo pros próximos: títulos A/B, thumbnail, descrição com capítulos e fontes,
  roteiro em blocos com **[VISUAL]** + narração.

## Decisões pendentes

- [ ] Confirmar o @ do Behind the Map (reservas: Map Untold, Hidden Atlas).
- [ ] Canal NOVO pro inglês (recomendado: os 120 inscritos são brasileiros e confundem o algoritmo) ou o antigo.
- [ ] Voz em inglês na ElevenLabs (narrador de documentário americano).
- [ ] Manter o canal em PT em paralelo ou parar.
- [ ] Nicho pros EUA. Recomendação do Claude (out/2026): **geoeconomia com mapas** ("money & power explained"):
  dinheiro e poder entre países (EUA x China, petróleo, chips, terras raras, por que um país é rico ou pobre),
  temas sobre os próprios EUA (estados, fronteiras) e "a guerra explicada" de forma analítica. RPM estimado de
  história/geopolítica nos EUA: US$ 6 a 14 (blogs de terceiros, sem dado oficial). O tema de dinheiro puxa anunciante
  de finanças. Finanças pessoais paga mais, mas é saturado, exige autoridade e não usa o nosso motor de mapas.

- [x] Canal: usar o canal ANTIGO do dono (120 inscritos, poucos vídeos de Minecraft → deixar privados e renomear). Recursos padrão e intermediários ✅ (vídeos > 15 min, miniaturas
  personalizadas). Recursos avançados: **pendente** (precisa verificação por vídeo/documento ou histórico do canal).
- [ ] Ativar recursos avançados (links clicáveis na descrição, limite maior de envios; ajuda no pedido de monetização).

## Como produzir um vídeo (estúdio em `canal/estudio`)

Pasta do vídeo: `canal/videos/NNN-slug/` com `imagens.json`, `storyboard.json`, `narracao/`, `imagens/`, `timeline.json`.

```
npm run narrar -- ../roteiros/NNN-slug.md ../videos/NNN-slug   # voz (não regera o que já existe)
npm run imagens -- ../videos/NNN-slug                           # baixa do Commons + creditos.md
npm run montar -- NNN-slug                                      # storyboard + narração = timeline.json
npm run render -- video NNN-slug [de] [ate]                     # MP4 em out/ (trecho opcional, em frames)
npm run render -- imagens                                       # avatar, banner, thumbs
npm run sons                                                    # efeitos e trilha (uma vez só)
npm run gerar-imagens -- ../videos/NNN-slug                     # imagens por IA das que faltam (imagens-ia.json)
npm run render -- quadros NNN-slug 300,900                      # alguns quadros em PNG para conferir
bash scripts/baixar_nasa.sh B1 B2 C1                            # satélite NASA (cache/, fora do git)
```

- Na nuvem do Claude, rodar com `NODE_USE_ENV_PROXY=1` (o fetch do Node só usa o proxy assim).
- Storyboard: cada beat (= cada **[VISUAL]** do roteiro) tem `cenas` com `em` (palavra que dispara o corte),
  `destaques` (palavras que pulam na tela) e `apoio` (fotos que entram quando um gráfico passa do tempo).
- Render: ~5 quadros/s numa máquina de 4 núcleos (vídeo de 9 min leva ~1 h). Não usar `gl: "swangle"` (4x mais lento).
- Wikimedia Commons bloqueia (429) o IP da nuvem por horas. NÃO tentar contornar (proxy de imagem é bloqueado).
  Alternativa que funciona: Library of Congress (tile.loc.gov), só itens "No known restrictions"/OWI.
  `imagens.json` aceita `{ "url", "credito" }`. Foto faltando vira cartão de texto (nunca repete outra foto).
- Satélite: `montar` chama `scripts/preparar_mapas.py`, que recorta o pedaço de cada cena (mundo 60 px/grau,
  blocos 240 px/grau) em `videos/NNN/mapas/` (fora do git). Projeção equirretangular. Zoom: 1 = mundo inteiro
  na largura; ~2,7 Atlântico Brasil-França; ~14 Nordeste; ~25-35 litoral. Bandeira em país só quando ele aparece inteiro.
- Balões/emojis (feedback do dono: "fora de sincronia"): entram 0,2 s antes da palavra, saem quando o próximo
  entra (fala ~4 s, emoji ~2,5 s), se posicionam sozinhos encostados em quem fala (dx/dy ignorados) e todo balão
  precisa de um "dono" no mapa (retrato, navio, ícone ou bandeira do país no mesmo ponto).
- Áudio (feedback: "aumenta a voz"): narração normalizada em -16 LUFS (`narracao-mix/`, gerada pelo montar;
  a ElevenLabs entrega ~-30) e o render masteriza a mixagem em -14 LUFS. Trilha 0,1; pops ~0,3; teclado 0,3.
- Imagens por IA: o dono autorizou ("se for preciso"). Só pra cenas sem foto livre, estilo ilustração (não
  imita foto de época), nunca pessoas reais, selo "ILUSTRAÇÃO (IA)" na tela e marcar "conteúdo alterado ou
  sintético" no upload do YouTube. Precisa de GEMINI_API_KEY ou OPENAI_API_KEY nos segredos do ambiente
  (ou como Network secret no host api.openai.com: aí rodar com IMAGENS_IA=openai e NODE_USE_ENV_PROXY=1).
  O serviço grátis Pollinations pede pagamento.
- Motor (nov/2026, pedido "bons VFX e SFX" + "emojis saem do nada"): balão/emoji só aparece se o dono está na tela,
  nasce com um anel pulsando no dono, e some quando entra outro balão no mesmo ponto; o `montar` avisa balão sem dono.
  Novos atores: `preco` (etiqueta com contador + sons contagem/caixa), `carimbo` (SECRET etc., som carimbo).
  Países e zonas aparecem se espalhando do centro. `paises[].perto` escolhe a parte do país (ex.: Alasca).
  Bandeira esticada só se o país cabe inteiro na tela; senão vira listras com as cores dela.
  Bandeiras: BRA FRA USA ESP MEX RUS DNK GRL GBR CHN URS. Ícones novos: ouro, petroleo, minerio.
  `idioma: "en"` no storyboard troca marca d'água, "subscribe" e selo de IA. Retratos: recortar no rosto (480x480).
  Library of Congress também limita (429) a busca: esperar 20-60 s entre buscas; tile.loc.gov baixa normal.
- Feedback do vídeo 002 (nov/2026): "fica muito tempo parado", "imagem saindo da proporção", "bandeiras também".
  Correções no motor: (1) mapa com proporção certa: a longitude encolhe pelo cosseno da latitude do centro
  (`fatorX` no Mapa.tsx = `fator_x` no preparar_mapas.py); (2) projeção girada até o centro (Aleutas/Chukotka não
  viram retângulo) e satélite repetido além da linha de data; (3) bandeira nunca estica: cobre e corta as sobras,
  com a proporção oficial (EUA 1,9; Dinamarca 37:28; Reino Unido 2:1); (4) câmera viva: se a cena passa 3,2 s
  sem nada novo, o `montar` cria `pulsos` (aproxima 16% de quem entrou por último, depois abre 10%).
  Cuidado no storyboard: `em` acha a PRIMEIRA ocorrência da palavra no beat ("Every" pegou "every deal"
  e o cartão cobriu 18 s); use duas palavras ("Every time") quando a palavra se repete.
- Feedback do dono sobre a edição (out/2026): NÃO repetir a mesma foto em cortes seguidos (parece bug);
  NÃO tocar o mesmo whoosh em toda transição. Regras atuais no `montar`: foto com movimento contínuo,
  apoio não repete foto em 25 s, som por tipo de cena girando opções, mesmo som só depois de 8 s,
  nenhum som colado em outro (1,2 s), transição varia por tipo (zoom, deslize, escurecer, flash no impacto).

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
| OpenAI (imagens) | ✅ conectada como Network secret em api.openai.com (out/2026). Modelo `gpt-image-2`, ~30 s por imagem, só funciona em streaming (o proxy corta após ~30 s parado) | `IMAGENS_IA=openai` |
| Adobe (Express/Firefly/vídeo) | ✅ conectado nas sessões do Claude (out/2026). Usar como apoio na edição: recorte de fundo de retratos, ajuste de imagens, efeitos, melhorar áudio. O motor principal continua o Remotion. Chamar `adobe_mandatory_init` antes de qualquer ferramenta | — |
| Pexels | ❌ falta criar a chave (grátis) | `PEXELS_API_KEY` |
| YouTube (Google Cloud) | ❌ falta: projeto, YouTube Data API v3, YouTube Analytics API, cliente OAuth Web | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` |
| VPS com HTTPS + FFmpeg | ❌ falta (mínimo 4 GB de RAM pra render) | — |

Redirect do YouTube: `{APP_URL}/api/youtube/oauth/callback`.

## Próximos passos

1. Vídeo 001 (PT) pronto no modelo de mapa (v4: balões sincronizados, áudio em -14 LUFS). Com a mudança pros EUA,
   proposta: refazer o 001 em inglês ("The Lobster War") reaproveitando mapas e storyboard, só trocando textos e voz.
2. O dono cria o canal (e-mail, @, foto, banner) e as chaves do Google Cloud; pede a auditoria da API do YouTube.
3. Claude monta a tela "Conectar YouTube" + o status das conexões, e o setor de Publicação.
4. Automatizar Roteiro → storyboard com a API do Claude (hoje o storyboard do 001 foi escrito à mão).
5. Depois de 10 a 20 vídeos publicados, ligar os setores 7 e 8 (análise e estratégia).
