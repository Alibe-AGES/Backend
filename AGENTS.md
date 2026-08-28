# Alibe Backend Agent Guide

## Project

- Backend NestJS 11 com TypeScript, Prisma 7 e PostgreSQL 17.
- Use Node.js 22 e exclusivamente npm; mantenha o `package-lock.json` sincronizado.
- Preserve a arquitetura modular descrita no `README.md`.
- Não altere Frontend, infraestrutura externa, branches remotas, secrets, GitHub ou GitLab sem autorização explícita.

## Source Ownership

| Local                                     | Responsabilidade                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/modules/<module>/domain/`            | Entidades, invariantes, contratos de repository e domain services opcionais        |
| `src/modules/<module>/application/`       | Use cases e services de aplicação com responsabilidade real                        |
| `src/modules/<module>/http/`              | Controllers, DTOs, validação e detalhes de protocolo                               |
| `src/modules/<module>/persistence/`       | Adapters que implementam contratos do domínio                                      |
| `src/modules/<module>/<module>.module.ts` | Composição de providers, controllers e adapters                                    |
| `src/infrastructure/`                     | Recursos técnicos compartilhados, como Prisma, métricas, filas e clientes externos |
| `prisma/`                                 | Schema e histórico versionado de migrations                                        |
| `test/unit/`                              | Testes isolados de domínio e aplicação                                             |
| `test/integration/`                       | Testes de componentes conectados, módulos e adapters                               |
| `test/e2e/`                               | Fluxos HTTP executados pela aplicação NestJS                                       |

## Architecture Rules

- Organize verticalmente por módulo de negócio.
- O fluxo padrão é `Controller -> UseCase -> Repository contract -> Adapter`.
- Controllers não acessam Prisma e não implementam regras de negócio.
- Use cases representam intenções de negócio e podem ser chamados por HTTP, SSE, fila ou tarefa agendada.
- Defina o contrato de repository no domínio, normalmente como classe abstrata utilizável como token do Nest.
- Mantenha o `PrismaService` compartilhado em `src/infrastructure/`; mantenha cada repository Prisma no módulo proprietário.
- Crie `domain/services/`, `application/services/`, `errors/` ou outras pastas opcionais somente quando existir responsabilidade real.
- Não crie um service que apenas encaminha a chamada para um use case ou repository.
- O arquivo `*.module.ts` é o composition root do módulo: conecta controllers, use cases, services e implementações dos contratos.

## HTTP and API Documentation

- DTOs HTTP ficam em `http/dto/`; entradas de use case continuam em `application/`.
- Use o mecanismo de validação já configurado no projeto; não adicione outra biblioteca sem necessidade.
- Documente novos endpoints com Swagger: tag, operação, respostas e parâmetros ou body relevantes.
- A configuração HTTP global permanece em `src/app.setup.ts`.
- Para SSE, retorne `Observable<MessageEvent>`, declare `text/event-stream` e evite estado em memória quando o requisito exigir múltiplas instâncias ou entrega confiável.

## Prisma and Database

- Não coloque `DATABASE_URL` no `schema.prisma`; Prisma 7 lê a URL por `prisma.config.ts`.
- `prisma generate` atualiza tipos e não altera o banco.
- `prisma migrate dev` cria uma migration de desenvolvimento e altera o banco; execute somente quando autorizado.
- `prisma migrate deploy` aplica migrations versionadas e não cria migrations.
- Versione a migration junto com o código que depende dela.
- Não use `prisma db push`, reset de banco ou `docker compose down -v` como rotina.
- O Docker Compose gera o Client e aplica migrations pendentes antes de iniciar a API.

## Testing

- Coloque todos os testes sob `test/`, separados por tipo e módulo; não gere specs dentro de `src/`.
- Nova regra de entidade, domain service ou use case exige teste unitário.
- Nova configuração de providers ou adapter exige integração proporcional ao risco.
- Novo endpoint ou fluxo HTTP importante exige E2E.
- Não replique todas as mesmas asserções nos três níveis.
- Testes com Prisma real usam banco exclusivo de teste, migrations aplicadas e limpeza determinística.

## Validation

Execute primeiro o menor teste relevante. Antes de concluir uma alteração, quando o ambiente permitir:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```

O atalho completo é:

```bash
npm run validate
```

Não esconda falhas com exclusões de coverage ou desabilitação de regras. Explique limitações reais de ambiente.

## Change Hygiene

- Preserve mudanças não relacionadas e arquivos não rastreados do usuário.
- Inspecione `git status` antes e depois da alteração.
- Não execute commit, push, merge, reset, checkout, stash ou limpeza de arquivos sem solicitação explícita.
- Nunca exponha ou versione `.env`, tokens ou credenciais.
- Atualize o `README.md` quando mudar arquitetura, setup, comandos ou comportamento operacional.

## Local Skills

- Para criar ou reorganizar módulos, leia `.agents/skills/nestjs-module/SKILL.md`.
- Para alterar schema, repository Prisma ou migrations, leia `.agents/skills/prisma-change/SKILL.md`.
- Para criar ou revisar testes, leia `.agents/skills/backend-testing/SKILL.md`.
