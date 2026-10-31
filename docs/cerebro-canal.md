# Cérebro do Canal Automático

Memória do projeto do canal de vídeos automatizado. Leia isto antes de trabalhar no canal,
em vez de reler conversas antigas. **Atualize este arquivo sempre que uma decisão mudar.**

## Ideia

Canal no YouTube 100% automatizado, organizado como uma "empresa com setores":

1. **Pesquisa**: escolhe o tema e levanta fatos na web.
2. **Roteiro**: escreve o roteiro por capítulos, com gancho nos primeiros 30 s, mais título e descrição.
3. **Narração**: transforma o roteiro em áudio (TTS).
4. **Edição**: troca de cena a cada 5 a 8 s (vídeos de banco), música, legendas e capítulos. Renderiza com FFmpeg.
5. **Thumbnail**: modelo automático (foto + texto grande).
6. **Publicação**: sobe no YouTube com capítulos e links na descrição.
7. **Análise**: CTR da thumbnail, tempo médio assistido, retenção por minuto, views.
8. **Estratégia**: pega os melhores vídeos e gera pautas novas com o mesmo *formato* (não clones).

Extra: cortar cerca de 3 Shorts de cada vídeo longo pra puxar público.

## Decisões tomadas

- **Formato:** vídeos LONGOS (não Shorts), base de **8 a 12 min**.
- **Revisão humana:** o robô deixa tudo pronto e o dono aprova com 1 clique antes de publicar (protege contra a regra de "conteúdo inautêntico").
- **Proxy dos EUA:** NÃO usar. Não muda o ganho (o que conta é onde o público está) e arrisca a conta e o AdSense.

## Decisões pendentes

- [ ] Nicho. O dono quer guerras, história de países e notícias. Recomendação do Claude:
  **"geopolítica e história explicada"**, evergreen, em PT-BR, com gancho em notícias quando houver.
  Notícia pura é ruim: anúncio limitado em guerra atual, YouTube prioriza fontes oficiais e o risco de erro é alto.
  Visual precisa de mapas gerados em código + imagens do Wikimedia Commons (o Pexels sozinho não serve).
- [ ] Idioma: PT-BR (afiliado Mercado Livre) ou inglês para os EUA (afiliado Amazon Associates, RPM maior).
- [ ] Onde fica o código: neste repositório (painel da Tia Fifi) ou num repositório separado.
- [ ] Voz: ElevenLabs (paga, mais natural, permite clonar a voz do dono) ou Kokoro TTS (grátis, local).

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
| ElevenLabs | ✅ conectado (plano Starter, 40 mil caracteres/mês, cerca de 4 vídeos de 10 min) | `ELEVENLABS_API_KEY` |
| Descript | ✅ conectado nas sessões do Claude | — |
| TinyFish (web) | ✅ conectado nas sessões do Claude | — |
| Anthropic | já existe no projeto da Tia Fifi | `ANTHROPIC_API_KEY` |
| Pexels | ❌ falta criar a chave (grátis) | `PEXELS_API_KEY` |
| YouTube (Google Cloud) | ❌ falta: projeto, YouTube Data API v3, YouTube Analytics API, cliente OAuth Web | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` |
| VPS com HTTPS + FFmpeg | ❌ falta (mínimo 4 GB de RAM pra render) | — |

Redirect do YouTube: `{APP_URL}/api/youtube/oauth/callback`.

## Próximos passos

1. O dono fecha as decisões pendentes (nicho e idioma primeiro).
2. O dono cria o canal e as chaves (Pexels, Google Cloud) e pede a auditoria da API do YouTube.
3. Claude monta a tela "Conectar YouTube" + o status das conexões.
4. Claude monta os setores 1 a 6 e gera o primeiro vídeo de teste.
5. Depois de 10 a 20 vídeos publicados, ligar os setores 7 e 8 (análise e estratégia).
