# Iniciador automático

Na raiz do projeto, dê dois cliques em `iniciar.py`. O arquivo precisa estar associado ao Python 3 no Windows. Se abrir no editor, use “Abrir com” e escolha Python; alternativamente, execute `py iniciar.py` no terminal. Não use `iniciar.pyw`: a janela deve permanecer visível.

Pré-requisitos: Python 3, Node.js/npm e cloudflared instalados e disponíveis no PATH, além das dependências do projeto já instaladas com `npm install`. O iniciador não instala nada. Reinicie o terminal ou o Explorer após modificar o PATH.

O console inicia o Vite na porta 5173, aguarda uma resposta HTTP e depois inicia o Cloudflare Tunnel. Quando o endereço HTTPS real aparece, abre o navegador padrão uma única vez. O link fica em uma linha própria: selecione-o e copie com Ctrl+C (ou use o menu de copiar do terminal). Sem seleção de texto, Ctrl+C encerra os serviços. O Quick Tunnel gera um endereço temporário, que pode mudar a cada execução; ele torna este servidor de desenvolvimento acessível pela internet enquanto estiver ativo.

Mantenha a janela aberta. Para encerrar, pressione Ctrl+C. Um Job Object privado do Windows encerra o Vite, o Cloudflare e seus descendentes sem procurar processos pelo nome ou afetar outros projetos. Fechar a janela também libera esse grupo de processos. Os dois serviços compartilham o console; os registros têm prefixos Vite e Tunnel.

Se a porta estiver ocupada, o iniciador não encerra o processo existente: mostra o erro. Há limites de 60 segundos para o Vite e 120 segundos para o link. Dependências ausentes, falhas de inicialização e encerramentos inesperados são exibidos; os serviços iniciados são limpos e a janela espera Enter antes de fechar. Se o navegador não abrir, copie o endereço manualmente.

Testes isolados: `python -m unittest discover -s tests -p test_iniciar.py -v`. Esses testes não criam um túnel público nem abrem o navegador. A disponibilidade externa do Cloudflare e a associação de duplo clique devem ser conferidas executando o iniciador no Windows.

## Validação realizada

- Python 3.13.12, Node.js 24.18.0, npm 11.16.0 e cloudflared 2026.9.3 encontrados no ambiente.
- Sintaxe validada com `python -m py_compile iniciar.py tests/test_iniciar.py`.
- Dez testes isolados aprovados: extração do link, consumo dos registros, disponibilidade HTTP, timeouts, encerramento inesperado, dependência ausente, porta ocupada e encerramento real de processo e descendente no Windows.
- Vite iniciado com os argumentos solicitados, resposta HTTP 200 confirmada e porta 5173 liberada após encerrar a árvore. Esse teste precisou rodar fora do sandbox do agente, que bloqueava a leitura da configuração pelo esbuild.
- Não foram executados túnel público real, abertura do navegador nem duplo clique pelo Explorer. Nenhum arquivo do site foi modificado.
