# Reforma do Jardim Eterno

A reforma trabalha somente na cópia integrada em `public/jardim-eterno/`. O portal 3D, sua transição, Supabase, quizzes e a pasta original `Jardim Eterno` não foram modificados.

## Fluxo

1. Terminal com diálogo roteirizado entre NEXUS e ARTHUR.
2. Abertura de `canada.txt` pelo botão dentro do terminal.
3. Ao fechar, conversa sobre iluminação e interação original com a corda.
4. Jardim principal: rosa curiosa, tulipa companheira, lírio tímido, mudança de cor, vagalumes e flores companheiras. Todas são opcionais; o controle de encerramento já está disponível.
5. Encerramento interrompido: `convencido.txt`, conversa de retomada e `pra ela.txt`.
6. Última conversa, animação CRT original e florescimento de sete lírios azuis com caules e alturas independentes.
7. Três frases finais, retorno ao jardim ou ao universo.

O terminal aceita toque no painel e os botões “Concluir fala” e “Continuar”, também acessíveis por teclado. Nenhuma fala avança sozinha; os três arquivos dependem de abertura manual. As cartas mantêm leitura completa e rolagem; Escape ou “fechar arquivo” continua a narrativa. Movimento reduzido mantém todas as etapas e reduz as animações. Cliques repetidos no fechamento são ignorados durante a transição.

## Arquivos e integração

- `index.html`, `styles.css`, `app.js`, `garden.js` e `config.js`: adaptação dos recursos existentes.
- `narrative.js`: diálogos determinísticos e textos para execução no iframe de origem opaca, sem pedidos a APIs.
- `canada.txt`, `convencido.txt` e `pra ela.txt`: textos aprovados completos. O teste de integridade compara cada conteúdo apresentado com estes arquivos e verifica hashes do conteúdo com quebras LF.
- `src/experiences/garden/GardenExperience.tsx`: escuta apenas mensagens do próprio iframe. O botão interno envia `garden:exit` e chama o mesmo `onExit` existente; não há outro redirecionamento nem alteração no sandbox.
- `src/experiences/garden/narrative.test.js`, `tests/garden-narrative.spec.ts` e `tests/garden.spec.ts`: integridade, narrativa e integração.
- `tests/wishes.spec.ts` e `tests/letters.spec.ts`: sincronização do relógio simulado e espera da restauração do foco antes da próxima interação, sem alterações nas experiências.

## Verificação manual

Execute `npm run dev`, passe pelo PIN e leitor visual, encontre o portal e aceite entrar. Confira a ordem acima. Leia e role cada arquivo; use Escape e o botão de fechamento. Puxe a corda com mouse/toque ou use Enter/Space. Experimente as flores sem obrigação de descobrir todas. Encerre, confira o CRT e os sete lírios; teste os dois retornos e uma nova entrada no portal.

Confira também telas de 320, 390 e 430 px, paisagem, teclado e a preferência de movimento reduzido. Os testes de navegador usam Edge/Playwright; não substituem a verificação em um celular físico.

## Comandos de validação

```text
npm test
npm run lint
npm run build
npx playwright test tests/garden-narrative.spec.ts tests/garden.spec.ts
npx playwright test tests/compatibility.spec.ts tests/couple.spec.ts tests/letters.spec.ts tests/travel.spec.ts tests/experience.spec.ts
```

O build inclui TypeScript. Os scripts públicos também são verificados com `node --check`. Não há deploy nem alteração de configuração remota nesta reforma.

## Refinamento do terminal NEXUS

O terminal mantém o histórico da conversa atual. A digitação usa 55 ms por caractere, com 220 ms adicionais nas vírgulas e 420 ms nos pontos/interrogações. A leitura não expira: a visitante decide quando continuar. Durante a digitação, a primeira interação conclui apenas a fala atual; depois, `Continuar` inicia a próxima. Enter/Space funcionam no botão focado, e interações repetidas são filtradas.

As três interrupções existentes usam congelamento, tremida pequena e pulsos localizados, seguidos da recuperação do verde. Em movimento reduzido, a linha de erro muda suavemente de cor, sem tremida ou flashes. O relógio original controla e cancela todas as pausas.

Cada arquivo aguarda seu botão `[ Abrir nome.txt ]`, sem abertura automática. O botão preserva o foco e a aparência do terminal. Um clique duplo de abertura não fecha acidentalmente o arquivo recém-aberto.

Os conteúdos das cartas, diálogos, portal e integração por iframe permanecem preservados. Para testar: avance algumas falas, complete uma durante a digitação, aguarde sem tocar, abra manualmente cada arquivo e percorra até os dois retornos. Confira também teclado, movimento reduzido e telas estreitas.

Verificações deste refinamento: lint aprovado; 47 testes unitários em 9 arquivos aprovados; TypeScript/build de produção e `node --check public/jardim-eterno/app.js` aprovados. Os testes de integridade verificam os hashes dos três textos e que as falhas narrativas ocorrem apenas nas três interrupções previstas. A captura do terminal em 320 x 568 foi inspecionada: texto e botão visíveis, sem rolagem horizontal.

E2E: os 12 cenários relevantes de terminal/jardim/portal tiveram execução aprovada, incluindo 320/390/430 px, paisagem, desktop, teclado, movimento reduzido, abertura manual dos três arquivos, proteção contra clique duplo, recuperação das cores, CRT/lírios e restauração da câmera/foco. A execução conjunta teve 11 aprovações e um timeout no percurso desktop completo (limite anterior de 120 segundos); esse cenário passou na reexecução isolada com 180 segundos. O cenário de teclado também passou novamente com as verificações adicionais de layout e captura em 320 px. Não foi uma única execução conjunta sem falhas.

Pendente: validação em dispositivo físico e leitor de tela real. Não houve commit, deploy ou alteração de Supabase/quizzes/portal.

## Resultados da reforma anterior (antes do refinamento NEXUS)

- `npm run lint`: aprovado.
- `npm test`: 46 testes aprovados em 9 arquivos, incluindo integridade das três cartas.
- `npm run build`: TypeScript e build de produção aprovados.
- `node --check`: scripts `app.js`, `garden.js` e `narrative.js` aprovados.
- Jardim e portal: 10 cenários E2E aprovados, incluindo 320/390/430 px, 320 x 568 dentro do iframe, desktop, paisagem, toque na corda e flores, teclado, movimento reduzido, ordem das cartas, fechamento repetido, CRT, sete lírios, retorno e reentrada.
- Regressões gerais: os 35 cenários tiveram execução aprovada. A execução conjunta inicial teve 32 aprovados e 3 falhas: carregamento do teste dos 40 feedbacks, foco após o primeiro fechamento de carta em 320 px e timeout do cenário longo de cartas em 390 px. O caso dos feedbacks passou isoladamente sem alteração no quiz; após a espera de retorno/foco, os 7 testes de cartas passaram na reexecução.
- Painel administrativo: 11 cenários E2E aprovados, com dados e endpoints simulados.
- Desejos: 4 cenários E2E aprovados após sincronizar explicitamente o relógio simulado da formação inicial. Nenhum envio foi realizado ao Supabase remoto.

Total: 60 cenários E2E com execução aprovada entre suítes focadas e reexecuções; não foi uma única execução conjunta sem falhas. Os detalhes acima preservam essa distinção.

As capturas do encerramento em 320 px, no iframe em 320 x 568, desktop e paisagem foram inspecionadas visualmente, assim como a carta longa e o jardim interativo em 320 px. Continua pendente a verificação em dispositivo físico e com leitor de tela real. Não foi feito benchmark de FPS ou teste instrumental de memória.
