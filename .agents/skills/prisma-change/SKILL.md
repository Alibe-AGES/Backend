---
name: prisma-change
description: Alterar persistência PostgreSQL do Backend Alibe com Prisma 7, incluindo schema, Prisma Client, repositories, migrations e inicialização Docker. Use quando uma mudança cria ou altera models, constraints, relações, índices, migrations ou adapters Prisma; não use para regras puramente em memória.
---

# Prisma Change

Faça mudanças de banco reproduzíveis, versionadas e compatíveis com o fluxo Docker do projeto.

## Inspect First

Leia `AGENTS.md`, `prisma/schema.prisma`, `prisma.config.ts`, o repository do módulo e as migrations existentes. Verifique a branch e o working tree antes de gerar arquivos.

O datasource permanece assim:

```prisma
datasource db {
  provider = "postgresql"
}
```

A URL vem de `prisma.config.ts` e do ambiente. Não restaure `url = env("DATABASE_URL")` no schema do Prisma 7.

## Change Workflow

1. Modele a alteração no domínio e no `schema.prisma`.
2. Gere o Client para atualizar os tipos:
   ```bash
   npm run prisma:generate
   ```
3. Somente com autorização para alterar o banco de desenvolvimento, crie uma migration com nome descritivo:
   ```bash
   docker compose run --rm backend npx prisma migrate dev --name <nome>
   ```
4. Revise o SQL gerado; não aceite perda de dados silenciosa.
5. Versione `schema.prisma`, toda a pasta da migration e o código dependente na mesma mudança.
6. Valide o repository e o fluxo que usa a alteração.

`migrate dev` cria migration e altera banco de desenvolvimento. `migrate deploy` apenas aplica migrations versionadas. Não substitua um pelo outro.

## Docker Behavior

O Docker Compose deve:

1. aguardar o healthcheck do PostgreSQL;
2. executar `prisma generate` dentro do container;
3. executar `prisma migrate deploy`;
4. iniciar o NestJS.

Quem clona o projeto aplica migrations pendentes com `docker compose up --build`. Quem altera o schema continua responsável por criar a nova migration.

Ao rodar a API fora do Docker, use `localhost` na `DATABASE_URL`; dentro do Compose, use o serviço `alibe-db`.

## Repository Boundary

- O contrato permanece em `domain/`.
- A implementação Prisma permanece em `persistence/`.
- O adapter converte registros Prisma para entidades ou resultados compreendidos pela aplicação.
- Controllers e use cases não acessam `PrismaService` diretamente.
- O `PrismaService` compartilhado permanece em `src/infrastructure/`.

## Safety

- Não use `prisma db push` para mudanças versionadas.
- Não execute `prisma migrate reset`, exclua migrations aplicadas, apague volumes ou force perda de dados sem autorização explícita.
- Não crie migration vazia apenas como exemplo.
- Não edite `generated/prisma/` manualmente.
- Não inclua credenciais reais em schema, config, Compose ou documentação.
- Se o Client local e o Client do volume Docker divergirem, gere novamente nos dois ambientes; isso não é migration.

## Testing and CI

Use banco exclusivo quando integration ou E2E exercitar Prisma real. Aplique `prisma migrate deploy` antes desses testes e faça limpeza determinística entre casos. Não aponte testes para banco de desenvolvimento ou produção.

Leia `../backend-testing/SKILL.md` para decidir o nível correto. Antes de concluir, execute `prisma generate`, tipos, teste focado e validações amplas proporcionais ao risco.
