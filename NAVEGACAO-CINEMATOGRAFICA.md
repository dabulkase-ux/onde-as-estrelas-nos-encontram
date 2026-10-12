# Navegação cinematográfica dos quizzes

A galáxia e os dois quizzes usam a mesma cena e a mesma câmera Three.js. Nenhum dado de perguntas, respostas, feedbacks ou declarações foi alterado.

## Arquitetura

- `src/App.tsx`: coordena `GALAXY_IDLE`, `TRAVEL_TO_DESTINATION`, `QUIZ_ACTIVE` e `RETURN_TO_GALAXY`. Só monta o quiz após chegar. Bloqueia a navegação concorrente, oferece pular animação e restaura o foco após o retorno.
- `src/graphics/Cosmos.tsx`: transmite o comando ao motor e acorda o loop existente. Sem WebGL, oferece uma transição curta de 450 ms, cancelável, em vez de tentar uma câmera 3D. Movimento reduzido e pular completam imediatamente esse fallback.
- `src/graphics/travel.ts`: calcula uma curva Catmull–Rom com recuo, desvio lateral, aproximação e chegada. Interpola a orientação; conserva o campo de visão. Vetores e matriz de amostragem são reutilizados. O retorno amostra a mesma rota ao contrário.
- `src/graphics/engine.ts`: executa a viagem no RAF existente, em 5,2 segundos de tempo visível. Salva posição, quaternion e parâmetros atuais/alvos do controle orbital. No retorno restaura esses valores, limpando gestos transitórios. A suspensão do quiz não impede a viagem. Não cria cena, renderer ou partículas adicionais.
- Os botões de saída superiores existentes foram transformados em “Voltar à galáxia”. Todos os outros encerramentos continuam chamando a mesma saída, agora ligada ao percurso de volta. Os cabeçalhos ficam fixos dentro da área rolável dos quizzes.

## Destinos existentes reutilizados

- Compatibilidade: `[0, 2.7, 2]`, luz azul, desvio lateral positivo.
- Quiz de Casal: `[-2.8, 2.5, 3.5]`, luz dourada, desvio lateral negativo.

A estrela selecionada fica estável durante o trajeto e cresce em brilho/tamanho na aproximação. A navegação manual é bloqueada durante a viagem e enquanto o quiz está ativo. O brilho e o tamanho normais são restaurados ao voltar. A curva conserva a pose original mesmo quando a entrada acontece após girar/aproximar a galáxia.

A aproximação corrige gradualmente a mira quando o canvas existente é mais alto que a janela, centralizando a estrela na área visível também em paisagem. A câmera original continua sendo restaurada exatamente; o campo de visão não é alterado.

## Acessibilidade e cancelamento

“Pular animação” recebe foco durante os percursos. Movimento reduzido usa diretamente os mesmos estados finais. O quiz conserva seu gerenciamento de foco e Escape. Ao retornar, o foco vai ao botão correspondente na galáxia, após a remoção de `inert`. Os timers do fallback e de foco são cancelados no cleanup; o RAF e os recursos do motor usam a rotina de descarte existente. Cliques repetidos não iniciam trajetos concorrentes.

## Verificação manual

1. Entrar pelo PIN e leitor já existentes; girar e aproximar a galáxia.
2. Abrir cada quiz pelo botão e pela estrela: observar recuo, percurso, aproximação e brilho.
3. Usar “Voltar à galáxia” e conferir a mesma vista anterior e controles funcionais.
4. Repetir pulando a ida e a volta; repetir com movimento reduzido.
5. Percorrer os encerramentos: resultado e revelação da compatibilidade; carta, convite, botão “Não” e celebração do casal. As saídas finais também devem percorrer a viagem de volta.
6. Verificar celular físico, paisagem e aparelho com GPU modesta. A emulação automatizada não substitui a avaliação do desempenho e conforto visual no dispositivo real.

## Arquivos da implementação

Criados: `src/graphics/travel.ts`, `src/graphics/travel.test.ts`, `tests/travel.spec.ts` e este relatório.

Modificados: `src/App.tsx`, `src/graphics/Cosmos.tsx`, `src/graphics/engine.ts`, `src/styles.css`, `src/experiences/compatibility/CompatibilityQuiz.tsx`, `src/experiences/couple/CoupleQuiz.tsx`, `tests/compatibility.spec.ts`, `tests/couple.spec.ts` e `playwright.config.ts`. Os tempos de espera E2E foram adequados à duração intencional das viagens. O build também regenerou `dist` e o cache do TypeScript.

## Validação realizada

- `npm test`: 19 testes unitários aprovados, incluindo continuidade da curva, restauração exata, pular até os endpoints e centralização na janela em paisagem.
- `npm run lint` e `npm run build`: aprovados; o build inclui `tsc -b`.
- Os 21 testes E2E anteriores passaram, incluindo PIN/digital, dois quizzes completos, todas as 40 escolhas e 23 feedbacks especiais, carta, convite, toque, botão “Não”, celebração, replay, armazenamento e fallback sem WebGL.
- Reexecução final de `npm run test:e2e -- tests/travel.spec.ts`: 5 testes aprovados em 320, 390, 430, 844×390 e 1440 px. Verificam ambos os destinos, repetição de cliques, entrada/retorno, pular, teclado/toque, mudança para movimento reduzido durante o percurso, projeção da estrela no centro visível, igualdade da posição/quaternion restaurados, foco e controles operacionais após voltar.
- Uma asserção inicial esperava observar o estado intermediário de retorno em movimento reduzido. Foi corrigida para verificar a conclusão imediata e a pose final, que são o comportamento desejado. A reexecução dos cinco testes de viagem passou.
- Capturas dos quizzes e dos percursos foram inspecionadas visualmente. A centralização foi ajustada após a revisão em paisagem.

Não houve commit, push ou deploy. A pasta não contém `.git`, portanto não havia histórico/diff Git disponível. Permanece pendente apenas a avaliação de fluidez e conforto visual em dispositivos físicos, especialmente aparelhos com GPU modesta. Sem WebGL, o fallback oferece a navegação por fade curto, sem simular uma viagem 3D inexistente.
