export const questions = [
 ['Se a gente tivesse um dia inteiro só pra nós dois, qual seria o plano?', 'Qualquer lugar, desde que estejamos juntos.', 'Ficar em casa, assistir algo e aproveitar a companhia.', 'Sair sem rumo e decidir tudo na hora.', 'Cinema, comida e alguma coisa pra fazer depois.'],
 ['Qual seria nossa viagem dos sonhos?', 'Canadá.', 'New York', 'Itália.', 'Japão.'],
 ['Qual dessas formas de demonstrar carinho mais combina com você?', 'Abraços, carinho e tempo de qualidade juntos.', 'Conversas longas, elogios e mensagens carinhosas.', 'Cartinhas, declarações e gestos românticos inesperados.', 'Presentes e surpresas materiais.'],
 ['Se a gente tivesse uma discussão, como você preferiria resolver as coisas?', 'Conversar e tentar resolver na hora, mas saber dar um tempinho quando os ânimos estiverem exaltados.', 'Conversar imediatamente até os dois se entenderem, sem deixar nada pendente.', 'Dar um tempo para cada um se acalmar e depois conversar tranquilamente.', 'Esperar a situação passar e deixar que as coisas se resolvam naturalmente.'],
 ['O que mais te encanta em alguém por quem você está se apaixonando?', 'O jeito como me trata, cuida de mim e demonstra carinho.', 'Os olhos, o olhar e aqueles pequenos detalhes que me fazem admirar a pessoa.', 'A personalidade, o jeito de pensar e de enxergar o mundo.', 'O sorriso, a aparência e a beleza que chama atenção logo de cara.'],
 ['Se tivéssemos um sábado inteirinho livre, como você gostaria de passar esse dia comigo?', 'Passar o dia em casa, assistindo alguma coisa e aproveitando a nossa companhia.', 'Decidir tudo na hora, sem planejar absolutamente nada.', 'Sair cedo, conhecer lugares e passar o dia inteiro passeando.', 'Ir a uma festa ou evento movimentado e passar o dia rodeado de gente.'],
 ['Se a gente pudesse viver uma aventura completamente diferente da nossa rotina, qual você escolheria?', 'Conhecer outro país juntos e explorar uma cultura completamente diferente.', 'Fazer alguma coisa totalmente inesperada, daquelas que viram história pra contar.', 'Fazer uma viagem de carro sem destino, descobrindo lugares pelo caminho.', 'Passar uma noite acampando, olhando as estrelas e conversando até tarde.'],
 ['Na sua opinião, qual dessas coisas é mais importante para um relacionamento dar certo?', 'Carinho, atenção e demonstrações constantes de amor.', 'Companheirismo, estar presente tanto nos dias bons quanto nos ruins.', 'Confiança e sinceridade, mesmo nas conversas difíceis.', 'Liberdade e respeito ao espaço individual de cada um.'],
 ['Imagina que estamos juntos há bastante tempo. O que você acha que mais ajudaria a manter nosso relacionamento especial?', 'Continuar demonstrando amor nos pequenos detalhes, mesmo depois de muito tempo.', 'Nunca perder a amizade, as brincadeiras e a cumplicidade entre nós.', 'Continuar criando experiências novas e fugindo da rotina de vez em quando.', 'Construir sonhos e objetivos juntos, sempre pensando no nosso futuro.'],
 ['Se a gente pudesse escolher uma coisa para viver juntos nos próximos anos, qual seria?', 'Viver um amor cheio de surpresas, aventuras e momentos inesquecíveis.', 'Construir uma vida juntos, compartilhando até os momentos mais simples do dia a dia.', 'Viajar pelo mundo, conhecer lugares e colecionar histórias juntos.', 'Realizar nossos sonhos individuais, sempre apoiando um ao outro.'],
].map(([text, ...options], index) => ({ id: index, text, options: options.map((text, i) => ({ id: `${index}-${i}`, text, weight: 4 - i })) }));
export const firstDeclaration = [
 'Sabe, eu poderia ter feito mil perguntas, calculado mil porcentagens e procurado em cada estrela uma resposta sobre nós dois.',
 'Mas acho que existe uma coisa que nenhum número conseguiria explicar.',
 'É que, mesmo que nossos gostos sejam diferentes, mesmo que a gente enxergue algumas coisas de formas completamente opostas, eu ainda gostaria de descobrir o seu mundo inteiro.',
 'Conhecer seus sonhos, entender seus silêncios, ouvir suas histórias e continuar descobrindo os pequenos detalhes que fazem você ser quem é.',
 'Porque, entre tantas estrelas, tantos caminhos e tantas possibilidades...',
 'Eu ainda escolheria encontrar você.',
];
export const secretPrelude = [
 'Eu já pensei nessa pergunta mais vezes do que você imagina.',
 'Em outros lugares, em outras histórias, em outras versões de mim...',
 'Eu poderia ter feito tantas escolhas diferentes.',
 'Mas se o universo me desse a chance de começar tudo outra vez...',
];
export const finalDeclaration = [
 'Se eu pudesse escolher de novo...',
 'Mesmo sabendo das nossas diferenças, dos nossos desencontros e de tudo aquilo que ainda precisamos aprender um sobre o outro...',
 'Eu escolheria conhecer você outra vez.',
 'Escolheria nossas conversas, suas risadas, seus olhos e até os pequenos momentos que talvez você nem imagine que eu guardei.',
 'Porque, no meio de infinitas possibilidades, existe uma escolha que eu faria quantas vezes fosse necessário.',
];
export const finalPhrase = 'Em todas as vidas, em todos os universos, eu escolheria você.';
