# Alibe Backend

API do projeto Alibe construída com NestJS, TypeScript, Prisma e PostgreSQL.

O projeto adota uma arquitetura modular inspirada em Clean Architecture e SOLID, mantendo as convenções e o sistema de injeção de dependências do NestJS. O objetivo é separar regras de negócio, casos de uso, entrada HTTP e persistência sem transformar cada funcionalidade em um conjunto desnecessário de camadas.

## Sumário

- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Configuração inicial](#configuração-inicial)
- [Executando com Docker](#executando-com-docker)
- [URLs importantes](#urls-importantes)
- [Observabilidade local](#observabilidade-local)
- [Documentação da API com Swagger](#documentação-da-api-com-swagger)
- [Executando a API localmente](#executando-a-api-localmente)
- [Banco de dados e Prisma](#banco-de-dados-e-prisma)
- [Scripts disponíveis](#scripts-disponíveis)
- [Arquitetura](#arquitetura)
- [Como criar um módulo](#como-criar-um-módulo)
- [Testes](#testes)
- [Integração contínua](#integração-contínua)
- [Checklist antes de abrir um Pull Request](#checklist-antes-de-abrir-um-pull-request)
- [Referências](#referências)

## Tecnologias

- Node.js 22
- npm
- NestJS 11
- TypeScript
- Prisma ORM 7
- PostgreSQL 17
- Jest e Supertest
- ESLint e Prettier
- Docker e Docker Compose
- GitHub Actions
- SonarQube Cloud

## Requisitos

### Desenvolvimento completo com Docker

- Git
- Docker Engine ou Docker Desktop
- Docker Compose v2, disponível pelo comando `docker compose`

### Desenvolvimento executando a API fora do Docker

- Git
- Node.js 22.13 ou superior
- npm
- Docker, recomendado para iniciar o PostgreSQL e o Adminer

O Node.js 22.13 ou superior é o padrão do projeto porque também é utilizado no `Dockerfile` e na pipeline. Verifique as versões instaladas:

```bash
node --version
npm --version
docker --version
docker compose version
```

## Configuração inicial

Depois de clonar o repositório, entre na pasta do Backend:

```bash
cd Backend
```

Crie o arquivo local de variáveis de ambiente:

```bash
cp .env.template .env
```

O `.env` não deve ser enviado ao Git. O arquivo `.env.template` contém somente valores de exemplo e deve permanecer atualizado quando uma nova variável obrigatória for adicionada.

Variáveis atuais:

| Variável            | Responsabilidade                                             |
| ------------------- | ------------------------------------------------------------ |
| `DATABASE_USER`     | Usuário criado no PostgreSQL pelo Docker Compose.            |
| `DATABASE_PASSWORD` | Senha do usuário do PostgreSQL.                              |
| `DATABASE_NAME`     | Nome do banco da aplicação.                                  |
| `APP_PORT`          | Porta exposta pela API quando executada pelo Docker Compose. |
| `DATABASE_URL`      | URL de conexão utilizada pelo Prisma.                        |

Nunca coloque tokens, senhas reais ou credenciais de produção no `.env.template`.

## Executando com Docker

Esta é a maneira recomendada para começar, porque API, PostgreSQL e Adminer utilizam a mesma rede do Docker.

### 1. Criar o `.env`

```bash
cp .env.template .env
```

Na execução completamente pelo Docker, esta URL está correta:

```dotenv
DATABASE_URL=postgres://postgres:postgres@alibe-db:5432/alibe
```

Cada parte significa:

```text
postgres:// usuario : senha    @ host     : porta / banco
postgres:// postgres: postgres @ alibe-db : 5432  / alibe
```

`alibe-db` é o nome do serviço PostgreSQL no `docker-compose.yml`. O Docker fornece DNS interno entre os containers, então o container `backend` encontra o banco por esse nome. Essa URL só é correta para processos dentro da rede do Compose; ao executar a API diretamente no computador, use `localhost` como host. O Prisma aceita os protocolos `postgres://` e `postgresql://`.

### 2. Construir e iniciar os serviços

```bash
docker compose up --build
```

Para executar em segundo plano:

```bash
docker compose up --build -d
```

### 3. Testar a API

```bash
curl http://localhost:3000/example
```

Resposta esperada:

```json
{
  "message": "Example module is working"
}
```

### Comandos úteis do Docker Compose

```bash
# Ver os logs do Backend
docker compose logs -f backend

# Parar os containers preservando o volume do banco
docker compose down

# Recriar os serviços depois de alterar dependências ou o Dockerfile
docker compose up --build
```

Não utilize `docker compose down -v` ou `docker compose down --volumes` na rotina do projeto. Esses comandos apagam os dados locais do PostgreSQL, o histórico do Prometheus e o estado do Grafana.

## URLs importantes

Os endereços abaixo consideram o ambiente local com `docker compose up` em execução:

| Recurso              | Endereço                                           | Finalidade                                          |
| -------------------- | -------------------------------------------------- | --------------------------------------------------- |
| API                  | <http://localhost:3000>                            | URL base do Backend.                                |
| Endpoint de exemplo  | <http://localhost:3000/example>                    | Verificação rápida da API.                          |
| Swagger UI           | <http://localhost:3000/docs>                       | Documentação interativa e teste dos endpoints.      |
| OpenAPI JSON         | <http://localhost:3000/docs-json>                  | Contrato OpenAPI consumível por outras ferramentas. |
| Métricas do Backend  | <http://localhost:3000/metrics>                    | Métricas brutas no formato Prometheus.              |
| Prometheus           | <http://localhost:9090>                            | Consulta e inspeção das métricas coletadas.         |
| Grafana              | <http://localhost:3001>                            | Página inicial do Grafana.                          |
| Dashboard do Backend | <http://localhost:3001/d/alibe-backend-monitoring> | Monitoramento do Backend.                           |
| Adminer              | <http://localhost:8080>                            | Interface para inspecionar o PostgreSQL.            |
| PostgreSQL           | `localhost:5432`                                   | Conexão ao banco a partir do computador.            |
| Prisma Studio        | <http://localhost:5555>                            | Interface do Prisma, quando iniciada manualmente.   |

Para iniciar o Prisma Studio pelo container do Backend:

```bash
docker compose exec backend npx prisma studio --hostname 0.0.0.0 --port 5555
```

No Adminer, use `alibe-db` como servidor. Dentro da rede do Compose, containers utilizam nomes de serviços como `alibe-db`, `backend` e `prometheus`; no navegador e em programas executados diretamente no computador, utilize `localhost` e a porta publicada.

## Observabilidade local

Com o Docker Compose em execução, acesse:

- métricas brutas do Backend: <http://localhost:3000/metrics>;
- Prometheus: <http://localhost:9090>;
- página inicial do Grafana: <http://localhost:3001>;
- dashboard direto: <http://localhost:3001/d/alibe-backend-monitoring>.

No primeiro acesso local, use:

```text
Usuário: admin
Senha: admin
```

O Grafana solicitará a definição de uma nova senha. Para navegar manualmente, abra **Dashboards > Browse > Alibe > Alibe Backend Monitoring**. O indicador **Recent dashboards** pode mostrar zero antes que o dashboard seja aberto pela primeira vez.

O trecho `/d/` da URL é uma rota interna do Grafana que significa “dashboard”. O valor seguinte, `alibe-backend-monitoring`, é o UID versionado do dashboard, não uma pasta do projeto.

O dashboard apresenta total e quantidade de requisições ao longo do tempo, total de erros, gráfico temporal da taxa de erros, latência p95, CPU, heap, event loop lag e uptime. Enquanto nenhum endpoint real tiver produzido erro, os painéis de erro mostram zero.

A estrutura dos arquivos, a persistência dos volumes e o processo de exportação do dashboard estão documentados em [`grafana/README.md`](grafana/README.md).

## Documentação da API com Swagger

Com a aplicação em execução:

- interface Swagger UI: <http://localhost:3000/docs>;
- especificação OpenAPI em JSON: <http://localhost:3000/docs-json>.

A configuração global fica em `src/app.setup.ts` e é chamada pelo `main.ts`. Os detalhes de cada endpoint devem permanecer na camada HTTP do respectivo módulo.

Exemplo:

```ts
@ApiTags('Users')
@Controller('users')
export class UsersController {
  @Post()
  @ApiOperation({ summary: 'Cria um usuário' })
  @ApiCreatedResponse({ type: UserResponseDto })
  create(@Body() input: CreateUserDto): Promise<UserResponseDto> {
    return this.createUserUseCase.execute(input);
  }
}
```

Para os schemas de entrada e saída aparecerem corretamente, use classes de DTO com `@ApiProperty()` quando necessário. Decorators do Swagger pertencem a controllers e DTOs HTTP; entidades, services de domínio, repositories e use cases não devem depender de `@nestjs/swagger`.

Ao criar um endpoint:

1. adicione uma tag com `@ApiTags()` no controller;
2. descreva a operação com `@ApiOperation()`;
3. documente as respostas com `@ApiOkResponse()`, `@ApiCreatedResponse()` ou o decorator correspondente;
4. abra `/docs` e confira o contrato gerado;
5. mantenha o teste E2E de `/docs-json` passando.

## Executando a API localmente

Use esta opção quando quiser executar o NestJS diretamente no computador e manter apenas o PostgreSQL no Docker.

### 1. Instalar as dependências

```bash
npm ci
```

`npm ci` utiliza exatamente as versões registradas no `package-lock.json` e é o comando utilizado pela CI. Use `npm install <pacote>` apenas quando estiver adicionando ou atualizando uma dependência.

### 2. Ajustar a conexão local

Crie o `.env` e troque o host da `DATABASE_URL` de `alibe-db` para `localhost`:

```dotenv
DATABASE_URL=postgres://postgres:postgres@localhost:5432/alibe
```

O nome `alibe-db` funciona dentro da rede do Docker. O nome `localhost` é necessário quando a API roda diretamente no computador.

### 3. Iniciar somente o banco

```bash
docker compose up -d alibe-db adminer
```

### 4. Gerar o Prisma Client

```bash
npm run prisma:generate
```

Esse comando lê o `prisma/schema.prisma` e gera o cliente TypeScript tipado em `generated/prisma`.

> **Importante:** `prisma generate` não precisa que o PostgreSQL esteja rodando, não cria o banco, não cria tabelas e não executa migrations. Execute-o depois de `npm ci` e sempre que o `schema.prisma` mudar. O banco é criado pelo PostgreSQL/Docker; as tabelas são criadas ou alteradas por migrations.

Fluxo correto quando alguém adicionar ou alterar um model:

```text
Editar schema.prisma
        ↓
npx prisma migrate dev --name nome_da_alteracao
        ↓
Migration altera o banco de desenvolvimento
        ↓
Prisma Client é regenerado
```

Quando não houver alteração no schema, `npm run prisma:generate` apenas garante que o cliente local esteja disponível e sincronizado com o schema versionado.

### 5. Iniciar a API em modo de desenvolvimento

```bash
npm run start:dev
```

A API ficará disponível em `http://localhost:3000`. Para usar outra porta:

```bash
PORT=3100 npm run start:dev
```

## Banco de dados e Prisma

### Responsabilidade de cada local

| Local                                  | Responsabilidade                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                 | Define datasource, generator e modelos persistidos.                                    |
| `prisma/migrations/`                   | Guarda o histórico versionado das alterações do banco quando migrations forem criadas. |
| `prisma.config.ts`                     | Informa ao Prisma onde estão schema, migrations e `DATABASE_URL`.                      |
| `generated/prisma/`                    | Prisma Client gerado automaticamente; não deve ser editado manualmente.                |
| `src/infrastructure/prisma.service.ts` | Mantém a conexão compartilhada do NestJS com o Prisma.                                 |
| `src/infrastructure/prisma.module.ts`  | Exporta o `PrismaService` para os módulos que precisam de banco.                       |
| `src/modules/<módulo>/persistence/`    | Implementa os repositories daquele módulo usando o `PrismaService`.                    |

O `PrismaService` é compartilhado porque representa uma conexão técnica com o banco. Já cada repository permanece no seu módulo porque traduz dados para o domínio específico daquele módulo.

No Prisma 7, a conexão PostgreSQL em tempo de execução utiliza o driver oficial
`@prisma/adapter-pg`. A `DATABASE_URL` permanece centralizada no ambiente e no
`prisma.config.ts`; o `schema.prisma` define apenas o provider do banco.

### Comandos do Prisma

```bash
# Gerar ou atualizar o Prisma Client sem alterar o banco
npm run prisma:generate

# Criar uma migration durante o desenvolvimento
npx prisma migrate dev --name nome_da_alteracao

# Aplicar migrations já existentes, sem criar uma nova
npx prisma migrate deploy

# Abrir a interface visual do Prisma
npx prisma studio
```

Não crie migrations vazias apenas como exemplo. Uma migration deve representar uma alteração real do schema e deve ser versionada junto com o código que depende dela.

Atualmente os testes do módulo `example` utilizam memória e, portanto, não precisam executar migration. Quando um teste de integração utilizar um repository Prisma real, ele deverá usar um banco exclusivo de teste e a pipeline deverá aplicar `prisma migrate deploy` antes desses testes.

Seeds devem ficar em `prisma/seed.ts` quando forem implementados. O seed deve ser idempotente sempre que possível, ou seja, poder ser executado novamente sem duplicar dados indevidamente. Dados de seed não substituem migrations.

## Scripts disponíveis

| Comando                        | Responsabilidade                                                             |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `npm run start`                | Inicia a aplicação uma vez em modo normal.                                   |
| `npm run start:dev`            | Inicia em modo watch e reinicia após alterações.                             |
| `npm run start:debug`          | Inicia em modo watch com suporte ao debugger.                                |
| `npm run build`                | Compila o projeto para `dist/`.                                              |
| `npm run start:prod`           | Executa o build compilado em `dist/src/main.js`.                             |
| `npm run prisma:generate`      | Gera o Prisma Client.                                                        |
| `npm run format`               | Formata os arquivos com Prettier.                                            |
| `npm run format:check`         | Verifica a formatação sem alterar arquivos.                                  |
| `npm run lint`                 | Verifica o código TypeScript com ESLint.                                     |
| `npm run lint:fix`             | Corrige automaticamente problemas permitidos pelo ESLint.                    |
| `npm run typecheck`            | Verifica os tipos sem gerar build.                                           |
| `npm run test`                 | Executa os testes unitários.                                                 |
| `npm run test:unit`            | Executa explicitamente os testes unitários.                                  |
| `npm run test:watch`           | Executa unitários em modo watch.                                             |
| `npm run test:integration`     | Executa testes de integração.                                                |
| `npm run test:e2e`             | Executa testes ponta a ponta.                                                |
| `npm run test:cov`             | Executa unitários, integração e E2E com coverage para o Sonar.               |
| `npm run test:cov:unit`        | Executa unitários e gera `coverage/unit/lcov.info`.                          |
| `npm run test:cov:integration` | Executa integração e gera `coverage/integration/lcov.info`.                  |
| `npm run test:cov:e2e`         | Executa E2E e gera `coverage/e2e/lcov.info`.                                 |
| `npm run validate`             | Executa geração do Prisma, formatação, lint, tipos, todos os testes e build. |

Antes de abrir um Pull Request, execute:

```bash
npm run validate
```

## Arquitetura

### Princípios adotados

- Organização vertical por módulo de negócio.
- Regras de negócio independentes de HTTP e Prisma.
- Casos de uso pequenos, com uma intenção de negócio clara.
- Repository definido pelo domínio e implementado pela persistência.
- Controllers responsáveis somente pelo protocolo HTTP.
- `*.module.ts` responsável por conectar as dependências do NestJS.
- Dependências apontando para dentro: HTTP e persistência dependem da aplicação ou domínio, e não o contrário.
- Criação de camadas e services somente quando existe uma responsabilidade real.

Esta é uma aplicação pragmática de Clean Architecture. Continuamos utilizando decorators, módulos e injeção de dependência do NestJS, mas evitamos colocar regras de negócio em controllers ou em adapters do Prisma.

### Estrutura do repositório

```text
Backend/
├── .github/
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   └── workflows/
│       └── pr-validation.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/                 # Criada quando existirem migrations
├── src/
│   ├── infrastructure/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── modules/
│   │   └── example/
│   │       ├── application/
│   │       ├── domain/
│   │       ├── http/
│   │       ├── persistence/
│   │       └── example.module.ts
│   ├── app.module.ts
│   ├── app.setup.ts
│   └── main.ts
├── test/
│   ├── unit/modules/
│   ├── integration/modules/
│   ├── e2e/modules/
│   ├── jest-unit.json
│   ├── jest-integration.json
│   └── jest-e2e.json
├── .env.template
├── docker-compose.yml
├── Dockerfile
├── nest-cli.json
├── package.json
├── prisma.config.ts
├── sonar-project.properties
├── tsconfig.json
└── tsconfig.build.json
```

### Raiz do projeto

| Arquivo ou pasta           | Responsabilidade                                                                |
| -------------------------- | ------------------------------------------------------------------------------- |
| `.github/`                 | Regras de contribuição, template de Pull Request e workflows do GitHub Actions. |
| `docs/`                    | Documentação complementar e diagramas editáveis.                                |
| `prisma/`                  | Schema e histórico de migrations do banco.                                      |
| `src/`                     | Código-fonte da aplicação.                                                      |
| `test/`                    | Testes centralizados e separados por tipo e módulo.                             |
| `.env.template`            | Contrato das variáveis de ambiente necessárias.                                 |
| `docker-compose.yml`       | Ambiente de desenvolvimento com Backend, PostgreSQL e Adminer.                  |
| `Dockerfile`               | Etapas de build e imagem de produção da API.                                    |
| `nest-cli.json`            | Configuração da CLI e do compilador NestJS.                                     |
| `package.json`             | Dependências e scripts npm.                                                     |
| `prisma.config.ts`         | Configuração da CLI Prisma.                                                     |
| `sonar-project.properties` | Escopo de análise, testes e coverage do Sonar.                                  |
| `tsconfig.json`            | Regras TypeScript do desenvolvimento.                                           |
| `tsconfig.build.json`      | Exclusões e ajustes específicos do build de produção.                           |

### `src/main.ts`

É o ponto de entrada da aplicação. Cria a instância do NestJS e abre a porta HTTP. Configurações globais de protocolo, como CORS, prefixo global, Swagger e filtros HTTP, podem ser aplicadas aqui ou em uma função de setup chamada por ele.

Não coloque regras de negócio em `main.ts`.

### `src/app.setup.ts`

Centraliza configurações HTTP globais da aplicação, como Swagger, CORS, filtros e interceptors de protocolo. Não deve conter regras de negócio.

### `src/app.module.ts`

É o módulo raiz do NestJS. Ele importa os módulos funcionais da aplicação e registra providers verdadeiramente globais, como o pipe de validação.

Não registre manualmente todos os repositories da aplicação aqui. Cada módulo deve conectar suas próprias dependências.

### `src/infrastructure/`

Guarda recursos técnicos compartilhados por vários módulos, como conexão Prisma, envio de e-mail, armazenamento, filas ou clientes de APIs externas.

Um recurso deve ir para `infrastructure/` quando representa uma tecnologia compartilhada. Regras de negócio não pertencem a essa pasta.

### `src/modules/`

Cada pasta representa um módulo funcional ou contexto de negócio. O módulo deve manter junto seu domínio, seus casos de uso, sua entrada HTTP e seus adapters de persistência.

Estrutura de um módulo:

```text
src/modules/users/
├── domain/
│   ├── user.entity.ts
│   ├── user.repository.ts
│   ├── errors/                     # Opcional
│   └── services/                   # Opcional
├── application/
│   ├── create-user.use-case.ts
│   └── list-users.use-case.ts
├── http/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── user-response.dto.ts
│   └── users.controller.ts
├── persistence/
│   └── prisma-user.repository.ts
└── users.module.ts
```

Pastas opcionais só devem ser criadas quando tiverem arquivos e responsabilidades reais.

#### `domain/`

Contém o núcleo de negócio do módulo:

- Entidades e value objects.
- Regras e invariantes de negócio.
- Contratos de repository.
- Erros específicos do domínio.
- Domain services, quando uma regra não pertence naturalmente a uma única entidade.

O domínio não deve conhecer controllers, DTOs HTTP, Prisma ou detalhes de banco.

O contrato de repository pode ser uma classe abstrata porque interfaces TypeScript não existem em runtime. A classe abstrata também pode ser utilizada como token pela injeção de dependências do NestJS:

```ts
export abstract class UserRepository {
  abstract create(user: User): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
}
```

#### Services de domínio

Services continuam existindo, mas não ficam soltos na raiz do módulo. Quando representam uma regra de domínio, ficam em `domain/services/`:

```text
domain/services/calculate-compatibility.service.ts
```

Use um domain service quando a regra:

- Envolve mais de uma entidade ou value object.
- Não pertence naturalmente a uma entidade específica.
- Continua sendo regra de negócio pura, sem HTTP ou Prisma.

Não crie um service apenas para encaminhar a chamada para outro arquivo.

#### `application/`

Contém os casos de uso da aplicação. Cada use case representa uma intenção de negócio, como `CreateUserUseCase`, `UpdateUserUseCase` ou `ListUsersUseCase`.

Um use case não é obrigatoriamente um endpoint: ele também pode ser chamado por HTTP, fila, tarefa agendada ou outro protocolo. No NestJS, o use case pode receber `@Injectable()` e já funciona como um provider; tecnicamente, ele exerce o papel de um service de aplicação com uma única responsabilidade.

Existem dois estilos válidos, mas não devemos misturá-los sem uma responsabilidade adicional:

```text
# Padrão adotado neste projeto
Controller -> CreateUserUseCase -> UserRepository

# Padrão convencional do Nest, usado quando não há use cases separados
Controller -> UsersService -> UserRepository
```

Não adote `Controller -> UsersService -> UseCase` quando o service apenas repassa a chamada. Isso cria duas classes para a mesma responsabilidade.

O use case não acessa o banco diretamente. Ele depende somente do contrato abstrato definido no domínio:

```text
CreateUserUseCase -> UserRepository (contrato)
PrismaUserRepository -> implementa UserRepository -> PrismaService
```

Domain services continuam disponíveis para regras que não pertencem naturalmente a uma entidade. Nesse caso, o use case orquestra as duas dependências, sem transformá-las obrigatoriamente em uma cadeia:

```text
CreateUserUseCase -> UserPolicyService
CreateUserUseCase -> UserRepository
```

O padrão deste projeto é `Controller -> UseCase -> Repository`, com domain services adicionados somente quando houver regra real para eles.

#### `http/`

É o adapter de entrada HTTP. Contém:

- Controllers.
- DTOs de entrada e saída.
- Validação específica do protocolo.
- Decorators, guards e interceptors específicos daquele módulo, quando necessários.

O controller converte a requisição para a entrada do use case e converte o resultado para a resposta. Ele não deve implementar regra de negócio nem acessar Prisma diretamente.

DTOs ligados a HTTP ficam em `http/dto/`. Eles descrevem body, parâmetros, query e resposta do protocolo, podendo utilizar Zod ou decorators HTTP. Já `CreateUserInput`, `CreateUserCommand` ou tipos semelhantes pertencem a `application/` porque representam a entrada do caso de uso sem depender de HTTP. Não reutilize automaticamente um DTO HTTP como entidade de domínio.

#### `persistence/`

Contém adapters que implementam os contratos definidos em `domain/`. Exemplos:

- `prisma-user.repository.ts` para PostgreSQL com Prisma.
- `in-memory-user.repository.ts` para um adapter simples ou teste.

O repository Prisma pode importar o `PrismaService` compartilhado de `src/infrastructure/`, mas deve devolver entidades ou resultados compreendidos pelo domínio e pela aplicação.

#### `<nome>.module.ts`

É o ponto de composição do módulo. Registra controllers, use cases e o adapter escolhido para cada contrato:

```ts
@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
  ],
})
export class UsersModule {}
```

Esse arquivo deve configurar as dependências, não conter regras de negócio.

### Fluxo de uma requisição

```mermaid
flowchart LR
    Client[Cliente HTTP] --> Controller[Controller em http/]
    Controller --> UseCase[Use case em application/]
    UseCase --> Contract[Contrato em domain/]
    UseCase -. quando necessário .-> DomainService[Service em domain/services/]
    Adapter[Repository em persistence/] -. implementa .-> Contract
    Adapter --> Prisma[PrismaService em infrastructure/]
    Prisma --> Database[(PostgreSQL)]
```

O use case depende do contrato abstrato. O módulo NestJS escolhe qual implementação será injetada. Isso aplica inversão de dependência e permite substituir Prisma por um fake sem alterar o caso de uso.

### Exemplo completo: módulo `users`

Os exemplos abaixo mostram como as peças se conectam. Eles são ilustrativos e só passam a compilar quando o model `User` for realmente adicionado ao `schema.prisma` e sua migration for criada.

#### Entidade de domínio

Arquivo `src/modules/users/domain/user.entity.ts`:

```ts
export interface UserProps {
  id?: string;
  name: string;
  age: number;
}

export class User {
  readonly id?: string;
  readonly name: string;
  readonly age: number;

  constructor(props: UserProps) {
    if (props.age < 0) {
      throw new Error('Age cannot be negative');
    }

    this.id = props.id;
    this.name = props.name;
    this.age = props.age;
  }
}
```

Em TypeScript, esta forma mais curta também salvaria `props` no objeto:

```ts
constructor(private readonly props: UserProps) {}
```

Ela é uma _parameter property_ e equivale a declarar `private readonly props: UserProps` na classe e executar `this.props = props` no construtor. Neste guia usamos campos explícitos (`this.id`, `this.name` e `this.age`) porque são mais fáceis de ler para quem está começando. `readonly` impede reatribuir o campo; não congela automaticamente um objeto inteiro.

#### Contrato do repository

Arquivo `src/modules/users/domain/user.repository.ts`:

```ts
import { User } from './user.entity';

export abstract class UserRepository {
  abstract create(user: User): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
}
```

O contrato pertence ao domínio. Ele descreve o que a aplicação precisa, mas não conhece Prisma ou PostgreSQL.

#### Implementação Prisma do repository

Arquivo `src/modules/users/persistence/prisma-user.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma.service';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(user: User): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        name: user.name,
        age: user.age,
      },
    });

    return new User(record);
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? new User(record) : null;
  }
}
```

Somente essa implementação conhece Prisma. Trocar PostgreSQL por outro adapter não exige alterar o domínio nem o use case.

#### Use case

Arquivo `src/modules/users/application/create-user.use-case.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';

export interface CreateUserInput {
  name: string;
  age: number;
}

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(input: CreateUserInput): Promise<User> {
    const user = new User(input);
    return this.users.create(user);
  }
}
```

O use case conversa com `UserRepository`, não com `PrismaService`. A implementação concreta será escolhida pelo módulo.

#### DTO e controller HTTP

Arquivo `src/modules/users/http/dto/create-user.dto.ts`:

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
```

Arquivo `src/modules/users/http/users.controller.ts`:

```ts
import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.createUserUseCase.execute(body);
  }
}
```

#### Configuração do módulo

Arquivo `src/modules/users/users.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma.module';
import { CreateUserUseCase } from './application/create-user.use-case';
import { UserRepository } from './domain/user.repository';
import { UsersController } from './http/users.controller';
import { PrismaUserRepository } from './persistence/prisma-user.repository';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
  ],
})
export class UsersModule {}
```

Esse é o ponto em que o contrato `UserRepository` é ligado à implementação `PrismaUserRepository`.

## Como criar um módulo

Execute os comandos na raiz do Backend.

### Opção recomendada: gerar cada parte no destino correto

Exemplo para um módulo `users`:

```bash
# Cria o módulo e o registra no AppModule
npx nest g module modules/users

# Entrada HTTP
npx nest g controller modules/users/http/users --flat --no-spec
npx nest g class modules/users/http/dto/create-user.dto --flat --no-spec

# Domínio
npx nest g class modules/users/domain/user.entity --flat --no-spec
npx nest g class modules/users/domain/user.repository --flat --no-spec

# Casos de uso
npx nest g class modules/users/application/create-user.use-case --flat --no-spec
npx nest g class modules/users/application/list-users.use-case --flat --no-spec

# Persistência
npx nest g class modules/users/persistence/prisma-user.repository --flat --no-spec
```

Se houver uma regra que realmente precise de um domain service:

```bash
npx nest g service modules/users/domain/services/user-policy --flat --no-spec
```

Utilizamos `--no-spec` porque os testes ficam centralizados em `test/`, e não ao lado dos arquivos em `src/`.

Depois da geração:

1. Implemente entidade e regras de domínio.
2. Transforme `user.repository.ts` em contrato abstrato.
3. Implemente cada ação em um use case.
4. Implemente o contrato em `persistence/`.
5. Deixe o controller apenas adaptar HTTP para os use cases.
6. Registre controller, use cases e repositories no `users.module.ts`.
7. Crie os testes nas pastas correspondentes em `test/`.
8. Execute `npm run validate`.

Antes de gerar arquivos de verdade, adicione `--dry-run` ao comando para visualizar o resultado:

```bash
npx nest g module modules/users --dry-run
```

### Opção rápida: gerar um CRUD completo e reorganizar

A CLI do NestJS também consegue gerar um resource REST completo:

```bash
npx nest g resource modules/users --type rest --crud true --no-spec
```

Esse comando gera a arquitetura convencional do NestJS, não a arquitetura final deste projeto. Ele normalmente cria:

```text
src/modules/users/
├── dto/
├── entities/
├── users.controller.ts
├── users.service.ts
└── users.module.ts
```

Reorganize da seguinte forma:

| Gerado pela CLI           | Destino ou ação                                                              |
| ------------------------- | ---------------------------------------------------------------------------- |
| `users.controller.ts`     | Mover para `http/users.controller.ts`.                                       |
| `dto/`                    | Mover para `http/dto/`.                                                      |
| `entities/user.entity.ts` | Adaptar para `domain/user.entity.ts`.                                        |
| `users.service.ts`        | Separar cada ação em um use case em `application/` e remover o pass-through. |
| Acesso direto ao Prisma   | Mover para `persistence/prisma-user.repository.ts`.                          |
| Contrato do repository    | Criar em `domain/user.repository.ts`.                                        |
| `users.module.ts`         | Manter na raiz e configurar a injeção de dependências.                       |

O `users.service.ts` gerado pela CLI representa a camada de aplicação convencional do Nest. Como este projeto separa as ações em use cases, distribua seus métodos entre os use cases e remova o service que apenas repassaria chamadas. Services com regras puras que envolvem entidades ficam em `domain/services/`.

A geração de um resource pode atualizar dependências do `package.json`. Sempre confira o diff e execute `npm install` se a CLI adicionar alguma dependência.

### Criar a estrutura dos testes do módulo

```bash
mkdir -p test/unit/modules/users
mkdir -p test/integration/modules/users
mkdir -p test/e2e/modules/users
```

Crie os arquivos seguindo o padrão:

```text
test/unit/modules/users/create-user.use-case.spec.ts
test/integration/modules/users/prisma-user.repository.integration-spec.ts
test/e2e/modules/users/create-user.e2e-spec.ts
```

## Testes

O projeto mantém três tipos de testes. Eles possuem objetivos diferentes e não devem ser tratados como três cópias do mesmo teste.

### Testes unitários

Local:

```text
test/unit/modules/<módulo>/*.spec.ts
```

Testam uma unidade isolada, normalmente entidade, domain service ou use case. Dependências são substituídas por fakes ou mocks. Não inicializam a API, não fazem HTTP e não precisam de banco.

Exemplo atual:

```text
test/unit/modules/example/get-example.use-case.spec.ts
```

Executar:

```bash
npm run test:unit
```

#### Exemplo de teste unitário

Arquivo `test/unit/modules/users/create-user.use-case.spec.ts`:

```ts
import { User } from '../../../../src/modules/users/domain/user.entity';
import { UserRepository } from '../../../../src/modules/users/domain/user.repository';
import { CreateUserUseCase } from '../../../../src/modules/users/application/create-user.use-case';

class FakeUserRepository extends UserRepository {
  create(user: User): Promise<User> {
    return Promise.resolve(user);
  }

  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }
}

describe('CreateUserUseCase', () => {
  it('creates a valid user', async () => {
    const useCase = new CreateUserUseCase(new FakeUserRepository());

    const user = await useCase.execute({ name: 'Ana', age: 24 });

    expect(user.name).toBe('Ana');
    expect(user.age).toBe(24);
  });
});
```

O teste não inicializa NestJS, HTTP ou PostgreSQL. Ele verifica somente o use case e utiliza uma implementação fake do contrato.

### Testes de integração

Local:

```text
test/integration/modules/<módulo>/*.integration-spec.ts
```

Verificam componentes trabalhando juntos. Podem compilar um módulo NestJS para validar a injeção de dependências ou testar um repository Prisma contra um banco de teste. Normalmente chamam use case, service ou repository diretamente, sem requisição HTTP.

Exemplo atual:

```text
ExampleModule -> GetExampleUseCase -> InMemoryExampleRepository
```

#### Exemplo de teste de integração

O módulo `example` demonstra a integração entre providers sem banco real:

```ts
const moduleFixture = await Test.createTestingModule({
  imports: [ExampleModule],
}).compile();

const useCase = moduleFixture.get(GetExampleUseCase);

await expect(useCase.execute()).resolves.toEqual({
  message: 'Example module is working',
});
```

Esse teste confirma que o NestJS conseguiu montar `GetExampleUseCase` e `InMemoryExampleRepository` usando a configuração do módulo.

Executar:

```bash
npm run test:integration
```

### Testes E2E

E2E significa End to End, ou ponta a ponta.

Local:

```text
test/e2e/modules/<módulo>/*.e2e-spec.ts
```

Inicializam a aplicação NestJS e fazem uma requisição HTTP com Supertest. Validam rota, controller, validação, use case, providers e resposta HTTP como um fluxo completo.

Exemplo atual:

```text
GET /example -> ExampleController -> GetExampleUseCase -> Repository -> HTTP 200
```

#### Exemplo de teste E2E

```ts
const moduleFixture = await Test.createTestingModule({
  imports: [AppModule],
}).compile();

app = moduleFixture.createNestApplication();
await app.init();

await request(app.getHttpServer())
  .get('/example')
  .expect(200)
  .expect({ message: 'Example module is working' });
```

Esse teste entra pela API HTTP e percorre controller, use case e repository até validar a resposta.

Executar:

```bash
npm run test:e2e
```

### Quando criar cada teste

| Alteração                                      | Teste esperado                                   |
| ---------------------------------------------- | ------------------------------------------------ |
| Nova regra de entidade ou domain service       | Unitário.                                        |
| Novo use case ou mudança de regra              | Unitário.                                        |
| Novo repository Prisma ou integração externa   | Integração.                                      |
| Mudança na configuração de providers do módulo | Integração.                                      |
| Novo endpoint ou fluxo HTTP importante         | E2E.                                             |
| Correção de bug                                | Teste no nível mais próximo que reproduza o bug. |

Não é obrigatório repetir todas as condições em todos os níveis. O unitário cobre detalhes da regra; a integração cobre conexões importantes; o E2E cobre o fluxo HTTP principal.

### Coverage

```bash
npm run test:cov
```

O Jest mede quais linhas de `src/` foram executadas e gera relatórios LCOV separados em `coverage/unit/`, `coverage/integration/` e `coverage/e2e/`. A localização dos testes em `test/` não impede a medição do código-fonte.

O Sonar combina os três relatórios. Assim, código exercitado apenas por integração ou E2E — como controllers e configuração HTTP — também entra no cálculo. Arquivos puramente declarativos (`main.ts`, `*.module.ts` e `*.dto.ts`) ficam fora da métrica de coverage, mas continuam sendo analisados pelas demais regras de qualidade.

## Integração contínua

O workflow `.github/workflows/pr-validation.yml` executa CI em:

- Pull Requests direcionados a `develop` ou `main`.
- Pushes realizados em `develop` ou `main`.

Os jobs de qualidade, testes e build podem executar em paralelo. O Sonar só inicia depois que os três terminam com sucesso.

```text
PR ou push em develop/main
    → qualidade, testes e build
    → análise do Sonar
    → checks concluídos
```

O workflow atual implementa somente CI. Ele valida o código, mas não publica ou implanta a aplicação.

### Espelhamento da `main` no GitLab AGES

O workflow `.github/workflows/mirror-to-gitlab-backend.yml` está preparado para replicar a branch `main` do GitHub no GitLab AGES. Ele possui os mesmos gatilhos do Frontend — push em `main` e execução manual — mas permanece **desabilitado por padrão**.

```text
Merge aprovado na main do GitHub
    → workflow Mirror Backend to AGES GitLab
    → checkout completo da main
    → push de main:main
    → GitLab AGES atualizado
```

O job somente executa quando a variável `GITLAB_MIRROR_ENABLED` possuir exatamente o valor `true`. Enquanto a variável estiver ausente ou com `false`, nenhum contato ou push para o GitLab será realizado.

#### Configuração necessária no GitHub

No repositório **Backend**, acesse **Settings > Secrets and variables > Actions**.

Em **Secrets**, cadastre:

| Secret            | Conteúdo                                                               |
| ----------------- | ---------------------------------------------------------------------- |
| `GITLAB_USERNAME` | Usuário com permissão de escrita no repositório Backend do GitLab.     |
| `GITLAB_PASSWORD` | Token do GitLab com permissão `write_repository`, não a senha pessoal. |

Em **Variables**, cadastre:

| Variable                | Conteúdo                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `GITLAB_REPOSITORY_URL` | URL HTTPS exata do repositório Backend, terminando em `.git`.                                    |
| `GITLAB_MIRROR_ENABLED` | Comece com `false`. Altere para `true` somente quando estiver pronto para ativar o espelhamento. |

A URL esperada pela organização atual deve ser confirmada no próprio GitLab antes da ativação. Não copie automaticamente a URL do Frontend: abra o projeto Backend no GitLab, selecione **Code > Clone with HTTPS** e copie o endereço exibido.

#### Preparação necessária no GitLab

1. Confirme que o projeto Backend pertence ao grupo correto da disciplina.
2. Gere um Project Access Token ou Personal Access Token com `write_repository`.
3. Garanta que o usuário ou token tenha permissão para enviar commits à `main`.
4. Compare a `main` do GitLab com a `main` do GitHub antes do primeiro teste.

#### Ativação e primeiro teste

1. Mantenha `GITLAB_MIRROR_ENABLED=false` enquanto cadastra URL e secrets.
2. Confirme que não existem commits importantes somente no GitLab.
3. Altere `GITLAB_MIRROR_ENABLED` para `true`.
4. Acesse **Actions > Mirror Backend to AGES GitLab > Run workflow**.
5. Na primeira tentativa, mantenha **force_initial_sync** desmarcado.
6. Verifique o log do job e confirme no GitLab se o SHA da `main` coincide com o GitHub.
7. Depois do teste, mantenha `true` para espelhar automaticamente cada novo push em `main`, ou retorne para `false` para pausar.

Se a primeira tentativa falhar com `fetch first` ou `non-fast-forward`, os históricos são diferentes. Depois de confirmar que os commits exclusivos do GitLab podem ser descartados:

1. No GitLab, habilite temporariamente force push para a regra da branch `main`.
2. No GitHub, abra **Actions > Mirror Backend to AGES GitLab > Run workflow**.
3. Marque **force_initial_sync** e execute o workflow.
4. Confirme que a `main` possui o mesmo SHA nas duas plataformas.
5. Desabilite novamente o force push da `main` no GitLab.

A opção manual usa `--force-with-lease` com o SHA obtido imediatamente antes do envio. Se outra alteração chegar ao GitLab nesse intervalo, a operação é recusada em vez de sobrescrevê-la. Pushes automáticos nunca usam force.

O workflow executa `git fetch` para conhecer o estado remoto, mas não executa `git pull`. Como o GitHub é a fonte oficial, trazer e mesclar commits do GitLab durante o espelhamento criaria históricos diferentes.

Esse espelhamento apenas replica código-fonte. Ele não publica imagem, não faz deploy e não representa CD.

### SonarQube

O job do Sonar utiliza o secret `SONAR_TOKEN` configurado no GitHub. Tokens nunca devem ser colocados no workflow, no README ou no repositório.

O Sonar recebe os relatórios LCOV produzidos pelos testes unitários, de integração e E2E e usa `sonar-project.properties` para identificar código-fonte, testes e exclusões justificadas de coverage.

## Checklist antes de abrir um Pull Request

- [ ] O código respeita as responsabilidades das camadas.
- [ ] Controllers não possuem regras de negócio ou acesso direto ao Prisma.
- [ ] Use cases dependem de contratos, não de implementações Prisma concretas.
- [ ] Novas variáveis foram adicionadas ao `.env.template` sem valores secretos.
- [ ] Migrations reais foram incluídas quando o schema mudou.
- [ ] Testes adequados foram criados ou atualizados.
- [ ] `npm run validate` passou localmente.
- [ ] O Pull Request explica o que foi feito, como foi feito e como testar.

## Referências

- [Documentação do NestJS](https://docs.nestjs.com/)
- [NestJS CLI](https://docs.nestjs.com/cli/overview)
- [Testes no NestJS](https://docs.nestjs.com/fundamentals/testing)
- [Documentação do Prisma](https://www.prisma.io/docs)
- [Docker Compose](https://docs.docker.com/compose/)
- [GitHub Actions](https://docs.github.com/actions)
