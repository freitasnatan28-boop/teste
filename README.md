# Tia Fifi · Painel de Ofertas para Afiliados

Painel web para quem divulga ofertas em grupos de WhatsApp. Ele encontra boas ofertas,
guarda seus links de afiliado e, nas próximas fases, gera mensagens com IA, dispara nos grupos e mostra métricas.

| Fase | O que faz | Situação |
| --- | --- | --- |
| **1** | Ofertas do Mercado Livre, score, histórico de preços, links de afiliado | ✅ **pronta para testar** |
| 2 | Mensagens com IA na voz da "Tia Fifi" (Claude) | aguardando você confirmar a Fase 1 |
| 3 | WhatsApp (Baileys): grupos, fila e disparo com anti-banimento | — |
| 4 | Redirecionador de grupos, encurtador e dashboard de cliques | — |
| 5 | Shopee (Affiliate Open API) | esqueleto pronto, desligado |
| 6 | Multiusuário / virar produto | futuro |

---

## Sumário

1. [Tecnologias e por quê](#1-tecnologias-e-por-quê)
2. [Estrutura de pastas](#2-estrutura-de-pastas)
3. [Rodar no seu computador (passo a passo)](#3-rodar-no-seu-computador-passo-a-passo)
4. [Criar o app no Mercado Livre e conectar](#4-criar-o-app-no-mercado-livre-e-conectar)
5. [Como testar a Fase 1](#5-como-testar-a-fase-1)
6. [Links de afiliado: como funciona e riscos](#6-links-de-afiliado-como-funciona-e-riscos)
7. [Score e "desconto suspeito"](#7-score-e-desconto-suspeito)
8. [Colocar no ar numa VPS (passo a passo)](#8-colocar-no-ar-numa-vps-passo-a-passo)
9. [Segurança e cuidados](#9-segurança-e-cuidados)
10. [Comandos úteis](#10-comandos-úteis)

---

## 1. Tecnologias e por quê

| Parte | Escolha | Por quê |
| --- | --- | --- |
| Linguagem | Node.js 22 + TypeScript | Um só idioma no painel, na API e no robô do WhatsApp. O TypeScript aponta erros antes de rodar. |
| Painel | Next.js 16 | Painel e API no mesmo projeto. As telas são geradas no servidor, então abrem rápido no celular. |
| Banco | SQLite + Prisma | O banco é um arquivo só, sem instalar nada. Para ir ao Postgres depois, basta trocar 1 linha. |
| WhatsApp (Fase 3) | Baileys, num **processo separado** | O WhatsApp precisa de uma conexão aberta o tempo todo. Se ela ficar separada do painel, um problema em um não derruba o outro. |
| Agendamento (Fase 3) | Fila no próprio banco + node-cron | **Sugestão melhor que BullMQ** para o seu caso: o BullMQ exige instalar e manter um Redis. Para dezenas de envios por hora, uma fila no SQLite basta e dá menos trabalho. |
| IA (Fase 2) | API da Anthropic (Claude) | É o pedido original. |
| Servidor | VPS Linux + PM2 + Nginx + HTTPS grátis (Let's Encrypt) | É barato e dá controle total. O PM2 reinicia o painel se ele cair. |

---

## 2. Estrutura de pastas

```
.
├── prisma/
│   ├── schema.prisma          ← tabelas do banco (produtos, histórico, tags, tokens)
│   ├── migrations/            ← histórico de mudanças do banco
│   └── seed.ts                ← cria as tags: natal, casa, moda, maternidade, verão
├── scripts/
│   └── atualizar-precos.ts    ← atualiza preços de todas as ofertas (roda sozinho a cada 6h no servidor)
├── src/
│   ├── marketplaces/          ← CAMADA "MARKETPLACE ADAPTER"
│   │   ├── types.ts           ← interface comum: buscarOfertas, detalhesProduto, gerarLinkAfiliado
│   │   ├── registry.ts        ← lista de lojas ligadas/desligadas
│   │   ├── mercadolivre/      ← adapter do Mercado Livre (API oficial + OAuth)
│   │   └── shopee/            ← esqueleto da Shopee (desligado até a Fase 5)
│   ├── services/ofertas.ts    ← regras: salvar oferta, histórico, score, tags, link
│   ├── lib/                   ← score, desconto suspeito, tags, login, formatação
│   ├── components/            ← pedaços de tela (card de oferta, botões, gráfico)
│   ├── app/                   ← telas do painel (Ofertas, Adicionar, Configurações, Login)
│   └── proxy.ts               ← exige login em todas as páginas
├── tests/                     ← testes automáticos (npm test)
├── ecosystem.config.cjs       ← configuração do PM2 (servidor)
└── .env.example               ← modelo das configurações/chaves (copie para .env)
```

---

## 3. Rodar no seu computador (passo a passo)

### 3.1 Instalar os programas (uma vez só)

1. **Node.js 22 (LTS)**: baixe em <https://nodejs.org> e instale com "Avançar, Avançar".
2. **Git**: baixe em <https://git-scm.com/downloads> e instale.
3. Abra o **Terminal**. No Windows, use o "PowerShell" (menu Iniciar → digite PowerShell). No Mac, use o app "Terminal".
4. Confira se deu certo. Cada comando deve mostrar um número de versão:
   ```bash
   node -v
   git --version
   ```

### 3.2 Baixar o projeto

```bash
git clone https://github.com/freitasnatan28-boop/teste.git tia-fifi
cd tia-fifi
git checkout claude/affiliate-whatsapp-automation-tuhjld
```
> Se o repositório for privado, o Git vai pedir usuário e senha. No lugar da senha, use um **token** do GitHub:
> GitHub → Settings → Developer settings → Personal access tokens.

### 3.3 Instalar as dependências

```bash
npm install
```

### 3.4 Criar o arquivo de configuração `.env`

```bash
# Windows (PowerShell):
copy .env.example .env
# Mac/Linux:
cp .env.example .env
```

Abra o `.env` num editor de texto (Bloco de Notas ou VS Code) e preencha estes campos:

- `PANEL_PASSWORD`: a senha para entrar no painel.
- `SESSION_SECRET`: uma chave aleatória. Para gerar uma, rode o comando abaixo e cole o resultado:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Para **testar sem o Mercado Livre**, deixe `ML_MOCK=true`. O painel usa 10 produtos de exemplo.

### 3.5 Criar o banco e iniciar

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Abra <http://localhost:3000> no navegador e entre com a senha do `.env`.
Para desligar o painel, aperte `Ctrl + C` no terminal.

> **Para abrir no celular** (celular e computador no mesmo Wi-Fi): descubra o IP do computador
> (`ipconfig` no Windows, algo como 192.168.0.10) e acesse `http://192.168.0.10:3000` no celular.

---

## 4. Criar o app no Mercado Livre e conectar

A busca de produtos usa a **API oficial** do ML. Para usá-la, você precisa registrar um "aplicativo" (é de graça).

### 4.1 Registrar o aplicativo

1. Entre em <https://developers.mercadolivre.com.br/devcenter> com **a sua conta principal** do Mercado Livre.
   Não use uma conta de colaborador, porque ela não consegue autorizar apps.
2. Clique em **Criar nova aplicação** e preencha:
   - **Nome / nome curto / descrição**: por exemplo, "Painel Tia Fifi".
   - **Redirect URI**: o endereço para onde o ML manda você de volta depois de autorizar.
     - No servidor (depois do passo 8): `https://painel.seudominio.com.br/api/ml/oauth/callback`
     - Testando no computador: o ML costuma exigir HTTPS, então use o **modo "colar código"** (item 4.3).
       Cadastre, por exemplo, `https://localhost:3000/api/ml/oauth/callback`.
       Se o ML recusar esse endereço, use `https://www.google.com.br/`.
   - **PKCE**: pode deixar desligado.
   - **Escopos / permissões**: marque **leitura (read)** e **offline_access** (serve para renovar o acesso sozinho).
     **Não precisa de escrita.**
3. Salve. O ML mostra o **App ID** (Client ID) e a **Secret Key** (Client Secret).

### 4.2 Colocar as chaves no `.env`

```env
ML_CLIENT_ID=1234567890123456
ML_CLIENT_SECRET=aBcDeF...
ML_REDIRECT_URI=https://localhost:3000/api/ml/oauth/callback   # EXATAMENTE igual ao cadastrado no ML
ML_MOCK=false
```

Depois de mudar o `.env`, reinicie o painel: `Ctrl + C` e `npm run dev` de novo.

### 4.3 Conectar

1. No painel, vá em **Config.** → **Conectar Mercado Livre** e autorize.
2. Se o seu Redirect URI aponta para o painel no servidor, ele volta sozinho e mostra "Conectado ✓".
3. **Modo "colar código"** (para testes no computador): depois de autorizar, o navegador abre uma página que não carrega
   (ou abre o Google), mas a barra de endereço mostra algo como `...?code=TG-xxxx&state=yyyy`.
   Copie **o endereço inteiro** e cole em **Config. → "O retorno não voltou para o painel?"**.
   Faça isso logo: o código vale poucos minutos.

O acesso expira a cada 6 horas e o painel **renova sozinho**. Se você ficar 4 meses sem usar,
ou trocar a senha do ML, será preciso conectar de novo.

### 4.4 O que a API do ML permite hoje (pesquisado em set/2026)

- A busca pública `/sites/MLB/search` hoje **responde 403 (bloqueada)** para a maioria dos apps novos.
  O painel tenta usá-la uma vez. Se vier 403, passa a usar automaticamente as alternativas oficiais:
  - **Palavra-chave**: busca no **catálogo** (`/products/search`) e pega o preço do vendedor que está ganhando o "buy box"
    (`/products/{id}`). Anúncios que não estão no catálogo não aparecem nessa busca.
  - **Só categoria**: os **20 mais vendidos** da categoria (`/highlights/MLB/category/{id}`). Categorias muito grandes
    não têm esse ranking; nesse caso, informe uma subcategoria. O ID aparece no site do ML, por exemplo `MLB432825`.
  - **Qualquer produto** que você achar no app ou no site: use **Adicionar → colar o link**.
- Complementos: avaliações (`/reviews/item`) e dados do anúncio (`/items/bulk`). Quando o ML não informa algum dado,
  como a quantidade vendida, o score usa um valor neutro.

---

## 5. Como testar a Fase 1

Faça primeiro com `ML_MOCK=true` (produtos de exemplo) e depois com a sua conta real (`ML_MOCK=false`).

1. **Login**
   - Abra o painel e digite uma senha errada. Deve aparecer "Senha incorreta".
   - Digite a senha certa. Você entra na tela **Ofertas**.
2. **Buscar por palavra-chave**
   - Digite `air fryer` e toque em **Buscar e salvar ofertas**.
   - Os cards aparecem com foto, preço "de/por", % de desconto, score (quadradinho colorido), frete grátis,
     loja oficial, avaliação e vendidos.
   - No modo exemplo, experimente `natal fralda ventilador air`.
3. **Buscar por categoria**
   - Escolha uma categoria (por exemplo, "Bebês"), deixe a palavra-chave vazia e busque.
   - Aparecem os mais vendidos, com o selo 🏆.
   - Se aparecer a mensagem "Essa categoria não tem ranking", é o comportamento esperado para categorias grandes.
     Informe uma subcategoria.
4. **Filtros**
   - Abra **Filtros e ordem** e teste categoria, preço mín./máx., desconto mínimo, tag (natal, casa, moda,
     maternidade, verão), "só frete grátis" e as ordenações.
5. **Detalhe da oferta**: toque num card e confira:
   - O quadro **Score** mostra quantos pontos vieram de cada critério.
   - O **Histórico de preços** mostra uma linha por consulta.
   - Toque em **Consultar preço agora** algumas vezes. O histórico cresce e o gráfico aparece.
6. **Link de afiliado**, na tela de detalhe:
   - Toque em **1. Copiar link do produto** e depois em **2. Abrir Gerador de Links**.
     No Portal do Afiliado, cole o link e clique em Gerar.
   - Cole o link `https://meli.la/...` no campo e toque em **Salvar link**. Aparece "🔗 link pronto" no card.
   - Tente colar um link comum de produto. O painel deve **recusar** e explicar que ele não rende comissão.
7. **Adicionar pelo link**
   - Em **Adicionar**, cole o link de um produto do ML (ou o seu `meli.la`). O produto é importado.
     Se o link colado era de afiliado, ele já fica salvo.
8. **Tags**
   - No detalhe, marque ou desmarque tags e salve. Depois, filtre por essa tag na tela Ofertas.
9. **Desconto suspeito**
   - Um desconto anunciado acima de 80% é marcado na hora (no modo exemplo, veja o "Vestido Midi").
   - Nos outros casos, o painel precisa de pelo menos 3 consultas em 3 dias diferentes para comparar o "preço de"
     com os preços que ele já viu. Por isso, em produto novo aparece "histórico ainda curto".
10. **Atualizar preços**
    - O botão **↻ Atualizar preços** consulta tudo de novo.
    - No servidor, isso roda sozinho a cada 6 horas.
    - Você também pode rodar manualmente: `npm run precos:atualizar`.
11. **Testes automáticos** (opcional): `npm test`. Devem aparecer 37 testes passando.

**Me avise quando a Fase 1 funcionar com a sua conta real.** Aí eu começo a Fase 2 (mensagens com IA).

---

## 6. Links de afiliado: como funciona e riscos

**O Mercado Livre NÃO oferece API pública para gerar links de afiliado.** O painel tem dois modos:

### ⚡ Modo automático (recomendado)

O link gerado pelo Portal do Afiliado leva o comprador para o produto com dois parâmetros que identificam você:
`matt_tool` (ID da sua conta de afiliado) e `matt_word` (etiqueta). O painel descobre esses códigos **uma vez**
e passa a montar o link de todas as ofertas sozinho. Não há login automático nem acesso ao Portal.

1. Em **Config. → Link de afiliado automático**, cole **um** link seu (`https://meli.la/...`) e toque em **Detectar meu código**.
   - Se a detecção falhar, abra o seu link no navegador, copie o endereço completo da barra (ele contém `matt_tool=`)
     e cole esse endereço. Ou use a opção "Prefiro digitar o código".
2. Pronto: toda oferta nova chega com **⚡ link automático**. Links que você colar manualmente sempre têm prioridade.
3. **Valide antes de usar em escala.**
   - Abra um link gerado numa aba anônima.
   - Em 24 a 48 horas, confira no relatório do Portal do Afiliado se os cliques aparecem na sua etiqueta.
   - Se não aparecerem, desligue o modo automático e use o manual. **Risco:** o ML pode mudar o formato
     sem aviso, e aí os cliques deixam de ser atribuídos a você. A validação serve para pegar isso cedo.

### ✋ Modo manual

Os caminhos oficiais são dois:
- o **Gerador de Links** no Portal do Afiliado (só no computador): <https://www.mercadolivre.com.br/afiliados/linkbuilder>;
- a **Barra de Afiliados** (computador e celular): ative uma vez em Portal do Afiliado → Configurações.
  Depois, no app do ML, abra o produto e toque em **Compartilhar**: o link gerado já é de afiliado.

Por isso o painel usa o **fluxo manual seguro**: ele mostra a oferta, você gera o link e cola no campo.
O painel aceita links `https://meli.la/...` e `https://mercadolivre.com/sec/...`, salva e usa esse link.

**Dica rápida pelo celular:** no app do ML, toque em **Compartilhar** (com a Barra de Afiliados ativa), copie o link e cole em
**Adicionar**. Numa ação só, o painel importa o produto e salva o link.

### Por que o painel não automatiza o login nem lê o Portal do Afiliado

Algumas ferramentas do mercado fazem isso guardando o "cookie" da sua sessão do ML e chamando as páginas internas do portal.
**Não implementei isso**, pelos riscos abaixo:
- **Termos de uso**: automatizar o acesso ao portal ou extrair dados dele (scraping) pode violar os Termos do Programa de
  Afiliados e do site. A consequência pode ser o **bloqueio da conta de afiliado e a perda das comissões**.
- **Segurança**: o cookie dá acesso à sua conta inteira do ML. Se ele vazar, alguém pode usar a sua conta.
- **Fragilidade**: páginas internas mudam sem aviso, e a automação para de funcionar do nada.

Se no futuro você quiser seguir por esse caminho, conversamos antes e você decide conhecendo os riscos.
Uma alternativa intermediária são serviços pagos de terceiros que fazem a conversão. Mesmo assim, você entrega o cookie a eles.

---

## 7. Score e "desconto suspeito"

**Score (0 a 100)**: quanto maior, melhor a oferta para divulgar.

| Critério | Pontos |
| --- | --- |
| Desconto **real** | até 35 (60% ou mais de desconto dá a nota máxima) |
| Avaliação | até 20 (nota 3,0 vale 0 e nota 5,0 vale 20; com poucas avaliações, pesa menos) |
| Vendas | até 20 (10 mil ou mais vendidos, ou estar no topo dos mais vendidos) |
| Frete grátis | 15 |
| Loja oficial | 10 |
| Desconto suspeito | −15 |

**Desconto suspeito**: o painel guarda o preço **a cada consulta**. O "preço de" (riscado) é marcado como inflado nestes casos:
- ele é mais de 20% maior que o **maior preço já visto** nos últimos 90 dias. É preciso ter pelo menos 3 consultas em 3 dias.
  Nesse caso, o "desconto real" passa a ser calculado sobre o preço mediano do histórico;
- o desconto anunciado passa de 80% (marcado na hora).

Para mudar essas regras, edite `src/lib/precos.ts` (bloco `REGRAS`) e `src/lib/score.ts`.

---

## 8. Colocar no ar numa VPS (passo a passo)

### 8.1 O que contratar

- **VPS** com Ubuntu 24.04, 1 a 2 GB de RAM (Hostinger, Contabo, DigitalOcean, Vultr, Magalu Cloud etc.). Custa cerca de R$ 25 a 60 por mês.
- **Domínio** (por exemplo, no registro.br, cerca de R$ 40 por ano).
- No painel do domínio, crie um **registro DNS tipo A**: nome `painel`, valor = IP da VPS.
  Você vai acessar por `painel.seudominio.com.br`.

### 8.2 Entrar no servidor

No terminal do seu computador (use o IP e a senha que a VPS enviou):
```bash
ssh root@IP_DA_VPS
```

### 8.3 Preparar o servidor (uma vez só)

```bash
# Atualizar o sistema
apt update && apt upgrade -y

# Criar um usuário (mais seguro que usar root) e entrar nele
adduser fifi
usermod -aG sudo fifi
su - fifi

# Instalar Node.js 22, Git, Nginx e o PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2

# Firewall: libera só SSH e web
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 8.4 Baixar e configurar o painel

```bash
cd ~
git clone https://github.com/freitasnatan28-boop/teste.git tia-fifi
cd tia-fifi
git checkout claude/affiliate-whatsapp-automation-tuhjld
npm ci
cp .env.example .env
nano .env
```

No editor `nano`, preencha:
- `APP_URL=https://painel.seudominio.com.br`
- `PANEL_PASSWORD` com uma senha **forte**
- `SESSION_SECRET`
- `ML_CLIENT_ID`, `ML_CLIENT_SECRET`
- `ML_REDIRECT_URI=https://painel.seudominio.com.br/api/ml/oauth/callback`
- `ML_MOCK=false`

Salve com `Ctrl+O` e `Enter`, e saia com `Ctrl+X`.

> Lembre-se de cadastrar esse mesmo Redirect URI no app do ML (passo 4.1).

```bash
npx prisma migrate deploy
npm run db:seed
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup      # o comando mostra uma linha começando com "sudo env ..." → copie e rode essa linha
```

### 8.5 Nginx (endereço público) + HTTPS grátis

```bash
sudo nano /etc/nginx/sites-available/painel
```
Cole este conteúdo, trocando o domínio:
```nginx
server {
    server_name painel.seudominio.com.br;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/painel /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Certificado HTTPS gratuito (renova sozinho)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d painel.seudominio.com.br
```

Pronto: acesse `https://painel.seudominio.com.br`.

### 8.6 Atualizar o painel quando houver novidades

```bash
cd ~/tia-fifi
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart all
```

### 8.7 Backup

Todo o banco está no arquivo `prisma/dados.db`. Faça uma cópia de vez em quando:
```bash
cp ~/tia-fifi/prisma/dados.db ~/backup-$(date +%F).db
```

### 8.8 Ver se está tudo rodando

```bash
pm2 status            # lista os processos
pm2 logs painel       # mostra os erros e mensagens do painel (Ctrl+C para sair)
```

---

## 9. Segurança e cuidados

- **Chaves só no `.env`**. Esse arquivo está no `.gitignore` e nunca vai para o GitHub. Se uma chave vazar,
  gere outra no painel do ML e troque no `.env`.
- O painel inteiro exige senha. Depois de 5 tentativas erradas, o IP fica bloqueado por 15 minutos.
- Os tokens do ML ficam no banco (`prisma/dados.db`). Proteja o servidor e os backups.
- O app do ML só pede **leitura**. Ele não consegue comprar, vender nem alterar nada na sua conta.
- Avisos sobre o WhatsApp (banimento) vêm antes da Fase 3, como combinado.

---

## 10. Comandos úteis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Liga o painel no modo desenvolvimento (computador) |
| `npm run build` e `npm start` | Gera e liga a versão de produção |
| `npm test` | Roda os testes automáticos |
| `npm run typecheck` | Procura erros de tipo no código |
| `npm run precos:atualizar` | Atualiza os preços de todas as ofertas |
| `npm run db:studio` | Abre um visualizador do banco no navegador (dá para editar as tags e as palavras-chave) |
| `npx prisma migrate deploy` | Aplica as mudanças do banco |
