# Meu universo

Experiência romântica em três atos, mobile-first, renderizada em tempo real. A galáxia funciona localmente; a infraestrutura opcional de Supabase oferece envios voluntários e painel privado, sem trackers. Configuração e implantação manual: [SUPABASE.md](SUPABASE.md).

## Executar

Node.js 22.12+ (validado em Node 24), npm.

```sh
npm install
npm run dev -- --port 5173
```

Abra http://localhost:5173. PIN de demonstração: **0815**. A ordem inversa, **1508**, recebe uma mensagem própria. O teclado físico também funciona; Backspace apaga e Escape limpa. O leitor aceita mouse, toque, Espaço ou Enter mantidos por 2,7 segundos. Soltar ou sair da janela cancela a pressão; uma nova pressão precisa completar o tempo inteiro. O botão discreto no topo ativa sons sintetizados, somente após interação.

```sh
npm run lint
npm test
npm run build
npm run test:e2e
npm run preview
```

Os testes E2E usam Microsoft Edge instalado (`channel: 'msedge'` em `playwright.config.ts`). Para outro ambiente, use Chromium instalado pelo Playwright e ajuste esse campo. O servidor dos testes é iniciado automaticamente, ou reutiliza localhost:5173. Em sandboxes Windows, esbuild pode precisar de execução com leitura dos diretórios pais autorizada; isso não exige alteração no projeto.

## Personalizar

`src/config/experience.ts` reúne os dias, textos, pistas, durações e limites de partículas. `birthdays.firstDay` é o primeiro par e `secondDay`, o segundo; use dias de 1 a 31. Cada dia recebe zero à esquerda automaticamente. Configure os dias reais antes de compartilhar. O PIN faz parte da narrativa: **não é autenticação nem protege conteúdo privado**; todo aplicativo estático pode ser inspecionado.

Metadados do navegador ficam em `index.html`, identidade visual e responsividade em `src/styles.css`. Não há dependência de fontes remotas: Georgia e fontes do sistema. O favicon, cadeado vetorial funcional, ruído, digital, partículas e sons são procedurais/originais; nenhum asset externo foi baixado.

## Arquitetura

| Área | Arquivos | Responsabilidade |
| --- | --- | --- |
| Conteúdo | `src/config/experience.ts` | Personalização |
| Estado | `src/core/state.ts` | Sequência de atos, reinício e rejeição de callbacks antigos |
| Entrada | `src/core/pin.ts`, `src/components/Lock.tsx` | PIN, pistas e abertura |
| Narrativa | `src/components/Narrative.tsx` | Frases e pausas |
| Leitor | `src/components/Scanner.tsx` | Pointer Events, teclado, progresso e cancelamento |
| Orquestração | `src/App.tsx` | Montagem dos atos e lazy loading |
| Gráficos | `src/graphics/engine.ts`, `shaders.ts`, `geometry.ts` | Digital → partículas → poeira → galáxia 3D e portal 3D |
| Jardim Eterno | `src/experiences/garden/`, `public/jardim-eterno/` | Portal, convite, viagem reversível e experiência isolada em iframe |
| Buraco Negro dos Segredos | `src/experiences/blackHole/`, `src/graphics/blackHoleScene.ts` | Cinco cristais interativos, montagem física da estrela e carta final |
| Compatibilidade | `src/graphics/FallbackCanvas.tsx`, `performance.ts` | Canvas 2D e qualidade adaptativa |
| Feedback | `src/effects/feedback.ts` | Haptic e Web Audio opt-in |
| Extensões | `src/experiences/registry.ts` | Contrato de módulos carregados sob demanda |

O mesmo buffer de partículas guarda coordenadas da digital e da galáxia. O vertex shader interpola entre os dois, espalha as partículas na profundidade e amplia o enquadramento da câmera. Glow vem de sprites procedurais e mistura aditiva; não há um pós-processamento de bloom pesado. Uma segunda camada de poeira é desativada no nível baixo.

O carregamento do engine ocorre depois do primeiro conteúdo. Qualidade inicial considera memória, núcleos, largura e Save-Data quando disponíveis. São até 18 mil partículas (desktop), 10 mil (mobile) ou 3.600 (econômico), com DPR limitado a 1,65/1. FPS sustentado baixo reduz quantidade e resolução. Canvas usa 1.400 partículas. A cena oculta não renderiza; aba invisível pausa; geometria, materiais, textura, observers e listeners são descartados. Em reduced-motion, a transformação é curta, sem parallax/rotação, e a galáxia final fica estática. Vibração depende do navegador (geralmente ausente no iOS).

O portal permanente do Jardim Eterno usa picking na cena Three.js e um botão acessível sincronizado com sua projeção para teclado e leitores de tela. O convite, a aproximação, a travessia e o retorno reutilizam a viagem reversível da câmera e salvam o enquadramento e os controles da galáxia. O jardim HTML/CSS/JavaScript original foi copiado sem alterações para `public/jardim-eterno/` e executado em um iframe descartável, evitando colisões de DOM, CSS e globais; sair desmonta o documento e seus listeners/animações. A narrativa original, incluindo os textos de desculpas/reconciliação e declaração romântica em `config.js`, foi preservada e ainda requer revisão narrativa posterior.

O Buraco Negro dos Segredos reutiliza a cena e a câmera da galáxia. Os cinco fragmentos são registrados localmente em `meu-universo.black-hole-secrets.v1`; ao descobri-los, as próprias peças cristalinas se unem em uma estrela antes de revelar a carta final. O progresso pode ser retomado em visitas futuras, e o retorno restaura a pose e os controles salvos da galáxia.

## Adicionar experiências depois

Para outras experiências, crie, por exemplo, `src/experiences/memories/index.tsx` com export default de um componente que receba `{ onExit }`. Registre em `experienceModules`:

```ts
{ id: 'memories', title: 'Nossa Galáxia', load: () => import('./memories') }
```

Na próxima etapa, implemente `src/experiences/Hub.tsx` para listar os módulos, carregar o selecionado via `React.lazy` e chamar `onExit` ao voltar. Monte o Hub na cena `universe` em `App.tsx`; preserve o canvas em `Cosmos` para manter a continuidade visual. Não é necessário alterar o engine para módulos de cartas, quiz ou músicas. Para estrelas clicáveis, a extensão seguinte será um picking/raycast separado em `graphics`, sem acoplar conteúdo pessoal ao shader.

## Limites e continuação

- Os três atos estão implementados. O HUB, memórias, quiz, planetas e demais módulos futuros não foram implementados, conforme o escopo.
- Sons curtos funcionam; trilha musical ainda não foi adicionada. A camada de áudio está pronta para receber reprodução após gesto explícito.
- Canvas 2D preserva o fluxo e a transformação, mas tem menos profundidade e poeira que WebGL.
- Testes em navegador desktop com viewports móveis não substituem avaliação em Android intermediário e Safari/iPhone reais, especialmente temperatura, bateria, vibração e interrupções do sistema.
- Telas extremamente baixas e orientação horizontal podem rolar verticalmente para preservar alvos de toque. Não há bloqueio de orientação.
- Nenhum deploy foi feito. Build estático sai em `dist/`.

Próximo trabalho recomendado: personalizar `experience.ts`, verificar em dois celulares reais e então implementar `src/experiences/Hub.tsx` usando o contrato de `registry.ts`.
