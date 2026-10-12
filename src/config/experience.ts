export const experience = {
  birthdays: { firstDay: 8, secondDay: 15 },
  brand: 'meu universo',
  brandNote: 'um lugar só nosso', footerNote: 'FEITO DE TUDO QUE É NOSSO', coordinate: 'NÓS DOIS',
  lock: {
    eyebrow: 'EXISTE UM LUGAR', title: ['que só você', 'pode abrir.'],
    subtitle: 'E a chave é um pedacinho de nós.',
    prompt: 'Dois dias. Quatro números. Nós dois.',
    errors: ['Hmm… tenta pensar em nós dois.', 'São dois dias que eu espero que você lembre.', 'Um dia especial seu. Um dia especial meu.', 'Amor, impossível você não lembrar disso.'],
    reversed: 'Quase… mas as damas primeiro, né?',
    opening: 'Eu sabia que seria você.',
  },
  narrative: ['Você entrou.', 'Mas espera…', 'Só mais uma coisinha.', 'Preciso ter certeza de que é você.'],
  scan: { eyebrow: 'UMA ÚLTIMA CERTEZA', title: ['Algumas marcas', 'são únicas.'], instruction: 'Toque e segure a sua aqui.', idle: 'Mantenha pressionado', active: 'Reconhecendo você', recognized: 'Identidade reconhecida.', love: 'Amor da minha vida reconhecido.', accessible: 'Leitor visual fictício. Segure por três segundos ou pressione Espaço ou Enter.' },
  galaxy: { eyebrow: 'ENTRE TODAS AS POSSIBILIDADES', title: ['Você acabou de entrar', 'no meu universo.'], subtitle: 'E, de algum jeito, ele sempre foi seu.', footer: 'NOSSA HISTÓRIA ESTÁ SÓ COMEÇANDO' },
  labels: { delete: 'Apagar último número', hint: 'Uma pequena pista', hintText: 'O dia do seu aniversário e o dia do meu. Nessa ordem.', restart: 'Viver de novo', audioOn: 'Ativar sons', audioOff: 'Silenciar sons', chapters: ['O encontro', 'A certeza', 'O infinito'], pin: 'Senha de quatro dígitos', clear: 'Limpar senha' },
  universe: {
    objects: [
      { id: 'memory-01', type: 'memory', label: 'Memória 01', position: [-2.4, 0.8, 2.9] as [number, number, number], scale: 1.2, interactive: true, metadata: { stage: 'placeholder', kind: 'memory' } },
      { id: 'memory-02', type: 'memory', label: 'Memória 02', position: [2.6, -1.1, -2.2] as [number, number, number], scale: 1.1, interactive: true, metadata: { stage: 'placeholder', kind: 'memory' } },
    ],
  },
  timing: { rejection: 650, unlocking: 2300, narrativeLine: 2100, hold: 2700, recognition: 1800, love: 2300, formation: 10000, reducedFormation: 1600 },
  graphics: { high: 18000, medium: 10000, low: 3600, fallback: 1400, maxDpr: 1.65, minDpr: 1, slowFrameMs: 28, sampleFrames: 120, touchRotationSensitivity: 3.6 },
} as const;
