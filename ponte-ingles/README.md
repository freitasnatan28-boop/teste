# Ponte · Inglês fluente em 26 semanas

App de uma página (`index.html`) para aprender inglês com o **Prof. Natan**.

- Teste de nivelamento ou escolha manual: Iniciante (A1), Amador (A2), Intermediário (B1), Profissional (B2), Avançado (C1)
- Plano de 6 meses (26 semanas) com um tema por semana e nível que sobe junto com o aluno
- Aula guiada: explicação em português, flashcards com áudio, exercícios (múltipla escolha, completar, montar frase) e shadowing
- Revisão espaçada (caixas de Leitner: 1, 3, 7, 16, 35 dias)
- Aba Falar: desafio de pronúncia (ditado do teclado + comparação palavra por palavra), speaking de 1 minuto com feedback e os 8 sons que brasileiros mais erram
- Conversa com o professor: tirar dúvidas em português, role-plays (entrevista, restaurante, aeroporto, reunião, correção de texto), com correções em português
- Progresso, XP e sequência de dias salvos no navegador

O professor com IA e as aulas personalizadas funcionam quando o app é aberto como Artifact no Claude.
Fora dele, a biblioteca de aulas prontas, a revisão e o áudio continuam funcionando.

## Hospedar como site

Rode `./build-site.sh`. Ele gera a pasta `site/` (página, ícones e manifest para instalar no celular).
Publique essa pasta em qualquer hospedagem estática (Netlify Drop, Vercel, GitHub Pages).
Fora do Claude, o professor com IA fica desligado; aulas, revisão, treino de sons e áudio funcionam.
