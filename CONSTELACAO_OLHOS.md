# Constelação dos Olhos

A referência obrigatória `referencia-olhos.png` (1600 × 800) foi aberta e inspecionada visualmente antes desta correção. Seus pontos principais foram mapeados em coordenadas normalizadas, preservando a diferença de altura e curvatura entre os olhos, sobrancelhas, ponte central e reflexos.

A composição usa estrelas reais com tamanho, intensidade, cor e profundidade próprios, além de conexões curvas animadas. As íris são sombras assimétricas parcialmente encobertas, definidas por curvas cúbicas autoradas. Não há círculos concêntricos nem elipses usadas para construir o olhar. Poeira e nebulosas complementares são geradas proceduralmente com turbulência determinística. A imagem original não é colocada em um plano para substituir a constelação.

A cutscene continua na mesma cena e câmera. Estrelas aparecem dispersas e convergem; depois, as conexões crescem de ponto a ponto. A formação normal leva aproximadamente 18 segundos, com uma pausa de 1,8 segundo antes da frase. Movimento reduzido mantém uma formação curta sem deslocamento das partículas. Conexões são reunidas em um único buffer de segmentos; não existe um objeto/draw call por estrela ou ligação. Texturas difusas são calculadas somente na montagem, e os recursos próprios são descartados junto com a cena.

## Desbloqueio e aparição

- Cartas: `meu-universo.lost-letters.v1`, lido pelo validador existente; exige os seis identificadores.
- Compatibilidade: `meu-universo.compatibility.v1`, pelo validador existente; exige respostas válidas e `completed`.
- Casal: `meu-universo.couple.v1`, pelo validador existente; exige respostas válidas e `completed`. Não exige aceitar o convite romântico.
- Buraco Negro: `meu-universo.black-hole-secrets.v1`; exige os cinco fragmentos e `starFormed` validado.

Não são exigidos Jardim, desejo enviado, Supabase ou dados pessoais. Os registros existentes não são migrados nem apagados.

Depois da apresentação inicial, a visitante precisa explorar ativamente por aproximadamente 12 segundos: mover o cursor, arrastar, usar a roda do mouse ou navegar pelo teclado. Só contam períodos em primeiro plano com navegação recente. Abrir outra experiência reinicia a espera; convites visíveis também a suspendem. Gestos e teclas ainda pressionados não são interrompidos, e há uma pausa de 500 ms após o último movimento. Um pequeno agrupamento começa a aparecer antes do disparo. Sem WebGL a cutscene não dispara, preservando a navegação de fallback.

O estado `EYES_ACTIVE` bloqueia os controles normais. A câmera interpola posição e orientação para a região da constelação, sem trocar de página. Após a formação, a frase aprovada surge e permanece indefinidamente. `Voltar à galáxia` funciona inclusive antes do fim; a saída começa da posição real atual e restaura a câmera e o rig anteriores. Uma pequena constelação permite retornar por toque, mouse ou teclado.

O enquadramento considera a área visível do navegador, inclusive quando o canvas original é maior em paisagem. A pequena constelação não é renderizada dentro das outras experiências. Em movimento reduzido, o loop 3D pausa após a formação estática e acorda ao retornar ou redimensionar a tela.

## Persistência exclusiva

A chave `meu-universo.eyes-constellation.v1` armazena `{version:1, started:true, watched:true}`. `started` é registrado ao iniciar, evitando repetição automática mesmo se a pessoa sair cedo; `watched` somente após a formação e a apresentação da frase. Uma saída antecipada deixa `watched:false` e permite reprodução manual. Registros anteriores com `watched:true` continuam válidos.

Para reiniciar **somente** essa experiência durante testes, execute no console do navegador:

```js
localStorage.removeItem('meu-universo.eyes-constellation.v1');
location.reload();
```

As cartas, quizzes e fragmentos ficam intactos. Se o armazenamento estiver bloqueado, a proteção contra repetição vale nesta visita; não é possível garantir persistência após recarregar.

## Verificação manual

Complete as quatro condições, retorne à galáxia e navegue por alguns segundos. Confira a formação dos dois olhos, a frase exata, a ausência dos controles antigos sobre a cena e a permanência sem encerramento automático. Retorne, procure a pequena constelação e reveja. Teste também uma saída antecipada, recarregamento, 320/390/430 px, paisagem, teclado e movimento reduzido.

```text
npm test
npm run lint
npm run build
npx playwright test tests/eyes.spec.ts tests/travel.spec.ts tests/black-hole.spec.ts --workers=1
```

Os E2E usam progresso local preparado em um contexto isolado; não enviam dados ao Supabase. Os testes de navegador não substituem a verificação em celular físico ou leitor de tela real. Não foi feito deploy, commit ou publicação.

## Arquivos desta implementação

Criados: `src/graphics/eyesConstellation.ts`, `src/experiences/eyes/progress.ts`, `src/experiences/eyes/EyesExperience.tsx`, `src/experiences/eyes/eyes.css`, `src/experiences/eyes/eyes.test.ts`, `tests/eyes.spec.ts` e este documento.

Modificados: `src/App.tsx` (estado, espera, foco e integração), `src/graphics/Cosmos.tsx` (propagação para a cena), `src/graphics/engine.ts` (mesmo loop/câmera e descarte) e `src/graphics/travel.ts` (estado/destino tipados). Nenhum arquivo de conteúdo das experiências anteriores foi alterado.

## Resultados da versão anterior (antes da referência obrigatória)

- Lint, TypeScript e build de produção aprovados na verificação final.
- 62 testes unitários em 11 arquivos aprovados, incluindo condições de desbloqueio, persistência, início interrompido, dois olhos, crescimento real dos segmentos, brilho final completo, espera e restauração exata da câmera.
- 7 cenários E2E da cutscene aprovados na reexecução completa: 320/390/430 px e desktop, toque, teclado, movimento normal/reduzido, paisagem, contemplação, retorno, reprodução, gesto pressionado, quiz sem interrupção e recarregamento. A execução anterior teve um timeout de 80 segundos no cenário com duas entradas completas; ele passou com limite de 130 segundos.
- 6 cenários de regressão de Buraco Negro e viagens dos quizzes aprovados em execução focada. Total de 13 cenários distintos aprovados entre as suítes, não uma execução conjunta de todos os testes do site.
- Após a proteção final de visibilidade/foco, lint, os 62 unitários, TypeScript/build e o cenário E2E de 430 px com paisagem/retorno/reprodução passaram novamente.
- Capturas de 320 px, desktop e paisagem foram inspecionadas visualmente. A inspeção de paisagem identificou um enquadramento baixo, corrigido para considerar a tela visível.

Na versão anterior faltava a referência. Ela foi fornecida e utilizada nesta correção. Continuam pendentes verificações em aparelho físico e leitor de tela real. Não houve benchmark instrumental de FPS/memória, configuração remota, commit ou deploy.

## Arquivos da correção visual atual

- Criados: `src/graphics/eyesReference.ts` (mapa normalizado e ligações), `src/graphics/eyesLayers.ts` (sombras, poeira e nebulosas), `src/graphics/eyesArtwork.ts` (buffers, shaders e animação dos elementos).
- Modificados: `src/graphics/eyesConstellation.ts` (nova arte mantendo os percursos e a restauração da câmera), `src/experiences/eyes/eyes.test.ts`, `tests/eyes.spec.ts` e este documento.
- O arquivo original `referencia-olhos.png` foi preservado. Desbloqueio, armazenamento, interface/frase, quizzes, cartas, Jardim, Buraco Negro e Supabase não foram modificados nesta correção.

## Capturas para comparação

A comparação foi feita por inspeção visual da referência e das capturas reais. O mapa acompanha a composição e as assimetrias do olhar; estrelas secundárias e textura das nuvens continuam procedurais, não uma cópia pixel a pixel da imagem.

- Referência: `referencia-olhos.png`.
- Desktop completo: `test-results/eyes-reference-final-desktop.png`.
- Recorte desktop em proporção 2:1: `test-results/eyes-reference-detail-desktop.png`.
- Recorte mobile em proporção 2:1: `test-results/eyes-reference-detail-mobile.png`.
- Mobile completo: `test-results/eyes-390.png`.
- Etapas reais: `test-results/eyes-reference-dark.png`, `test-results/eyes-reference-dispersed.png` e `test-results/eyes-reference-connecting.png`.

O build emite aviso de tamanho do chunk Three.js acima de 500 kB; não é um erro de compilação. Não foram alterados limites de aviso ou configurações de build para escondê-lo.
