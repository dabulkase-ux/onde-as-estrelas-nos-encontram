# Quiz de Casal — implementação

## Atualização definitiva dos textos e feedbacks

Mantidas as dez perguntas, quarenta alternativas e respostas oficiais A, C, A, A, B, C, C, C, A, B. Adicionados exatamente os 23 feedbacks especiais aprovados. A seleção visual tem três estados discretos: correto, especial e padrão. Feedback especial não é considerado correto, não usa o erro genérico e não revela a alternativa oficial; qualquer escolha permite avançar.

Removidos os emojis dos dados, títulos, mensagens, botões e rótulos de acesso. As palavras e pontuação da carta e celebração permanecem. Os corações e estrelas gráficos (SVG/Three.js) e a mecânica do Não foram preservados. Nenhum arquivo de Compatibilidade, PIN, leitor, motor gráfico ou controles foi editado nesta atualização. Nos pontos de integração, somente os rótulos textuais de Casal foram alterados.

Arquivos modificados nesta atualização:
- src/experiences/couple/data.ts
- src/experiences/couple/logic.ts
- src/experiences/couple/CoupleQuiz.tsx
- src/experiences/couple/Invitation.tsx (apenas textos)
- src/experiences/couple/couple.css (estilos de feedback)
- src/experiences/couple/logic.test.ts
- tests/couple.spec.ts
- src/App.tsx (apenas rótulo de acesso)
- src/experiences/registry.ts (apenas título do destino)
- src/graphics/universeObjects.ts (apenas rótulo do destino)
- IMPLEMENTACAO-QUIZ-DE-CASAL.md

Validação desta atualização: build/TypeScript e lint passaram; 16 testes unitários passaram. O teste de interface de todas as 40 escolhas passou, verificando texto do feedback, tipo, ausência de revelação nas especiais e avanço em cada alternativa. A suíte completa isolada de 21 testes passou, em 8,8 minutos, incluindo Compatibilidade, entrada original, destinos 3D, quatro tamanhos de Casal, convite por mouse/toque, movimento reduzido/normal, carta/celebração e retorno. Os testes confirmaram ausência de emojis no conteúdo textual dos dados, interface, carta, convite e celebração.

Sem pendências funcionais identificadas. Mantém-se a limitação de validação em aparelhos físicos e Safari/iOS. A captura atual do encerramento em 320px foi inspecionada visualmente.

Foram corrigidas incompatibilidades das verificações novas com a tipagem Node ausente e com a regra de expressões regulares do ESLint. Não foi adicionada dependência. Vite/esbuild exigiram execução autorizada fora do sandbox por bloqueio de leitura de diretório.

## Integração

Segundo módulo independente em src/experiences/couple, registrado como couple em experiences/registry.ts. A galáxia ganhou um marcador Three.js e um botão acessível chamados “Quiz de Casal”. O raycaster existente encaminha a seleção para o novo módulo. Durante qualquer quiz, o motor usa a suspensão existente; ao sair, a câmera mantém a navegação e o foco retorna ao botão do destino.

Não foram editados os arquivos de src/experiences/compatibility, o PIN, o leitor, os textos da galáxia, package.json ou os testes anteriores. Não foram adicionadas dependências, backend, transmissão da escolha romântica, commit ou push. A pasta não possui metadados Git para comparação com um commit de referência.

## Arquivos criados

- src/experiences/couple/data.ts: perguntas tipadas, quatro alternativas A/B/C/D, respostas e feedbacks aprovados, carta e encerramento.
- src/experiences/couple/logic.ts: validação/armazenamento separado e posições seguras do botão fugitivo.
- src/experiences/couple/Invitation.tsx: convite e fuga por proximidade/toque.
- src/experiences/couple/CoupleQuiz.tsx: quiz, feedback, carta gradual, convite, celebração e revisitabilidade.
- src/experiences/couple/couple.css: estilos próprios e efeitos leves, responsividade, paisagem e movimento reduzido.
- src/experiences/couple/logic.test.ts: conteúdo estrutural, respostas aprovadas, persistência e posições.
- tests/couple.spec.ts: interface, teclado, toque, fuga, carta, retorno e destinos 3D.
- IMPLEMENTACAO-QUIZ-DE-CASAL.md: este relatório.

## Arquivos modificados

- src/App.tsx: carregamento lazy, acesso independente, fundo inerte e retorno com foco.
- src/graphics/Cosmos.tsx: novo callback para o destino de casal.
- src/graphics/engine.ts: novo callback no raycaster, sem alterar os controles de câmera.
- src/graphics/universeObjects.ts: marcador adicional, preservando os anteriores.
- src/experiences/registry.ts: registro do segundo módulo.

Build também atualiza dist/ e tsconfig.tsbuildinfo.

## Experiência

As dez perguntas mantêm alternativas e respostas aprovadas em ordem A/B/C/D. Uma resposta bloqueia novas tentativas naquela pergunta e apresenta feedback; avançar exige resposta. Não há pesos, placar ou porcentagem. Nas sete alternativas sem feedback especial, o feedback padrão carinhoso e a resposta prevista são mostrados. Nas 23 alternativas especiais, apenas a mensagem personalizada aprovada aparece. Refs evitam avanços duplicados por cliques repetidos.

Depois do feedback da décima pergunta, a última estrela revela o coração e o texto aprovado. A carta aparece por parágrafos a cada 2,2 segundos. “Mostrar a carta inteira” permite antecipar a leitura; com movimento reduzido, a carta inteira aparece diretamente. O convite nunca abre automaticamente: exige “Ainda tem uma última coisa…”.

O botão Não foge por proximidade de mouse (65px) e tentativa de toque. As posições variam em uma área reservada que fica separada do Sim. A posição vertical respeita a interseção visível da área com o viewport. A detecção de proximidade usa um listener de ponteiro durante o convite, removido ao sair, inclusive quando o mouse se aproxima pela borda externa da área. A transição é curta e suave; um intervalo mínimo limita os disparos. O Sim não muda de posição. Com foco de teclado ou movimento reduzido, Não não foge; uma mensagem neutra lembra que é possível continuar explorando. Não há encerramento de recusa nem obrigação de aceitar. O botão de retorno e Escape estão disponíveis.

Ao clicar em Sim, os botões saem do DOM, os pontos de luz se aproximam e um coração aparece, reutilizando QuizVisuals sem editar seu código. Os textos aprovados celebram a escolha. Após 3,2 segundos aparece “Explorar nosso universo”; com movimento reduzido, aparece diretamente. Fechar cancela timers, e os efeitos CSS desaparecem junto com o componente. Não foi criado outro contexto WebGL nem outro loop de partículas.

## Persistência e revisita

Chave própria: meu-universo.couple.v1. Salva apenas respostas do quiz e sua conclusão; não salva nem transmite a aceitação do convite. A chave meu-universo.compatibility.v1 não é alterada. Respostas inválidas e sequências com lacunas são tratadas com segurança. Falha de armazenamento permite continuar a visita com aviso.

Ao reabrir um quiz concluído, é possível reler a declaração ou iniciar o Quiz de Casal novamente. Uma visita incompleta retoma a próxima pergunta. A galáxia permanece acessível em todas as etapas.

## Verificação da implementação inicial

- Build e TypeScript: passaram.
- Lint: passou.
- Vitest: 13 testes passaram (4 novos e 9 anteriores).
- Playwright: 20 testes passaram na suíte completa isolada (8,2 minutos). Inclui 8 testes novos de Casal e 12 testes anteriores: quatro tamanhos, feedback correto/incorreto, teclado, persistência/reinício/releitura, toque, proximidade/paisagem, movimento reduzido/normal, carta gradual, celebração/cancelamento, seleção dos dois destinos 3D, Compatibilidade, PIN/digital e fallback sem WebGL. Uma falha intermediária de detecção do mouse pela borda externa foi corrigida e validada novamente nesta suíte.
- Inspeção visual realizada nas capturas de pergunta e celebração em 320px e convite em paisagem: conteúdo legível, com rolagem para textos longos; convite com Sim estável e Não em área visível.

Build/Vitest precisaram da execução autorizada fora do sandbox por bloqueio de leitura do esbuild.

## Roteiro manual

1. Execute npm run dev, percorra o PIN e o leitor existentes até a galáxia.
2. Abra “Quiz de Casal” pelo botão ou pela estrela 3D.
3. Experimente acerto e erro; leia o feedback e avance nas dez perguntas.
4. Abra a carta e confira sua revelação gradual ou use “Mostrar a carta inteira”.
5. Clique em “Ainda tem uma última coisa…”; aproxime o mouse de Não ou tente tocá-lo. Confira que Sim permanece estável.
6. Use Tab e Enter para navegar, Escape ou “Voltar ao nosso universo” para sair sem aceitar.
7. Clique em Sim e aguarde a celebração; use “Explorar nosso universo”.
8. Reabra para reler ou reiniciar, recarregue e confira que a conclusão foi mantida.
9. Confira também o Quiz de Compatibilidade, 320/390/430px, desktop/paisagem e movimento reduzido.

## Limites

Celular/toque são emulados no Microsoft Edge pelo Playwright, sem validação em aparelho físico ou Safari/iOS. As animações são SVG/CSS leves; não há simulação física adicional no Three.js. Não houve medição prolongada de memória em dispositivo físico.





