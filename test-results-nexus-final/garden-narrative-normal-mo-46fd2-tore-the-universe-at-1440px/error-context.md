# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: garden-narrative.spec.ts >> normal-motion terminal and final iframe exit restore the universe at 1440px
- Location: tests\garden-narrative.spec.ts:172:34

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e5]:
    - generic "meu universo" [ref=e6]:
      - text: meu universo
      - generic [ref=e10]: /
      - generic [ref=e11]: um lugar só nosso
    - button "Ativar sons" [ref=e12] [cursor=pointer]
  - main:
    - generic [ref=e17]:
      - paragraph: ENTRE TODAS AS POSSIBILIDADES
      - heading "Você acabou de entrar no meu universo." [level=1]:
        - text: Você acabou de entrar
        - emphasis: no meu universo.
      - paragraph: E, de algum jeito, ele sempre foi seu.
      - button "Viver de novo" [ref=e18] [cursor=pointer]: Viver de novo ↺
    - button "Compatibilidade" [ref=e19] [cursor=pointer]
    - button "Quiz de Casal" [ref=e23] [cursor=pointer]
    - group "Cartas perdidas pelo universo":
      - 'button "Abrir carta: A carta que eu nunca enviei" [ref=e24] [cursor=pointer]':
        - generic [ref=e29]: A carta que eu nunca enviei
      - 'button "Abrir carta: Um pequeno defeito meu" [ref=e30] [cursor=pointer]':
        - generic [ref=e35]: Um pequeno defeito meu
      - 'button "Abrir carta: Seus olhos" [ref=e36] [cursor=pointer]':
        - generic [ref=e41]: Seus olhos
      - 'button "Abrir carta: Cinco minutos a mais" [ref=e42] [cursor=pointer]':
        - generic [ref=e47]: Cinco minutos a mais
      - 'button "Abrir carta: Se o futuro me permitir" [ref=e48] [cursor=pointer]':
        - generic [ref=e53]: Se o futuro me permitir
      - 'button "Abrir carta: Se você encontrou esta carta..." [ref=e54] [cursor=pointer]':
        - generic [ref=e59]: Se você encontrou esta carta...
    - group "Portal do Jardim Eterno":
      - button "Aproximar-se do portal do Jardim Eterno" [active] [ref=e60] [cursor=pointer]:
        - generic: Portal do Jardim Eterno
  - contentinfo [ref=e61]:
    - generic [ref=e62]: NOSSA HISTÓRIA ESTÁ SÓ COMEÇANDO
    - list "Atos da experiência" [ref=e63]:
      - listitem [ref=e64]:
        - generic [ref=e65]: "01"
        - generic [ref=e66]: O encontro
      - listitem [ref=e67]:
        - generic [ref=e68]: "02"
        - generic [ref=e69]: A certeza
      - listitem [ref=e70]:
        - generic [ref=e71]: "03"
        - generic [ref=e72]: O infinito
    - generic [aria-hidden] [ref=e73]: ∞ / NÓS DOIS
```