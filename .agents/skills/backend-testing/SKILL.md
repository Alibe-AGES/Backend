---
name: backend-testing
description: Criar, organizar ou revisar testes do Backend Alibe em Jest e Supertest, separados em unitários, integração e E2E por módulo, com coverage consumido pelo Sonar. Use para novo comportamento, correções, repositories, endpoints, SSE, configuração Jest ou pipeline de testes.
---

# Backend Testing

Escolha o menor nível que prova o comportamento e complemente com outros níveis somente quando validarem limites diferentes.

## Locations and Names

```text
test/unit/modules/<module>/*.spec.ts
test/integration/modules/<module>/*.integration-spec.ts
test/e2e/modules/<module>/*.e2e-spec.ts
```

Testes de infraestrutura compartilhada ficam sob o mesmo tipo em `test/<type>/infrastructure/`. Não coloque specs em `src/`; os generators Nest devem usar `--no-spec`.

## Test Matrix

| Mudança                                  | Cobertura esperada                                 |
| ---------------------------------------- | -------------------------------------------------- |
| Entidade, value object ou domain service | Unitário                                           |
| Use case ou regra de aplicação           | Unitário                                           |
| Wiring de providers do módulo            | Integração                                         |
| Repository Prisma ou cliente externo     | Integração com dependência controlada              |
| Endpoint ou fluxo HTTP importante        | E2E                                                |
| Correção de bug                          | Teste no nível mais próximo que reproduz o defeito |

Os níveis não são cópias. Unitários cobrem ramificações e invariantes; integração cobre conexões; E2E cobre o caminho HTTP principal.

## Unit Tests

Instancie a unidade diretamente. Use fake ou mock do contrato de repository e não inicialize Nest, HTTP ou PostgreSQL. Cubra caminho feliz, validações e falhas relevantes sem testar detalhes privados.

Para services de eventos ou SSE, assine com operadores limitadores como `take(1)` e converta para Promise com `firstValueFrom`; publique depois da assinatura para evitar timeout. Sempre finalize subscriptions abertas.

## Integration Tests

Use `Test.createTestingModule` para validar composição e injeção quando isso for o objetivo. Chame use case, service ou repository diretamente, sem Supertest.

Um repository Prisma real exige:

- banco exclusivo de teste;
- `DATABASE_URL` de teste;
- migrations aplicadas com `prisma migrate deploy`;
- limpeza determinística antes ou depois dos casos;
- dados únicos para evitar dependência de ordem.

Se o objetivo é somente wiring, substitua o adapter externo por fake e não conecte ao banco.

## E2E Tests

Inicialize a aplicação com `AppModule`, aplique `setupApplication(app)`, chame `app.init()` e use Supertest. Valide status, contrato de resposta, validação e um fluxo principal. Feche a aplicação no teardown.

E2E com Prisma real segue as mesmas regras de isolamento do banco. Evite testes de stream que nunca terminam; para SSE, limite a leitura, imponha timeout e encerre conexão e aplicação explicitamente.

## Commands

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:cov
```

Para iteração, execute primeiro um arquivo com a configuração Jest correspondente. Antes do PR, execute `npm run validate` quando o ambiente de banco estiver disponível.

## Coverage and Sonar

O Jest gera LCOV separado em `coverage/unit`, `coverage/integration` e `coverage/e2e`; o Sonar combina os relatórios configurados em `sonar-project.properties`.

Não aumente coverage com testes sem comportamento, não exclua novo código apenas para satisfazer o Quality Gate e não conte DTOs ou modules declarativos como substitutos de cobertura de regras. Se o pipeline usa Prisma real, configure um PostgreSQL de teste e aplique migrations antes dos testes dependentes.

## Completion

Confirme que os testes são determinísticos, independentes de ordem, fecham recursos e passam isoladamente e em conjunto. Execute formatação, lint e tipos além dos testes. Não faça commit ou push sem autorização explícita.
