# Validação e continuidade — 03/10/2026

## Estado

Primeira versão executável dos três atos concluída. Nenhum arquivo prévio existia no diretório. Nenhuma publicação ou alteração de serviço externo foi realizada.

Servidor local: `npm run dev -- --port 5173` → http://localhost:5173. PIN de exemplo: `0815`. A ordem invertida, `1508`, recebe uma mensagem específica. O preview foi aberto no navegador integrado do Codex.

## Verificações

- TypeScript estrito + build Vite: aprovados.
- ESLint, incluindo regras de hooks: aprovado.
- Vitest: 4 testes aprovados (PIN com zeros à esquerda, ordem invertida, saturação de pistas, transições antigas e dados gráficos finitos/determinísticos).
- Playwright/Edge: 7 cenários aprovados na rodada de revisão visual, com fluxo completo, leitura interrompida, leitura por teclado, fallback sem WebGL e reduced-motion.
- Tamanhos: 320 × 568, 360 × 900, 390 × 900, 430 × 900, 1440 × 900; fluxo principal em 390 × 844.
- Console do fluxo WebGL: nenhum erro de página ou console.
- `npm audit` durante a instalação final: zero vulnerabilidades. Vitest foi atualizado para 4.1.11 para corrigir o aviso encontrado inicialmente.
- Capturas em `test-results/`: cadeado, leitor, galáxia e layouts. Essa pasta é ignorada pelo Git e será recriada nos testes.

Uma última rodada está prevista após o ajuste de transparência e teste de pressão contínua do mouse; o resultado final deve ser registrado abaixo.

## Limites

Emulação desktop não confirma desempenho térmico, bateria, haptic nem comportamento Safari/iOS em dispositivos físicos. O fallback usa 2D; não reproduz integralmente a profundidade 3D. O PIN é uma interação narrativa, não uma barreira de segurança.

## Próxima etapa

1. Substituir os dias de demonstração em `src/config/experience.ts` e personalizar as frases.
2. Avaliar em Android intermediário e Safari/iPhone reais (inclusive sair da aba enquanto pressiona, voltar, rotação e economia de bateria).
3. Implementar `src/experiences/Hub.tsx`, consumindo `experienceModules` em `src/experiences/registry.ts`. Montá-lo no ato `universe` de `src/App.tsx`, preservando `Cosmos`.
4. Adicionar a primeira memória ou carta como módulo independente. Não foram implementados quiz, planetas, cartas ou outros módulos futuros nesta entrega.

Comandos de continuidade: `npm install`, `npm run dev`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.
