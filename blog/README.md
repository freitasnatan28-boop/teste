# Carimbo — blog de viagem em inglês para AdSense

Blog estático (HTML puro) com guias de viagem para o Brasil, EUA, Espanha, Inglaterra, França e Itália.
Rápido, sem plugins e funciona em qualquer plano da Hostinger.

```
blog/
├── site.config.json      ← nome, domínio, seu nome, e-mail, ID do AdSense e a lista de países
├── content/posts/*.md    ← os guias (1 arquivo = 1 página)
├── content/pages/*.md    ← About, Contact, Privacy, Cookies, Terms, Affiliate, Disclaimer
├── assets/               ← CSS, fontes (licença SIL OFL), logo e suas fotos (assets/img/)
├── build.mjs             ← gera o site pronto em dist/
├── preview.mjs           ← gera a prévia em arquivo único (dist-preview/carimbo-preview.html)
└── dist/                 ← o site final (é isso que vai para a Hostinger)
```

## O que já está pronto

- 8 guias em inglês: "10 Best Places to Visit" para os 6 países + "Best Time to Visit Brazil" + "Is Rio de Janeiro Safe?"
- Cada guia termina com links das fontes oficiais (turismo, governo, parques)
- Páginas obrigatórias: About, Contact, Privacy Policy (AdSense, GDPR, LGPD, EUA), Cookie Policy, Terms, Affiliate Disclosure, Disclaimer
- Design de uma coluna, fontes próprias (sem Google Fonts), modo escuro automático, carimbo de passaporte por país
- SEO: canonical, sitemap.xml, robots.txt, RSS, dados estruturados; código do AdSense e `ads.txt` automáticos
- Posts com data futura ficam agendados (só entram quando a data chega e o site é gerado de novo)

## 1. Preencher `site.config.json`

| Campo | O que colocar |
|---|---|
| `url` | O domínio comprado, ex.: `https://www.carimbotravel.com` (estava livre em 04/11/2026) |
| `author.name` | Seu nome real |
| `author.shortBio` | 1 ou 2 frases em inglês sobre você |
| `contactEmail` | E-mail de contato (ex.: `hello@carimbotravel.com`) |
| `adsensePublisherId` | `pub-1234567890123456` (AdSense → Conta → Informações da conta) |

## 2. Fotos

Fotos suas valem mais que qualquer outra coisa. Salve em `assets/img/` e coloque no texto:

```
![Copacabana beach seen from the Sugarloaf cable car](/assets/img/copacabana.jpg "Copacabana from Sugarloaf")
```

Se usar fotos de outras pessoas, use só fotos com licença livre (ex.: Unsplash, Pexels ou Wikimedia Commons, citando o autor quando a licença pedir). Não use fotos geradas por IA de lugares reais.

## 3. Gerar o site

```bash
cd blog
npm install
node build.mjs          # gera dist/
node serve.mjs          # pré-visualização em http://localhost:4321
node preview.mjs        # prévia em arquivo único com todos os posts
npm run zip             # gera site.zip para enviar à Hostinger
```

## 4. Publicar na Hostinger

1. hPanel → Domínios → comprar o domínio → Sites → Adicionar site (site vazio)
2. Gerenciador de arquivos → `public_html` → apagar o `default.php` → Upload do `site.zip` → botão direito → Extrair
3. Conferir que o `index.html` está direto em `public_html`
4. Segurança → SSL → instalar e ativar "Forçar HTTPS"

## 5. Google Search Console

1. Adicionar propriedade do tipo **Domínio** e verificar com o registro **TXT** no DNS da Hostinger
2. Sitemaps → enviar `sitemap.xml`
3. Inspeção de URL → solicitar indexação da página inicial e dos guias principais

## 6. AdSense

1. Sites → Novo site → seu domínio
2. Privacidade e mensagens → publicar a mensagem GDPR (banner de cookies) e a de estados dos EUA
3. Pedir revisão só com o site indexado e uns 20 guias publicados

⚠️ Nunca clique nos seus próprios anúncios.

## 7. Próximos guias (Brasil primeiro, que é a sua vantagem)

- Rio de Janeiro in 4 days · São Paulo for first-time visitors · Best beaches near Rio · Paraty and Ilha Grande · Getting around Brazil (flights, buses, apps) · Brazilian food to try · Money in Brazil (cards, cash, ATMs)
- One week in Rome · Paris in 3 days · London on a budget · New York in 5 days · Barcelona in 3 days

Para criar um guia: copie um arquivo de `content/posts/`, mude o nome do arquivo (vira o endereço) e o cabeçalho (`title`, `description`, `date`, `country`: `brazil`, `usa`, `spain`, `england`, `france` ou `italy`).
