# Quiz de Compatibilidade — relatório de implementação

## Arquitetura e escopo

O App mantém o fluxo de atos existente (cadeado, narrativa, leitor, reconhecimento, formação e universo). Cosmos encapsula engine.ts e o fallback Canvas2D. Os marcadores de universeObjects usam o raycaster existente; a câmera mantém seus controles de arraste e zoom. O registro de experiências antes vazio agora contém Compatibilidade. Não há backend. A pasta não possui repositório Git, portanto não foi possível comparar os arquivos com um commit de referência.

PIN, configurações de aniversários, biometria, textos da galáxia e marcadores existentes não foram alterados.

## Arquivos criados

- src/experiences/compatibility/data.ts — perguntas, alternativas, pesos e declarações exatas.
- src/experiences/compatibility/logic.ts — embaralhamento, pontuação e armazenamento validado/versionado.
- src/experiences/compatibility/CompatibilityQuiz.tsx — navegação, revisão, revelações e repetição.
- src/experiences/compatibility/QuizVisuals.tsx — estrelas, anel, galáxias e coração em SVG leve.
- src/experiences/compatibility/quiz.css — interface responsiva, transições e movimento reduzido.
- src/experiences/compatibility/logic.test.ts — testes de pontuação, embaralhamento e armazenamento.
- tests/compatibility.spec.ts — testes de navegador do quiz, teclado, toque e persistência.
- IMPLEMENTACAO-COMPATIBILIDADE.md — este relatório.

## Arquivos modificados

- src/App.tsx — abertura sob demanda, entrada acessível e retorno com restauração do foco.
- src/graphics/Cosmos.tsx — comunicação do estado do quiz com o motor.
- src/graphics/engine.ts — seleção do novo marcador, desaceleração/pausa e coração de conclusão com descarte de geometria e material.
- src/graphics/FallbackCanvas.tsx — pausa do desenho quando o quiz está aberto.
- src/graphics/universeObjects.ts — novo marcador, preservando os anteriores.
- src/experiences/registry.ts — registro do módulo independente.
- tests/experience.spec.ts — testes antigos passam a usar PIN e mensagem da configuração atual (antes tinham dados fixos desatualizados).

Build também atualiza dist/ e tsconfig.tsbuildinfo.

## Funcionalidades

Dez perguntas exatas; alternativas embaralhadas com identidade e pesos mantidos; perguntas anteriores editáveis; percentual verdadeiro entre 25% e 100%, em incrementos de 2,5%. A multiplicação antes da divisão é matematicamente equivalente à fórmula pedida e evita dígitos residuais de ponto flutuante. Sem respostas certas ou erradas e com explicação da afinidade de preferências.

Revelação em atos controlados por botões, sem espera obrigatória. Declaração inicial progressiva; frases secretas em sequência com avanço automático de 4,8 segundos em movimento normal e avanço manual sempre disponível. Duas galáxias se unem em coração; frase final original em destaque. Com movimento reduzido, os efeitos são estáticos e as frases secretas avançam manualmente.

Respostas parciais e conclusão ficam em localStorage (meu-universo.compatibility.v1). Dados inválidos são descartados. Se o navegador negar armazenamento, a visita continua com aviso. Reabrir após concluir leva diretamente à declaração; reinício exclusivo do quiz fica separado do reinício do universo. Escape e botão de fechar permitem retornar. O coração de conclusão permanece na cena WebGL e no acesso equivalente de interface.

Os efeitos do quiz usam SVG/CSS, sem um segundo contexto WebGL. O motor desacelera em 700 ms antes de suspender o loop, preservando a posição da câmera, e retoma ao sair. Timers, listeners e novos recursos Three.js têm limpeza explícita.

## Validação

- npm run build: passou, incluindo TypeScript.
- npm run lint: passou.
- npm test: 9 testes passaram; extremos de 25% e 100%, intermediário 62,5%, todos os totais possíveis, embaralhamento e integridade dos pesos, dados inválidos e armazenamento indisponível.
- npm run test:e2e: 12 testes passaram na execução final isolada (3,7 minutos). Inclui quiz em 320/390/430/1440px, movimento normal e reduzido, teclado, toque emulado, revisão, retorno, repetição, reinício, persistência após recarregar, fallback sem WebGL e regressões do percurso original e layouts 320/360/390/430/1440px.
- Inspeção visual de captura em 320px: declaração final legível, sem textos da galáxia sobrepostos, botões acessíveis por rolagem.

Build e Vitest precisaram rodar fora do sandbox porque esbuild teve leitura de diretório negada. Uma execução intermediária de Playwright teve conflito de arquivos de trace por concorrência entre duas suítes; a validação final isolada terminou sem falhas.

## Limites da validação

Celular e toque são emulados no Microsoft Edge/Playwright; não houve teste em aparelho físico. O fluxo de acesso pelo botão foi testado automaticamente; a seleção do sprite 3D pelo raycaster não tem teste automatizado específico. A estética usa efeitos SVG sobrepostos à cena; não adiciona uma simulação física de galáxias.

## Teste manual

1. Execute npm run dev e abra o endereço mostrado pelo Vite.
2. Percorra o PIN configurado e o leitor já existentes até a galáxia.
3. Clique em Compatibilidade, use Tab/Enter no botão de acesso ou selecione a nova estrela 3D.
4. Escolha alternativas, use Voltar para revisar e conclua a pergunta 10.
5. Avance pelo percentual, declaração inicial, botão “E se eu pudesse escolher de novo?” e revelação final.
6. Clique em “Voltar ao nosso universo”; verifique o coração e a câmera preservada.
7. Reabra para rever a declaração; recarregue a página e percorra a entrada novamente para conferir persistência.
8. Use “Reiniciar apenas o quiz” para responder novamente sem reiniciar o universo.
9. Confira 320px, 390px, 430px e desktop, e ative movimento reduzido no sistema ou nas ferramentas do navegador.

