# Anúncios – resumo da entrega

**Narração por baixo da legenda** com voz neural offline (Piper pt-BR via sherpa-onnx, modelos baixados do
GitHub em `modelos/`), porque o edge-tts (speech.platform.bing.com) e o Hugging Face estão bloqueados pela rede
deste ambiente. As vozes femininas pedidas (Francisca, Thalita) não existem nesse modelo aberto: A e C usam a
voz **Faber**, B usa **Cadu** (masculinas). Números por extenso na fala; legenda sincronizada com a voz;
trilha e efeitos gerados por código com ducking sob a voz; mix final em −16 LUFS.
Conferência da fala com Whisper base (sherpa-onnx) no áudio final: ver `saida/qa/relatorio-qa.md`.

| Anúncio | Referência | Gancho | Voz | Duração | Assets usados |
| --- | --- | --- | --- | --- | --- |
| A | REF 1 (confissão → aqui "resultado primeiro") | "Esse carro de corrida era uma caixa de sapato." | Faber | 25,0 s | Páginas 001, 011, 091, capa, "Antes de começar", capas das categorias 1, 5, 8, 9, 10; ilustração de caixas; trilha própria |
| B | REF 2 (telas) | "Me empresta o celular? Hoje não. Ideia pra hoje à tarde, sem tela" | Cadu | 20,9 s | Ilustrações de celular e caixas; páginas 102, 101, 081; capa + páginas em leque; trilha própria |
| C | REF 3 ("olha que ideia" + objeção) | "Carro, foguete, castelo, dinossauro… tudo de papelão." | Faber | 23,7 s | 12 capas de categoria; página 041; capa; checklist e certificado; trilha própria |

Ajustes de texto para a voz ser entendida (testados com Whisper): "Toca em Saiba mais" → **"Toque no botão Saiba mais"**;
"Esse guia ensina" → **"O guia ensina"**; "robô" → **"um robô"** na lista de categorias.

Arquivos em `saida/`: `A_9x16.mp4`, `A_4x5.mp4`, `B_9x16.mp4`, `B_4x5.mp4`, `C_9x16.mp4`, `C_4x5.mp4` + `*_thumb.jpg`.
Controle de qualidade em `saida/qa/` (contact sheets e `relatorio-qa.md` com ffprobe, loudness, transcrição e pHash).

## Para ficar melhor
1. **Fotos ou vídeos das peças prontas** (maior impacto): 001 Carro, 011 Foguete, 091 Fogãozinho (A);
   102 Pista, 101 Labirinto, 081 Robô (B); 041 Castelo (C). Coloque em `meus_assets/imagens/NNN.png` e rode
   `python anuncios.py` de novo: as cenas trocam sozinhas para a foto.
2. **Voz feminina / mais natural**: liberar `speech.platform.bing.com` (edge-tts com Francisca e Thalita), ou gravar a
   locução no celular. Com `huggingface.co` liberado, dá para usar o Whisper maior para conferir a fala.
3. **Música**: um arquivo livre de direitos em `meus_assets/musica/` substitui a trilha gerada.

Comandos: `python anuncios.py [A|B|C] [9x16|4x5]` e `python qa_anuncios.py`.
