# Estrela cadente dos desejos

A estrela integra a cena Three.js existente: um sprite com a textura de brilho já usada e um buffer de 28 partículas. Não há uma segunda cena, pacote novo ou backend novo. O renderizador existente atualiza e descarta os recursos da estrela.

## Encontro e navegação

Após a introdução, o relógio conta 30 segundos de exploração na galáxia, com página visível e em foco. Quizzes, cartas, viagens e a tela do desejo pausam a contagem. Um convite ignorado se recolhe após 45 segundos de exploração ativa. Recusar, ignorar ou concluir impõe intervalo de 120 segundos antes de outro encontro. Não há coleta durante a exploração.

A estrela atravessa uma pequena região à frente da câmera e desacelera. Sua posição relativa à câmera mantém o encontro dentro do campo de visão mesmo ao girar a galáxia. Mouse/toque na estrela ou o botão acessível “Quero tentar” iniciam a viagem; “Agora não” recolhe o convite sem interromper os controles. A preferência por movimento reduzido elimina o percurso intenso e apresenta a estrela já acessível.

O destino dinâmico `wish` usa a máquina de navegação existente e a mesma `CameraTravel`, com uma rota próxima. Posição, quaternion e parâmetros da órbita são salvos e restaurados ao voltar, incluindo saída antes de enviar. A opção existente para pular a viagem continua disponível. O foco retorna à área principal da galáxia.

## Envio e segurança

O campo admite até 2.000 caracteres. O aviso explica que o criador poderá ler o desejo. Somente “Entregar meu desejo ao universo” chama `submit`, com `{kind: 'wish', text, consent: true, submissionId}`. Texto vazio não é enviado. Cliques simultâneos compartilham uma única requisição; uma nova tentativa explícita do mesmo texto conserva o UUID para deduplicação no servidor. Não há armazenamento de desejos no localStorage, coleta de identidade, consulta pública nem reenvio automático.

A confirmação exige HTTP de sucesso e `ok: true`. Então o ponto de luz se afasta e surge “Talvez o universo já esteja trabalhando nisso...”. Erros preservam o campo; o navegador permite repetir. O texto permanece durante edição e renderizações; sair deliberadamente sem enviar descarta esse rascunho desta visita. Enquanto uma requisição está pendente, os controles de envio/saída ficam indisponíveis por no máximo o timeout de 15 segundos do cliente existente.

Backend e autenticação administrativa não foram alterados: validação de tamanho/formato, UUID único, rate limit, RLS sem leitura pública e endpoints administrativos protegidos permanecem. `/admin` já possui Desejos, texto completo, data/hora do servidor e paginação de 50 registros. Não há migration ou Edge Function adicional a publicar.

## Configuração e teste manual

Use URL/chave públicas conforme SUPABASE.md e configure o backend existente. Sem Supabase, o encontro e a tela continuam acessíveis, mas o envio fica desabilitado e explica a indisponibilidade. Nenhum dado real foi enviado automaticamente para validar a integração.

1. Entre normalmente e explore a galáxia em uma aba visível/em foco por cerca de 30 segundos após a introdução.
2. Observe a estrela e aceite pelo convite ou pelo seu ponto luminoso. Teste também “Agora não” e aguarde uma nova oportunidade após dois minutos.
3. Escreva um desejo; confira o aviso de compartilhamento. Sem envio, “Voltar” restaura a câmera e os controles.
4. Para enviar de verdade, use somente um projeto configurado e um desejo que pretenda compartilhar. Confira o resultado em `/admin` → Desejos.
5. No painel Network do navegador, simule offline antes de enviar. A mensagem de sucesso não deve aparecer; o campo deve continuar preenchido. Restaure a conexão e tente novamente.
6. Verifique 320, 390 e 430 px, teclado virtual, Tab/Enter/Escape, movimento reduzido e o retorno à mesma órbita.

Quando WebGL não estiver disponível, o canvas 2D existente mostra um ponto luminoso e o convite permite acessar a mesma experiência; não simula uma viagem 3D. Aparelhos físicos ainda precisam de avaliação de desempenho e teclado virtual.

## Comandos de validação

- `npm test`
- `npm run lint`
- `npm run build` (inclui TypeScript)
- `npx playwright test --config playwright.wishes.config.ts --output test-results-wishes`
- `npx playwright test tests/travel.spec.ts tests/compatibility.spec.ts --grep "320" --output test-results-regression-wishes`

A suite de desejos usa API simulada na porta 5175, sem projeto remoto. O relógio do navegador acelera os encontros; não há parâmetros ocultos para acelerar ou enviar desejos na aplicação publicada.

Referência oficial conferida: https://supabase.com/docs/guides/functions/auth e índice https://supabase.com/changelog.md. Os contratos HTTP próprios do projeto foram preservados; não foi introduzido um novo SDK de autenticação.
