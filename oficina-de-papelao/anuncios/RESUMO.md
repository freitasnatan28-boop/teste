# Anúncios – resumo da entrega

Versão **sem locução**: o gerador de voz (edge-tts → speech.platform.bing.com) e os modelos do Whisper
(huggingface.co) estão bloqueados pela rede deste ambiente. O texto do roteiro aparece como legenda
palavra por palavra; áudio = trilha e efeitos gerados por código (sem direitos de terceiros), em −16 LUFS.

| Anúncio | Referência | Gancho | Voz | Duração | Assets usados |
| --- | --- | --- | --- | --- | --- |
| A | REF 1 (confissão → aqui "resultado primeiro") | "Esse carro de corrida era uma caixa de sapato." | — (legenda) | 23,5 s | Páginas 001, 011, 091, capa, "Antes de começar", capas das categorias 1, 5, 8, 9, 10; ilustração de caixas; trilha própria |
| B | REF 2 (telas) | "Me empresta o celular? Hoje não. Ideia pra hoje à tarde, sem tela" | — (legenda) | 20,5 s | Ilustrações de celular e caixas; páginas 102, 101, 081; capa + páginas em leque; trilha própria |
| C | REF 3 ("olha que ideia" + objeção) | "Carro, foguete, castelo, dinossauro… tudo de papelão." | — (legenda) | 23,5 s | 12 capas de categoria; página 041; capa; checklist e certificado; trilha própria |

Arquivos em `saida/`: `A_9x16.mp4`, `A_4x5.mp4`, `B_9x16.mp4`, `B_4x5.mp4`, `C_9x16.mp4`, `C_4x5.mp4` + `*_thumb.jpg`.
Controle de qualidade em `saida/qa/` (contact sheets e `relatorio-qa.md` com ffprobe, loudness e pHash).

## Para ficar melhor
1. **Fotos ou vídeos das peças prontas** (maior impacto): 001 Carro, 011 Foguete, 091 Fogãozinho (A);
   102 Pista, 101 Labirinto, 081 Robô (B); 041 Castelo (C). Coloque em `meus_assets/imagens/NNN.png` e rode
   `python anuncios.py` de novo: as cenas trocam sozinhas para a foto.
2. **Locução**: liberar `speech.platform.bing.com`, `huggingface.co` e `cdn-lfs.huggingface.co`, ou gravar a voz no
   celular e colocar em `meus_assets/`.
3. **Música**: um arquivo livre de direitos em `meus_assets/musica/` substitui a trilha gerada.

Comandos: `python anuncios.py [A|B|C] [9x16|4x5]` e `python qa_anuncios.py`.
