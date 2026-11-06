# 🎮 Live Games: Guerra de Times

Jogo interativo para **TikTok LIVE**. O público escolhe um time pelo chat, e **curtidas e presentes viram pontos**. Ganha a rodada o time com mais pontos. Na tela também fica o **ranking dos maiores presenteadores**, com o **TOP 1 coroado** 👑.

## Por que esse jogo prende o público e puxa presente

| Gatilho | Como aparece no jogo |
|---|---|
| **Rivalidade** (time de futebol) | 4 times na tela. Ninguém quer ver o rival ganhar. |
| **Status** | Ranking de presenteadores. Quando alguém passa o TOP 1, aparece o banner **"NOVO TOP 1"** com o nome dele em destaque. |
| **Urgência** | Rodadas de 3 min. Nos **últimos 30s os pontos valem em dobro**. |
| **Virada** | Quem chega sem time cai no **último colocado**, então sempre dá para virar. |
| **Recompensa visual** | Presente de 99+ moedas mostra o banner **SUPER ATAQUE**. De 1000+ mostra o **LENDÁRIO**, com tremida, flash e confete. |
| **Meta coletiva** | A cada 500 curtidas entra o **TURBO**: pontos em dobro por 20s. Isso faz todo mundo tocar na tela. |
| **Reconhecimento** | No fim da rodada aparece o **CRAQUE** (quem mais pontuou pelo time vencedor). |

Pontuação padrão: ❤️ curtida = 1 pt · 🌹 rosa (1 moeda) = 10 pts · cada moeda = 10 pts · seguir = 30 · compartilhar = 20.

## 1. Instalar (uma vez só)

1. Instale o **Node.js 20 ou mais novo**: https://nodejs.org (botão "LTS").
2. Abra o terminal nesta pasta (`live-games`) e rode:

```bash
npm install
```

## 2. Testar sem estar ao vivo

```bash
npm run simular
```

Abra no navegador:
- **Tela do jogo:** http://localhost:8080/
- **Painel de controle:** http://localhost:8080/controle

O simulador cria um público falso que curte, comenta e manda presentes. No painel você também tem botões para mandar presentes de teste.

## 3. Usar na live de verdade

1. Abra `config.json` e troque `SEU_USUARIO_AQUI` pelo seu @ do TikTok (sem o @).
2. **Comece a live primeiro**. Depois rode:

```bash
npm start
```

Se preferir não editar o arquivo, passe o @ direto no comando:

```bash
npm start -- --usuario=seu_usuario
```

O programa espera a live começar e reconecta sozinho se cair.

3. Antes de começar, clique em **🆕 Nova live** no painel para zerar o ranking dos testes.

### Colocar a tela do jogo na transmissão

**Opção A: TikTok LIVE Studio (PC)**
- Deixe a transmissão na vertical.
- Adicione uma fonte de **Link / Navegador** com `http://localhost:8080/`, se a sua versão tiver.
- Se não tiver, abra `http://localhost:8080/` no navegador em tela cheia (F11) e adicione uma fonte de **Captura de janela** apontando para essa janela.

**Opção B: OBS Studio**
- Fontes → **Navegador** → URL `http://localhost:8080/`, largura **1080**, altura **1920**.
- Para colocar o jogo por cima da sua câmera, use `http://localhost:8080/?fundo=transparente`.
- Para transmitir do OBS para o TikTok você precisa da chave de transmissão, que nem toda conta tem.

Para tirar o som dos alertas, use `?som=0` no endereço.

> A parte de baixo da tela fica livre de propósito: é onde o TikTok mostra os comentários.

## 4. Personalizar (`config.json`)

- `times`: nome, cores e apelidos que o chat pode digitar. Dá para trocar por estados, países, signos, "meninos x meninas" etc. Funciona com 2 a 6 times. Com mais de 4 times, diminua a altura das barras em `public/jogo.css`.
- `duracaoRodadaSeg`, `finalEmDobroSeg`, `intervaloSeg`: tempo das rodadas.
- `pontos`: quanto vale cada curtida, moeda, follow e compartilhamento.
- `metaCurtidas.passo`: de quantas em quantas curtidas entra o TURBO. Para live pequena, use 200. Para live grande, use 2000 ou mais.
- `presentes`: a partir de quantas moedas aparece o SUPER ATAQUE e o LENDÁRIO.
- `semTime`: `"ultimo"` coloca quem não escolheu time no último colocado. `"nenhum"` não conta pontos para quem não escolheu time.

Depois de mudar, feche o programa (Ctrl+C) e rode de novo.

## Observações importantes

- A leitura da live usa a biblioteca **não oficial** [`tiktok-live-connector`](https://www.npmjs.com/package/tiktok-live-connector). Quando o TikTok muda alguma coisa ela pode parar até sair atualização. Para atualizar, rode `npm update`.
- A biblioteca usa o servidor da **Euler Stream** para assinar a conexão. Se aparecer erro de limite ("rate limit"), crie uma chave grátis em https://www.eulerstream.com e coloque em `tiktok.eulerApiKey` no `config.json`.
- Em lives muito cheias, o TikTok não manda todas as curtidas uma por uma. Os presentes chegam todos.
- **Regras do TikTok:** não prometa dinheiro nem prêmio em troca de presente, e não transforme o jogo em aposta ("quem mandar X ganha Y"). Presente como "ponto para o time" e ranking de reconhecimento é o formato comum. Mesmo assim, leia as diretrizes de LIVE e de monetização do TikTok.
- O ranking fica salvo em `data/ranking.json`, então reiniciar o programa no meio da live não perde nada.

## Estrutura

```
server.mjs          servidor: lê a live, roda o jogo e manda para a tela
config.json         configurações do jogo
src/jogo.mjs        regras (times, rodadas, pontos, ranking)
src/tiktok.mjs      conexão com o TikTok e leitura dos presentes (inclusive combos)
src/simulador.mjs   live falsa para testes
public/index.html   tela do jogo (1080x1920) + jogo.css + jogo.js
public/controle.html  painel de controle
test/               testes das regras (npm test)
```
