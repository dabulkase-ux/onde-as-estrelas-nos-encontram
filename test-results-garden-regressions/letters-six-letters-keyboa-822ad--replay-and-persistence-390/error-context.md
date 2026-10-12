# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: letters.spec.ts >> six letters, keyboard, scroll, replay and persistence 390
- Location: tests\letters.spec.ts:14:41

# Error details

```
Test timeout of 80000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - banner [ref=f2e5]:
    - generic "meu universo" [ref=f2e6]
    - button "Ativar sons" [ref=f2e10] [cursor=pointer]
  - main:
    - generic [ref=f2e15]:
      - paragraph [ref=f2e16]: ENTRE TODAS AS POSSIBILIDADES
      - heading [level=1] [ref=f2e17]:
        - text: Você acabou de entrar
        - emphasis [ref=f2e18]: no meu universo.
      - paragraph [ref=f2e19]: E, de algum jeito, ele sempre foi seu.
      - button "Viver de novo" [ref=f2e20] [cursor=pointer]: Viver de novo ↺
    - button "Compatibilidade" [ref=f2e21] [cursor=pointer]
    - button "Quiz de Casal" [ref=f2e25] [cursor=pointer]
    - group "Cartas perdidas pelo universo":
      - 'button "Reler carta: A carta que eu nunca enviei" [ref=f2e26] [cursor=pointer]':
        - generic [ref=f2e31]: A carta que eu nunca enviei — lida
      - 'button "Reler carta: Um pequeno defeito meu"':
        - generic: Um pequeno defeito meu — lida
      - 'button "Reler carta: Seus olhos" [ref=f2e32] [cursor=pointer]':
        - generic [ref=f2e37]: Seus olhos — lida
      - 'button "Reler carta: Cinco minutos a mais"':
        - generic: Cinco minutos a mais — lida
      - 'button "Reler carta: Se o futuro me permitir" [ref=f2e38] [cursor=pointer]':
        - generic [ref=f2e43]: Se o futuro me permitir — lida
      - 'button "Reler carta: Se você encontrou esta carta..." [active]':
        - generic: Se você encontrou esta carta... — lida
    - group "Portal do Jardim Eterno":
      - button "Aproximar-se do portal do Jardim Eterno" [ref=f2e44] [cursor=pointer]:
        - generic [ref=f2e45]: Portal do Jardim Eterno
  - contentinfo [ref=f2e46]:
    - list "Atos da experiência" [ref=f2e47]:
      - listitem [ref=f2e48]:
        - generic [ref=f2e49]: "01"
        - generic [ref=f2e50]: O encontro
      - listitem [ref=f2e51]:
        - generic [ref=f2e52]: "02"
        - generic [ref=f2e53]: A certeza
      - listitem [ref=f2e54]:
        - generic [ref=f2e55]: "03"
        - generic [ref=f2e56]: O infinito
```