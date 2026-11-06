# 🎮 Live Games

Site de **jogos interativos para TikTok LIVE**. Cada pessoa cria uma conta, coloca o @ do TikTok e recebe um **link exclusivo da tela do jogo** para pôr no TikTok LIVE Studio ou no OBS. Tudo se controla por um **painel**, que também funciona no celular.

O primeiro jogo é a **Guerra de Times**. O público escolhe um time pelo chat, curtidas e presentes viram pontos, e o maior presenteador ganha a coroa de **TOP 1** na tela.

| Página | Para que serve |
|---|---|
| `/` | Página inicial (apresentação e botão de cadastro) |
| `/criar-conta` e `/entrar` | Cadastro e login |
| `/painel` | Painel de cada pessoa: conectar na live, link da tela, controle da partida, testes, ranking e configuração dos times e regras |
| `/o/<código>` | Tela do jogo de cada conta (1080x1920), que vai na live |

## Por que o público interage e manda presente

- **Rivalidade:** de 2 a 6 times. Tem modelos prontos de futebol, países, regiões e meninos x meninas, ou você monta os seus.
- **Status:** ranking de presenteadores. Quando alguém passa o TOP 1, aparece o banner **"NOVO TOP 1"**.
- **Urgência:** nos últimos 30 segundos da rodada os pontos valem em dobro.
- **Meta de curtidas:** quando bate a meta, entra o **TURBO**, com pontos em dobro.
- **Presente grande aparece muito:** a partir de 99 moedas surge o **SUPER ATAQUE**. A partir de 1000 moedas, o **LENDÁRIO**, com tremida, flash e confete.
- **Craque da rodada** e troféus para o time vencedor.

---

## Rodar no seu computador

1. Instale o **Node.js 20 ou mais novo** em https://nodejs.org (versão LTS).
2. Abra o terminal nesta pasta (`live-games`) e instale as dependências:

```bash
npm install
```

3. Ligue o site:

```bash
npm start
```

4. Abra http://localhost:8080, crie sua conta e use o **Modo teste** no painel para ver o jogo funcionando com um público falso.

Assim o site só funciona no seu computador. Para outras pessoas acessarem, ele precisa estar publicado na internet (veja abaixo).

## Colocar no ar (para outras pessoas usarem)

O site precisa de um servidor ligado 24 horas e com suporte a WebSocket. Ele **não funciona** na Vercel nem em hospedagem de site estático. Precisa também de um **disco permanente** para guardar contas e rankings, apontado pela variável `DATA_DIR`.

### Opção 1: Railway (mais fácil)
1. Crie uma conta em https://railway.app e escolha **New Project → Deploy from GitHub repo**, selecionando este repositório.
2. Em **Settings → Root Directory**, coloque `live-games`. O Railway usa o `Dockerfile` sozinho.
3. Em **Volumes**, crie um volume montado em `/data`.
4. Em **Variables**, adicione `EULER_API_KEY` (veja a seção sobre a Euler Stream abaixo).
5. Em **Settings → Networking**, clique em **Generate Domain**. Esse é o endereço do seu site. Você pode trocar por um domínio próprio depois.

### Opção 2: Render
Crie um **Web Service** com Root Directory `live-games` e runtime **Docker**. Adicione um **Disk** montado em `/data`. O disco exige plano pago e, sem ele, as contas se perdem a cada atualização. Coloque as mesmas variáveis do Railway.

### Opção 3: VPS (Hostinger, Contabo, DigitalOcean…)
Funciona em um servidor Linux com Docker:

```bash
docker build -t live-games .
```

```bash
docker run -d --restart=always -p 8080:8080 -v /srv/live-games:/data -e EULER_API_KEY=sua_chave live-games
```

Na frente, coloque um proxy com HTTPS (Caddy ou Nginx) apontando para a porta 8080.

### Variáveis de ambiente

| Variável | O que faz |
|---|---|
| `PORT` | Porta do servidor (as hospedagens já definem sozinhas) |
| `DATA_DIR` | Pasta das contas e rankings (`/data` no Docker). **Precisa ser um disco permanente.** |
| `EULER_API_KEY` | Chave da Euler Stream. Recomendada quando muitas pessoas usam o site |
| `MAX_LIVES` | Quantas lives podem ficar conectadas ao mesmo tempo (padrão 50) |
| `CADASTRO=fechado` | Para de aceitar contas novas (útil se quiser liberar só para convidados) |

`GET /saude` mostra se o servidor está de pé e quantas lives estão conectadas.

## Coisas importantes antes de abrir para o público

- **Leitura da live:** o site usa a biblioteca **não oficial** [`tiktok-live-connector`](https://www.npmjs.com/package/tiktok-live-connector). Quando o TikTok muda alguma coisa ela pode parar até sair atualização. Nesse caso, rode `npm update` e publique de novo.
- **Euler Stream:** a biblioteca usa o serviço da Euler Stream para conectar nas lives. Sem chave, o limite de conexões é baixo. Com várias pessoas usando o site ao mesmo tempo, crie uma chave em https://www.eulerstream.com e coloque em `EULER_API_KEY`. Confira lá os limites e preços.
- **Servidor na nuvem:** o TikTok às vezes desconfia de conexões vindas de servidores de nuvem. Se as lives não conectarem a partir do servidor, mas conectarem rodando no seu PC, é isso. A chave da Euler costuma resolver.
- **Lives muito cheias:** o TikTok não manda todas as curtidas uma a uma. Os presentes chegam todos.
- **Regras do TikTok:** não prometa dinheiro nem prêmio em troca de presente, e não transforme o jogo em aposta. Leia as diretrizes de LIVE e monetização do TikTok e deixe isso claro para quem usar o site.
- **Dados:** o site guarda nome, e-mail, senha (só a versão protegida, nunca a senha em si), o @ do TikTok e os apelidos de quem presenteou. Se for abrir para o público em geral, vale ter uma página de **Termos de uso e Privacidade** (LGPD).

## Como o código está organizado

```
server.mjs              site: páginas, API, login e tempo real (WebSocket)
src/contas.mjs          cadastro, senha (scrypt) e sessões
src/banco.mjs           armazenamento em arquivo JSON (DATA_DIR/banco.json)
src/salas.mjs           uma "sala" por conta: jogo + conexão com a live + telas abertas
src/jogo.mjs            regras da Guerra de Times
src/configuracao.mjs    configuração padrão, modelos prontos e validação
src/tiktok.mjs          conexão com o TikTok e leitura dos presentes (inclusive combos)
src/simulador.mjs       público falso do modo teste
public/                 páginas (inicial, entrar, painel) e a tela do jogo (jogo.html/css/js)
test/                   testes (npm test)
```

O "banco" em arquivo JSON aguenta bem algumas centenas de contas. Se o site crescer, dá para trocar `src/banco.mjs` por Postgres sem mexer no resto.
