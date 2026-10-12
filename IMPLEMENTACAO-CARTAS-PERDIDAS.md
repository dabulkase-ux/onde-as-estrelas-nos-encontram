# Cartas perdidas pelo universo

## Escopo e integração

Seis envelopes opcionais foram adicionados ao cadastro existente de objetos da galáxia. Podem ser abertos em qualquer ordem, permanecem disponíveis para releitura e usam a mesma cena, câmera, raycaster, loop de renderização e percurso reversível das viagens já existentes.

Não foram alterados PIN, biometria, textos existentes, perguntas, respostas, 23 feedbacks especiais, resultados, carta do casal, convite ou botão “Não”. Não foram adicionados dependências, backend, envio de dados, commit ou deploy.

A pasta não contém `.git`; a implementação foi inspecionada diretamente e as edições foram restritas ao módulo novo e aos pontos de integração.

## Cartas e posições

| Objeto | Título | Posição 3D |
| --- | --- | --- |
| letter-1 | A carta que eu nunca enviei | -4.5, 3.4, 1 |
| letter-2 | Um pequeno defeito meu | 4, -2.5, 4.2 |
| letter-3 | Seus olhos | 1.5, 3.8, -2 |
| letter-4 | Cinco minutos a mais | -3.8, -3.2, -1.6 |
| letter-5 | Se o futuro me permitir | 5.6, 0.8, -1.2 |
| letter-6 | Se você encontrou esta carta... | -0.8, -1.2, -7.4 |

As posições são afastadas das estrelas dos quizzes, objetos, palavras, flores e coração existentes. A galáxia pode ser girada e aproximada para encontrar cada envelope. Dois mapas pequenos de textura são compartilhados pelos seis sprites: envelope selado em champanhe e envelope aberto em azul discreto, indicando leitura.

## Navegação e leitura

- A máquina de navegação foi ampliada com `LETTER_ACTIVE`, mantendo os estados dos quizzes.
- A viagem da carta dura 3,6 segundos; “Pular animação” e movimento reduzido usam os mesmos endpoints. Posição, quaternion e parâmetros atuais/alvos do controle orbital são preservados na ida e restaurados na volta.
- Os alvos HTML acompanham a projeção dos envelopes 3D e oferecem áreas de toque de 44 px. Os envelopes continuam sendo selecionáveis pelo raycaster. Para teclado, os seis títulos são alcançáveis com Tab; um alvo fora da vista ganha um indicador apenas quando recebe foco, sem criar um menu permanente.
- A leitura abre um diálogo com foco inicial no título, navegação de foco contida, Escape e “Fechar carta”. A folha tem rolagem própria, cabeçalho fixo e parágrafos revelados a cada 2,4 segundos. “Mostrar carta inteira” conclui a revelação imediatamente. Movimento reduzido mostra o texto completo.
- A leitura habilita rolagem nativa por toque sem movimentar a câmera. Ao sair, a folha recolhe, a câmera volta e o foco retorna ao envelope.
- As viagens reutilizam o controlador existente. Os timers de leitura ficam restritos ao diálogo. As texturas novas são descartadas com o motor, e timers de revelação/fechamento são cancelados ao sair. Cliques repetidos não criam viagens concorrentes.
- Com movimento reduzido, a exploração manual acorda o motor até os controles estabilizarem e volta a pausá-lo. As restrições e sensibilidades existentes não foram alteradas.

## Progresso

Chave independente: `meu-universo.lost-letters.v1`.

Formato: `{"version":1,"read":["letter-6","letter-2"]}`.

Uma carta é marcada após a chegada e abertura. Os IDs são validados e deduplicados; versões desconhecidas ou dados inválidos são tratados com segurança. Se o armazenamento falhar, o estado continua em memória durante a sessão. As chaves dos quizzes não são escritas por esse módulo.

Sem WebGL, os seis envelopes continuam disponíveis como objetos espaciais no fallback, com uma transição curta e a mesma interface acessível de leitura. Não há uma viagem 3D nesse modo.

## Arquivos

Criados:

- `src/experiences/letters/data.ts`
- `src/experiences/letters/progress.ts`
- `src/experiences/letters/LetterTargets.tsx`
- `src/experiences/letters/LetterReader.tsx`
- `src/experiences/letters/letters.css`
- `src/experiences/letters/letters.test.ts`
- `src/graphics/envelopeTexture.ts`
- `tests/letters.spec.ts`
- Este relatório.

Modificados: `src/App.tsx`, `src/graphics/Cosmos.tsx`, `src/graphics/engine.ts`, `src/graphics/travel.ts` e `src/graphics/universeObjects.ts`. O build regenera `dist` e o cache de TypeScript.

## Como testar cada carta

1. Inicie com `npm run dev` e entre pelo PIN e leitor existentes.
2. Explore a galáxia e procure envelopes de contorno dourado. Gire a vista para procurar as regiões da tabela. Também é possível usar Tab até ouvir/ver o título de qualquer uma das seis cartas e pressionar Enter ou Espaço.
3. Abra cada envelope, confira seu título e parágrafos, role até o último parágrafo e teste “Mostrar carta inteira” com movimento normal.
4. Feche pela barra fixa ou por Escape. Confira a vista anterior da galáxia e o foco devolvido ao envelope.
5. Reabra em outra ordem; os envelopes lidos devem ter indicação azul e continuar acessíveis.
6. Recarregue, entre novamente e confira a indicação de leitura. Teste também com armazenamento bloqueado: a releitura deve funcionar durante a sessão.
7. Repita em 320, 390 e 430 px, desktop, movimento reduzido e com “Pular animação”. Verifique também os dois quizzes e seus encerramentos.

O desempenho e o conforto visual em celulares físicos devem ser avaliados no aparelho real; a emulação automatizada não substitui essa verificação.

## Validação final

- `npm test`: 23 testes aprovados em 5 arquivos.
- `npm run lint`: aprovado.
- `npm run build`: TypeScript e build de produção aprovados.
- `npm run test:e2e`: 33 testes aprovados em 16,4 minutos, no Edge headless.
- As cartas foram verificadas em 320, 390, 430 e 1440 px: seis conteúdos, ordem livre, teclado, foco, rolagem, releitura, persistência e retorno à câmera anterior.
- Foram testados seleção pelo raycaster, toque e rolagem nativa, movimento reduzido, revelação gradual, cliques repetidos, interrupção/retorno, pular animação, fallback sem WebGL e armazenamento bloqueado.
- A regressão inclui PIN, digital, as 40 alternativas do Quiz de Casal e seus 23 feedbacks especiais, encerramentos e pedido de namoro, Teste de Compatibilidade e viagens de ambos os quizzes, incluindo paisagem de 844 px.
- Os testes confirmam ausência de emojis no conteúdo das seis cartas e preservação das chaves de armazenamento dos quizzes. Capturas de 320 px foram inspecionadas visualmente no início e no final da leitura.

Não foram identificadas falhas nos testes executados. Permanecem como validação manual a fluidez em celulares físicos, o conforto das trajetórias e uma avaliação com leitor de tela real. Sem WebGL, a navegação usa o fallback descrito acima.
