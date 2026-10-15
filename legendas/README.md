# legendar.py — legendas dinâmicas estilo Edits/Reels

Transcreve o vídeo com Whisper (local), monta legendas de 1 a 4 palavras com a
palavra falada destacada em amarelo e um "pop" a cada palavra, e grava a
legenda no vídeo, mantendo resolução, fps e qualidade.

## Instalação (uma vez)

1. **FFmpeg** instalado e no PATH (`ffmpeg -version` precisa funcionar).
2. **Python 3.9+** e as dependências:

   ```bash
   pip install -r requirements.txt
   ```

Na primeira execução o script baixa sozinho o modelo do Whisper (~3 GB no
`large-v3`, ~1,5 GB no `medium`) e a fonte Montserrat ExtraBold.
Se você tiver uma placa NVIDIA, a transcrição usa a GPU automaticamente; sem
GPU ela roda na CPU (bem mais devagar, mas funciona).

## Uso

```bash
python legendar.py caminho/do/video.mp4            # gera tudo direto
python legendar.py caminho/do/video.mp4 --revisar  # pausa para você editar o texto
```

Para o vídeo `A17_-_14-10.mp4`, o script gera:

| Arquivo | O que é |
|---|---|
| `A17_-_14-10_legendado.mp4` | vídeo final com a legenda gravada |
| `A17_-_14-10.ass` | legenda animada (dá para abrir no Aegisub ou no VLC) |
| `A17_-_14-10.srt` | legenda simples, como backup |
| `A17_-_14-10_trabalho/` | transcrição e texto revisado (`revisao.txt`) |

### Revisando o texto

Com `--revisar`, o texto aparece no terminal e abre no seu editor (`$EDITOR`;
no Windows, o Bloco de Notas). Sem editor configurado, edite
`*_trabalho/revisao.txt`, salve e aperte ENTER.

- Corrija à vontade: palavras, acentos, pontuação. Também pode juntar, separar,
  incluir ou apagar palavras. O script realinha os tempos sozinho.
- **Cada linha fecha um bloco.** Quebre a linha onde quiser forçar uma troca de tela.
- A revisão fica salva. Rodar de novo reaproveita a transcrição e o texto revisado,
  sem chamar o Whisper outra vez.

Outras opções:

- `--so-legenda`: gera só `.ass`/`.srt`, sem gravar o vídeo
- `--nova-revisao`: descarta o texto revisado e recomeça do texto do Whisper
- `--retranscrever`: roda o Whisper de novo
- `--saida arquivo.mp4`: muda o nome do vídeo final

### Glossário

O `glossario.txt` é aplicado automaticamente em toda transcrição:

```
taro => Tarô        # troca o que o Whisper erra pelo certo
Tia Fifi            # só vocabulário: ajuda o Whisper a reconhecer o termo
```

Sempre que corrigir na revisão algo que vai se repetir (nome próprio, gíria,
termo do nicho), anote no glossário.

## Personalizando o estilo

Tudo fica no bloco **CONFIGURAÇÃO** no topo do `legendar.py`:

- **Fonte:** `FONTE_ARQUIVO`, `FONTE_NOME`, `TAMANHO_FONTE`, `CAIXA_ALTA`
- **Cores:** `COR_TEXTO`, `COR_DESTAQUE` (amarelo), `COR_CONTORNO`, `CONTORNO`, `SOMBRA`
- **Blocos:** `MIN_PALAVRAS`/`MAX_PALAVRAS`, `MAX_CARACTERES_LINHA`, `PAUSA_NOVO_BLOCO`
- **Animação:** `POP_ESCALA`, `POP_DURACAO_MS`, `ENTRADA_BLOCO_ESCALA`
- **Posição:** `POSICAO_VERTICAL` (0,64 = terço inferior) e as margens seguras do Reels
- **Qualidade:** `CRF` (16 por padrão; quanto menor, melhor) e `PRESET`
- **Whisper:** `MODELO_WHISPER` (`large-v3` erra menos; `medium` é mais rápido)

Os tamanhos estão em px para um vídeo de 1080 de largura e se ajustam
sozinhos a outras resoluções.
