# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: eyes.spec.ts >> persisted replay does not auto-trigger and a quiz is never interrupted
- Location: tests\eyes.spec.ts:72:1

# Error details

```
Test timeout of 80000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e5]:
    - generic "meu universo" [ref=f1e6]
    - button "Ativar sons" [ref=f1e10] [cursor=pointer]
  - main [active]:
    - generic [ref=f1e15]:
      - paragraph: ENTRE TODAS AS POSSIBILIDADES
      - heading "Você acabou de entrar no meu universo." [level=1]:
        - text: Você acabou de entrar
        - emphasis: no meu universo.
      - paragraph: E, de algum jeito, ele sempre foi seu.
      - button "Viver de novo" [ref=f1e16] [cursor=pointer]: Viver de novo ↺
    - button "Compatibilidade — rever declaração" [ref=f1e17] [cursor=pointer]:
      - text: Compatibilidade
      - generic [ref=f1e21]: — rever declaração
    - button "Quiz de Casal" [ref=f1e22] [cursor=pointer]
    - group "Cartas perdidas pelo universo":
      - 'button "Reler carta: A carta que eu nunca enviei" [ref=f1e23] [cursor=pointer]':
        - generic [ref=f1e28]: A carta que eu nunca enviei — lida
      - 'button "Reler carta: Um pequeno defeito meu"':
        - generic: Um pequeno defeito meu — lida
      - 'button "Reler carta: Seus olhos" [ref=f1e29] [cursor=pointer]':
        - generic [ref=f1e34]: Seus olhos — lida
      - 'button "Reler carta: Cinco minutos a mais"':
        - generic: Cinco minutos a mais — lida
      - 'button "Reler carta: Se o futuro me permitir" [ref=f1e35] [cursor=pointer]':
        - generic [ref=f1e40]: Se o futuro me permitir — lida
      - 'button "Reler carta: Se você encontrou esta carta..."':
        - generic: Se você encontrou esta carta... — lida
    - group "Portal do Jardim Eterno":
      - button "Aproximar-se do portal do Jardim Eterno" [ref=f1e41] [cursor=pointer]:
        - generic [ref=f1e42]: Portal do Jardim Eterno
    - group "Buraco Negro dos Segredos"
    - button "Rever o olhar entre as estrelas" [ref=f1e43] [cursor=pointer]
  - contentinfo [ref=f1e48]:
    - list "Atos da experiência" [ref=f1e49]:
      - listitem [ref=f1e50]:
        - generic [ref=f1e51]: "01"
        - generic [ref=f1e52]: O encontro
      - listitem [ref=f1e53]:
        - generic [ref=f1e54]: "02"
        - generic [ref=f1e55]: A certeza
      - listitem [ref=f1e56]:
        - generic [ref=f1e57]: "03"
        - generic [ref=f1e58]: O infinito
```