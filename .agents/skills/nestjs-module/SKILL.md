---
name: nestjs-module
description: Criar, reorganizar ou evoluir módulos de negócio no Backend Alibe com NestJS, arquitetura modular inspirada em Clean Architecture, use cases, HTTP, repositories e injeção de dependências. Use para novos módulos, endpoints, services, SSE ou revisão da responsabilidade das camadas; não use para mudanças exclusivamente de banco ou testes.
---

# NestJS Module

Crie módulos que preservem as convenções do NestJS sem misturar domínio, HTTP e persistência.

## Before Editing

1. Leia o `AGENTS.md` da raiz e a seção de arquitetura do `README.md`.
2. Inspecione um módulo existente e o `AppModule`; não suponha que o exemplo documentado já exista na branch atual.
3. Verifique `git status` e preserve alterações alheias.
4. Confirme a intenção de negócio e os protocolos necessários. Um use case não equivale obrigatoriamente a um endpoint.

## Target Shape

Use somente as partes necessárias:

```text
src/modules/<module>/
├── domain/
│   ├── <entity>.entity.ts
│   ├── <entity>.repository.ts
│   └── services/                  # opcional
├── application/
│   ├── <action>.use-case.ts
│   └── services/                  # opcional
├── http/
│   ├── dto/
│   └── <module>.controller.ts
├── persistence/
│   └── prisma-<entity>.repository.ts
└── <module>.module.ts
```

Não crie pastas vazias ou camadas pass-through.

## CLI Workflow

Prefira gerar cada peça já no destino correto:

```bash
npx nest g module modules/<module>
npx nest g controller modules/<module>/http/<module> --flat --no-spec
npx nest g class modules/<module>/http/dto/<dto> --flat --no-spec
npx nest g class modules/<module>/domain/<entity>.entity --flat --no-spec
npx nest g class modules/<module>/domain/<entity>.repository --flat --no-spec
npx nest g class modules/<module>/application/<action>.use-case --flat --no-spec
npx nest g class modules/<module>/persistence/prisma-<entity>.repository --flat --no-spec
```

Use `--dry-run` quando o destino ou as alterações automáticas da CLI não estiverem claros. Se usar `nest g resource`, trate o resultado como scaffold: mova HTTP e domínio, separe ações em use cases e remova services que apenas repassam chamadas.

## Dependency Direction

- Domínio não importa Nest HTTP, DTOs ou Prisma.
- Application depende de contratos do domínio.
- HTTP depende de application e converte entrada e saída.
- Persistence depende do domínio e da infraestrutura Prisma compartilhada.
- O módulo Nest registra o contrato com `provide` e o adapter com `useClass`.
- Domain services são regras puras que não pertencem naturalmente a uma entidade.
- Application services existem para uma responsabilidade transversal de aplicação, como publicação de eventos; não os coloque artificialmente entre controller e use case.

## HTTP, Swagger and SSE

Mantenha o controller fino e documente cada endpoint com Swagger. DTOs de body, params, query e resposta ficam em `http/dto/`; não os transforme automaticamente em entidades.

Para SSE:

- exponha uma rota estática antes de `/:id` quando houver risco de conflito;
- retorne `Observable<MessageEvent>`;
- declare `text/event-stream`;
- teste publicação e assinatura sem deixar o runner pendurado;
- registre limitações de um `Subject` em memória quando o sistema puder escalar horizontalmente.

## Related Work

- Se a mudança exige model ou migration, leia `../prisma-change/SKILL.md`.
- Se cria ou altera comportamento, leia `../backend-testing/SKILL.md`.

## Completion

Confirme composição do módulo, Swagger, geração Prisma quando aplicável e os testes proporcionais. Execute formatação, lint, tipos, testes relevantes e build. Não faça commit ou push sem autorização explícita.
