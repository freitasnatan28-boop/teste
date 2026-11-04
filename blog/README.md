# Paws & Cardboard — blog em inglês para AdSense

Blog estático (HTML puro) sobre projetos "faça você mesmo" com papelão para gatos e cachorros.
Rápido, seguro, sem plugins para atualizar e funciona em qualquer plano da Hostinger.

```
blog/
├── site.config.json      ← nome do site, domínio, seu nome, e-mail, ID do AdSense
├── content/posts/*.md    ← os artigos (1 arquivo = 1 post)
├── content/pages/*.md    ← Sobre, Contato, Privacidade, Cookies, Termos, Afiliados, Aviso legal
├── assets/               ← visual (CSS), logo, ilustrações e suas fotos (assets/img/)
├── build.mjs             ← gera o site pronto em dist/
└── dist/                 ← o site final (é isso que vai para a Hostinger)
```

## O que já está pronto

- 12 artigos em inglês (4 gatos, 4 cães, 4 guias), com fontes científicas conferidas
- Páginas obrigatórias: About, Contact, Privacy Policy (cita AdSense, GDPR, LGPD e leis dos EUA), Cookie Policy, Terms, Affiliate Disclosure, Disclaimer
- Link "Privacy & cookie settings" no rodapé (reabre a mensagem de consentimento do Google)
- SEO: título e descrição por página, canonical, sitemap.xml, robots.txt, RSS, dados estruturados (BlogPosting, Breadcrumb)
- Código do AdSense e `ads.txt` gerados automaticamente quando você preencher o ID
- Página 404, layout para celular, sem fontes externas (mais rápido e sem problema de privacidade)

## 1. O que VOCÊ precisa preencher (`site.config.json`)

| Campo | O que colocar |
|---|---|
| `url` | O domínio que você comprar, ex.: `https://www.pawsandcardboard.com` |
| `author.name` | Seu nome real (ou nome + sobrenome abreviado). O Google valoriza um autor de verdade |
| `author.shortBio` | 1 ou 2 frases em inglês sobre você e seus pets |
| `contactEmail` | Um e-mail de contato (ex.: `hello@seudominio.com`, que a Hostinger cria grátis) |
| `adsensePublisherId` | Seu ID do AdSense, no formato `pub-1234567890123456` (AdSense → Conta → Informações da conta) |

O comando `node build.mjs` avisa o que ainda falta preencher.

## 2. Suas fotos (o que mais ajuda na aprovação)

Os artigos têm **17 lugares marcados** para fotos suas, com comentários assim:

```
<!-- PHOTO: finished scratcher, ideally with your cat using it -->
```

Para colocar uma foto: salve em `assets/img/` (ex.: `scratcher-pronto.jpg`, de preferência até 1600 px de largura) e troque o comentário por:

```
![Finished cardboard scratcher with a cat on it](/assets/img/scratcher-pronto.jpg "Legenda opcional")
```

Fotos **reais** dos projetos, mesmo simples e tiradas no celular, valem mais que qualquer foto bonita de banco de imagens.

## 3. Gerar o site

```bash
cd blog
npm install
node build.mjs          # gera dist/
node serve.mjs          # pré-visualização em http://localhost:4321
npm run zip             # gera site.zip pronto para enviar
```

## 4. Publicar na Hostinger

1. Compre o domínio `.com` (sugestão: `pawsandcardboard.com`, que estava livre em 04/11/2026) e adicione-o ao seu plano de hospedagem no hPanel.
2. hPanel → **Sites** → seu domínio → **Gerenciador de arquivos** → abra a pasta `public_html`.
3. Apague o que estiver lá (se for um site novo) e envie o `site.zip`. Clique com o botão direito → **Extrair**.
4. Confirme que o `index.html` ficou direto dentro de `public_html` (e não numa subpasta).
5. hPanel → **Segurança → SSL**: ative o SSL grátis e ligue **Forçar HTTPS**.

## 5. Google Search Console (antes do AdSense)

1. Entre em search.google.com/search-console e adicione o domínio (verificação por DNS na Hostinger).
2. Em **Sitemaps**, envie `sitemap.xml`.
3. Espere os artigos aparecerem como indexados (alguns dias).

## 6. AdSense + cookies

1. AdSense → **Sites** → **Novo site** → seu domínio novo.
2. Coloque seu `pub-...` no `site.config.json`, rode `npm run zip` e reenvie o site. O código do AdSense, a meta tag de verificação e o `ads.txt` entram sozinhos.
3. AdSense → **Privacidade e mensagens**:
   - **Europeus (GDPR)**: crie a mensagem e publique. Ela mostra o banner "aceitar ou recusar cookies" para visitantes da Europa, Reino Unido e Suíça. É uma plataforma de consentimento certificada pelo Google, obrigatória para ter anúncios personalizados na Europa.
   - **Regulamentações estaduais dos EUA**: crie e publique a mensagem de opt-out.
4. Ative os **Anúncios automáticos**.
5. **Só peça a revisão** quando: tiver 20 a 25 posts, com fotos suas, nome e e-mail preenchidos e o site indexado no Search Console.

⚠️ **Nunca clique nos seus próprios anúncios** nem peça para outras pessoas clicarem. Isso dá banimento permanente.

## 7. Cronograma sugerido

| Quando | O quê |
|---|---|
| Semana 1 | Domínio + preencher config + fotos dos 12 posts + publicar + Search Console |
| Semanas 2 a 4 | 2 a 3 posts novos por semana (lista abaixo) |
| ~Semana 4 | Com 20 a 25 posts e tudo indexado: pedir revisão no AdSense |

## 8. Próximos posts (planejados)

**Gatos:** cardboard cat tunnel · wall-mounted cardboard scratcher · cat window perch box · paper bag and box hide-and-seek game · DIY cat wand toy (safe version) · cardboard cat bed for winter

**Cães:** cardboard dog maze for treats · DIY lick mat alternatives · how to teach "find it" · cardboard tug toy (supervised) · enrichment for senior dogs · enrichment for dogs on crate rest (with vet note)

**Guias:** is cardboard safe for cats to chew? · catnip vs silver vine · how to introduce a new toy to a shy cat · enrichment for dogs left alone · cheap enrichment for multi-cat homes · how often to replace cardboard toys

Para criar um post: copie um arquivo de `content/posts/`, mude o nome do arquivo (vira o endereço da página) e o cabeçalho (`title`, `description`, `date`, `category`: `cats`, `dogs` ou `guides`).
