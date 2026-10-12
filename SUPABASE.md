# Supabase e painel privado

## Estado da entrega

A infraestrutura está implementada localmente. Nenhum projeto remoto foi criado, vinculado, migrado ou publicado. Não há URL/chaves reais configuradas. Sem configuração, a galáxia continua funcionando, os controles de envio opcional ficam ausentes e `/admin` explica que o Supabase não está configurado. Não há dados fictícios na aplicação: os testes simulam a API somente no ambiente de teste.

O diretório não possui `.git`. Foram preservados os arquivos existentes e criados pontos de integração restritos. Os textos, perguntas, alternativas, feedbacks, pontuações e animações românticas permanecem; dois ornamentos textuais foram substituídos por SVG e o coração textual da identificação foi removido para cumprir a exigência de ausência de emojis. Não foi criada a experiência visual de desejos.

## Arquitetura e autenticação

- `src/services/supabase.ts`: cliente HTTP pequeno das Edge Functions; somente URL e chave publicável. Não consulta tabelas e não usa credenciais administrativas.
- `/admin` carrega um módulo separado, sem abrir a cena 3D, PIN ou biometria. Login somente com senha, histórico paginado (50 registros), totais reais, estados vazios, erros e logout.
- Edge Function `admin`: login, sessão, logout e consultas protegidas. Edge Function `submit`: validação e gravação somente de um envio explicitamente autorizado.
- Senha validada exclusivamente no servidor com PBKDF2-SHA256, salt aleatório de 128 bits e 600.000 iterações. Comparação sem saída antecipada.
- A sessão tem 256 bits aleatórios e validade absoluta de 15 minutos, sem renovação silenciosa. O banco guarda somente SHA-256 do token. Logout apaga a sessão; a troca do hash de senha invalida todas as sessões anteriores nas próximas requisições.
- Como frontend Vite e Edge Functions usam origens diferentes, foi escolhido o mecanismo equivalente de token curto em **memória**, enviado por Authorization somente ao endpoint administrativo. Não há cookies de terceiros, localStorage/sessionStorage de tokens ou senha. Recarregar ou fechar a página exige novo login. HTTPS é obrigatório em produção; HTTP apenas para desenvolvimento local.
- Os dados protegidos são retirados da tela ao expirar a sessão. Não há cadastro, email, Supabase Auth público ou consulta direta administrativa pelo frontend.

## Banco

Migration gerada pela CLI: `supabase/migrations/20261011122438_private_admin_and_submissions.sql`.

| Tabela | Conteúdo |
| --- | --- |
| quiz_attempts | UUID gerado no banco, ID de deduplicação do envio, data do servidor, tipo, dez alternativas, resultado recalculado, conclusão e versão de consentimento |
| romantic_responses | UUID/data do servidor, escolha explícita (yes/no/later), tentativas no Não e versão de consentimento |
| wishes | UUID/data do servidor, texto de até 2.000 caracteres e versão de consentimento |
| admin_sessions | Hash do token, versão da credencial e expiração |
| request_limits | Três buckets globais de limitação, sem IP ou identificação |

Todas as tabelas têm RLS habilitada, sem políticas de acesso público. Privilégios são revogados de PUBLIC, anon e authenticated. Somente service_role, dentro das funções de servidor, tem acesso. RPCs `consume_rate_limit` e `admin_overview` usam SECURITY INVOKER, search_path fixo e EXECUTE exclusivo de service_role. O token administrativo próprio não é um JWT do Supabase e não concede acesso à Data API.

O servidor não aceita resultado, timestamp, identificação ou IP vindos do navegador. Ele recalcula compatibilidade pelos IDs originais (25–100%) e o Quiz de Casal pelas respostas oficiais (0–10), sem contar feedbacks especiais como acerto. Todas as alternativas são armazenadas na ordem das perguntas; o embaralhamento visual da compatibilidade não muda os IDs.

O UUID de deduplicação criado pelo navegador não identifica a pessoa. Um retry conserva esse UUID e não duplica/atualiza a linha. Um novo envio voluntário tem novo UUID; tentativas anteriores permanecem. A aplicação não coleta IP, identidade, digitação, movimentos ou impressões digitais. O provedor pode manter registros técnicos de requisições fora dessas tabelas; revise a retenção dos logs no Supabase.

## Consentimento e convite

Os quizzes não possuem mais uma etapa de autorização ao final. O padrão `VITE_QUIZ_SHARING_MODE=off` permite jogar sem coleta, mesmo com Supabase configurado. Para a participante que já autorizou o compartilhamento, configure `VITE_QUIZ_SHARING_MODE=preauthorized` em `.env.local` de um ambiente exclusivo e reinicie o Vite (ou refaça o build). Essa configuração representa autorização obtida previamente; não verifica identidade e não deve ser usada num link distribuído indiscriminadamente. Não foi ativada automaticamente neste projeto.

Para outros visitantes, use o ambiente padrão sem coleta ou o endereço `/?sem-coleta=1`, que desativa os envios automáticos dos quizzes durante essa visita mesmo no ambiente preautorizado. Preserve esse parâmetro ao compartilhar o link. Nenhuma autorização é inferida do PIN ou de respostas locais.

Uma conclusão nova envia automaticamente as dez alternativas. O backend recalcula o resultado e mantém todas as validações, RLS e limites existentes. Um bloqueio síncrono impede envios repetidos na mesma conclusão; o UUID e a restrição única do servidor protegem o registro. Reiniciar o quiz permite uma nova tentativa. Rever ou recarregar resultados antigos não envia nada. Falhas não interrompem o resultado e geram diagnóstico no console com tipo de quiz e status HTTP, sem respostas, credenciais ou identidade. Não há retry automático: uma falha pode deixar essa tentativa sem registro; erros de rede podem ocorrer depois de uma gravação bem-sucedida. O servidor continua exigindo `consent: true` e versão 1 para a autorização prévia.

O salvamento do pedido romântico continua separado e manual, mediante seu aviso e botão próprios; esta alteração se aplica somente aos quizzes.

No convite há um aviso antes da escolha. O botão Não continua fugindo por proximidade/toque com as restrições existentes. Proximidade não aumenta a contagem. Pointerdown intencional aumenta uma vez; o clique derivado não duplica; teclado também funciona. A contagem existe somente na memória desta visita ao quiz.

“Escolher Não” é uma alternativa estável à brincadeira; teclado e movimento reduzido também permitem selecionar Não. “Deixar para depois” seleciona explicitamente later. Nenhuma dessas escolhas bloqueia Sim ou a saída. A celebração de Sim permanece. Depois de uma escolha, há um bloco separado de autorização para enviar escolha e contagem. Sair pela navegação não é resposta e não é consentimento. Os registros são snapshots voluntários; escolher e enviar outra resposta cria outro registro, sem apagar o anterior. Não há estatísticas públicas.

O endpoint de desejo está preparado, mas não há UI de estrela cadente. Uma futura UI deverá informar que o proprietário lerá o texto e oferecer botão explícito de envio. Não chamar o endpoint em background.

## Configuração manual do proprietário

1. Crie ou escolha seu projeto no painel do Supabase. Isso não foi feito pelo agente.
2. Copie `.env.example` para `.env.local`, preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` usando os valores **públicos** do projeto. Nunca use service_role, sb_secret, senha ou hash em variáveis VITE_. Reinicie o Vite após mudar o arquivo.
3. Use a CLI oficial (comandos conferidos em 2.120.0):

```powershell
npx.cmd --yes supabase@2.120.0 login
npx.cmd --yes supabase@2.120.0 link --project-ref SEU_PROJECT_REF
npx.cmd --yes supabase@2.120.0 db push --dry-run
# Revise antes de aplicar ao banco escolhido:
npx.cmd --yes supabase@2.120.0 db push
```

4. Gere o hash sem colocar a senha na linha de comando nem no histórico:

```powershell
python scripts/configurar_admin.py
```

Digite interativamente a senha inicial que solicitou ou, preferencialmente, uma frase longa diferente. O script não contém essa senha e não a imprime. Gera `supabase/admin-secrets.local`, ignorado pelo Git, com apenas hash e salt. Trate esse arquivo como confidencial, pois hashes permitem ataques offline; restrinja seu acesso e não publique/compartilhe.

5. Configure o hash como segredo do projeto:

```powershell
npx.cmd --yes supabase@2.120.0 secrets set --env-file supabase/admin-secrets.local
```

Configure também o segredo `ALLOWED_ORIGINS` no Dashboard, separado por vírgulas, com origens **exatas**, por exemplo `http://localhost:5173,https://seu-dominio.example`. Não use `*`, caminhos nem barra final. Os valores SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são fornecidos pelo ambiente das Edge Functions; nunca copie a chave administrativa para o frontend. Sem esses valores, a função falha de forma fechada.

Se usar Quick Tunnel, a origem muda a cada execução. Adicione o endereço HTTPS exato gerado à lista ALLOWED_ORIGINS. Não libere todos os subdomínios trycloudflare. A chave pública e a URL também ficam disponíveis nesse túnel, o que é esperado; elas não concedem leitura dos registros.

6. Implante manualmente as funções somente depois de revisar o projeto e os segredos:

```powershell
npx.cmd --yes supabase@2.120.0 functions deploy admin submit
```

`verify_jwt = false` está configurado apenas para essas funções: a validação da sessão própria ocorre no handler, e a gravação pública passa por consentimento, validação e rate limit. Não remova essa validação. CORS com origens exatas se aplica aos dois endpoints.

7. Inicie `npm run dev` ou `py iniciar.py` e acesse `http://localhost:5173/admin` (ou `/admin` no domínio/túnel autorizado). Para hospedagem estática, configure rewrite de `/admin` para `index.html`, pois o Vite faz isso apenas no desenvolvimento.
8. Confirme login, envio voluntário, leitura, logout e tentativa de consulta direta com chave pública. Rode os advisors do Supabase e revise RLS/permissões no projeto real. Essa validação remota ainda depende do proprietário.

## Trocar a senha

Execute novamente `python scripts/configurar_admin.py` e `supabase secrets set --env-file supabase/admin-secrets.local` no projeto correto. O hash novo invalida tokens anteriores na próxima consulta. Não é preciso mudar código ou migration. Uma senha curta e previsível continua vulnerável mesmo com hash forte e limitação; a recomendação é usar uma frase longa exclusiva. A senha inicial solicitada não foi gravada em nenhum arquivo versionado.

## Desenvolvimento com Supabase local

Com Docker Desktop rodando em modo Linux:

```powershell
npx.cmd --yes supabase@2.120.0 start
npx.cmd --yes supabase@2.120.0 db push --local
npx.cmd --yes supabase@2.120.0 test db
npx.cmd --yes supabase@2.120.0 functions serve --env-file supabase/admin-secrets.local
```

Adicione `ALLOWED_ORIGINS=http://localhost:5173` ao arquivo de segredos local. Copie a URL/chave **pública** do stack para `.env.local`. Nunca publique saídas com as chaves administrativas do stack. O Docker instalado neste ambiente estava desligado, portanto o stack Supabase completo não foi iniciado.

## Testes

- `npm test`: lógica existente e handlers de servidor com banco controlado; senha incorreta/correta, limite, sessão, rotação, logout, consentimento, formatos, pontuação e retries.
- `npm run lint` e `npm run build`: frontend e código compartilhado.
- `npx.cmd --yes deno@2.9.6 check supabase/functions/admin/index.ts supabase/functions/submit/index.ts`: tipos das Edge Functions.
- `npx.cmd playwright test --config playwright.admin.config.ts`: painel móvel/desktop, API simulada, ausência de coleta dos quizzes, contagem sem duplicação e tokens ausentes do armazenamento. Essa suite usa porta 5174 e valores públicos de teste, sem acessar projeto remoto.
- `npm run test:e2e`: regressão da galáxia e experiências sem Supabase configurado; separada para não interferir nos cenários existentes.
- `supabase/tests/rls.sql`: testes pgTAP para o stack real/local. Ainda não executados no stack Supabase.
- `python -m unittest discover -s tests -p test_configurar_admin.py -v`: geração do hash, confirmação e ausência de senha/hash nos logs.
- `scripts/test_database.mjs`: executa a migration num PostgreSQL WASM em memória com @electric-sql/pglite 0.5.8, instalado temporariamente fora do projeto. Passe o diretório do pacote como argumento. Confere RLS, grants, RPCs privadas, visão geral vazia e limite atômico. Não adiciona dependência ao site e não se conecta remotamente.

## Riscos e limites

- Login: máximo global de 5 tentativas em 300 segundos, contando acertos e erros. Gravação pública: 30 envios por minuto. Consultas administrativas autenticadas: 120 por minuto. O controle é atômico no banco e funciona entre instâncias, sem IP ou fingerprint. Um agressor pode consumir a cota global e causar indisponibilidade temporária; CORS não impede clientes fora do navegador. Para exposição ampla, acrescente proteção de borda/CAPTCHA e alertas de consumo após avaliar privacidade, sem substituir a validação atual.
- O bearer em memória reduz persistência, mas scripts maliciosos na mesma origem poderiam lê-lo. Use HTTPS, controle de dependências e CSP na hospedagem. Cookies HttpOnly exigiriam um proxy/BFF da mesma origem; não foi criado outro servidor nesta tarefa.
- O conhecimento da senha permite consultar todos os registros autorizados. Prefira senha forte e restrinja a distribuição do link administrativo. A rota por si só não é proteção; os endpoints exigem sessão.
- Não há retenção automática de respostas pessoais. Defina uma política de retenção e apague registros pelo Dashboard quando deixarem de ser necessários. Sessões vencidas são removidas no próximo login; mesmo antes dessa limpeza elas não autorizam consultas.
- Validação de handlers com mocks e SQL em PostgreSQL em memória não comprova gateway, segredos, CORS remoto ou disponibilidade do projeto. Ainda é necessário testar todo o caminho real após configuração e implantação pelo proprietário.

## Resultados desta sessão

- 32 testes unitários aprovados em 6 arquivos (`npm test`).
- Lint, TypeScript e build de produção aprovados na versão final.
- Duas Edge Functions aprovadas pelo `deno check`.
- Três testes Python do gerador de hash aprovados; sintaxe Python validada.
- Migration executada com sucesso em PostgreSQL WASM: cinco tabelas com RLS, ausência de SELECT público, RPCs privadas, bloqueio de linhas mesmo com GRANT de teste e limite atômico real de 5/300 segundos.
- Sete cenários administrativos/de consentimento aprovados com API simulada no Edge: 320, 390, 430 e 1440 px, senha incorreta, limite informado, login, logout, expiração, dados vazios, desejo completo, consentimento/recusa, tentativas repetidas, toque e adiar. A captura de 320 px foi inspecionada visualmente.
- A contagem foi refinada para deduplicar pelo par pointerdown/clique, sem uma janela de tempo; o teste de consentimento foi repetido e aprovado com toque real seguido de clique mantido por 1,2 segundo: duas tentativas, sem duplicação.
- Regressão existente: 32 dos 33 cenários passaram na execução completa. O único teste restante tinha uma expectativa literal de coração textual na digital; foi atualizado para a mensagem aprovada sem emoji e reexecutado com sucesso (1/1). Não houve mudança no fluxo da digital para corrigir esse teste.
- Após o refinamento final da contagem, três regressões do casal foram repetidas e aprovadas: fluxo completo em 320 px, proximidade/posições/paisagem/saída no desktop e fuga/toque/aceitação/movimento reduzido.
- Inspeção do conteúdo fonte não encontrou emojis nem a senha inicial solicitada; o build não contém referências a ADMIN_PASSWORD_HASH, SUPABASE_SERVICE_ROLE_KEY ou credenciais privadas de teste.

Não foram executados deploy, migração remota, configuração de segredos reais, Supabase completo via Docker, pgTAP no stack Supabase ou testes em aparelhos físicos. O projeto remoto continua pendente de configuração e verificação pelo proprietário.

Referências oficiais consultadas: [segurança de Edge Functions](https://supabase.com/docs/guides/functions/auth), [segredos](https://supabase.com/docs/guides/functions/secrets) e [changelog](https://supabase.com/changelog). A mudança recente de PostgreSQL consultada não afeta os tipos/extensões usados nesta migration.

## Arquivos

Criados: `.env.example`, `SUPABASE.md`, `src/services/supabase.ts`, `src/services/backend.test.ts`, `src/components/SaveSubmission.tsx`, `src/components/saving.css`, `src/admin/Admin.tsx`, `src/admin/admin.css`, `supabase/config.toml`, migration, `supabase/functions/_shared/{security,handler,runtime}.ts`, `supabase/functions/{admin,submit}/index.ts`, `supabase/tests/rls.sql`, `scripts/configurar_admin.py`, `scripts/test_database.mjs`, `tests/admin.spec.ts` e `playwright.admin.config.ts`.

Modificados: `.gitignore`, `README.md`, `src/main.tsx`, `src/App.tsx`, `src/config/experience.ts`, `src/components/Narrative.tsx`, os componentes dos dois quizzes e `Invitation.tsx`, `playwright.config.ts` e a expectativa da mensagem sem emoji em `tests/experience.spec.ts`. Também criado `tests/test_configurar_admin.py`. O build regenera dist e o cache TypeScript. Sem commit, push, deploy ou configuração remota.

## Atualização: salvamento automático dos quizzes

Arquivos alterados nesta atualização: `.env.example`, os dois componentes de quiz, `SUPABASE.md`, `tests/admin.spec.ts` e `playwright.admin.config.ts`. Criados `src/services/quizSharing.ts` e `src/services/quizSharing.test.ts`. Nenhuma mudança no backend, nas perguntas, feedbacks ou cenas. A suite administrativa agora usa configuração preautorizada de teste e verifica também conclusão automática e exceção sem coleta de ambos os quizzes. Os resultados históricos acima se referem à entrega inicial; consulte o relatório da atualização para a validação atual.

Validação da atualização: 37 testes unitários passaram; lint, TypeScript e build passaram. Dos 11 cenários de navegador administrativos/salvamento, 9 passaram na primeira execução e 2 foram repetidos e passaram após um conflito de pastas de trace entre runners paralelos. Os fluxos completos do casal e da compatibilidade em 320 px passaram (compatibilidade também repetida pelo conflito de trace). API Supabase simulada: nenhum envio remoto real foi validado. Não houve commit ou deploy. Os arquivos de implementação modificados foram verificados sem emojis.
