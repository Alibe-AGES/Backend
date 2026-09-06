# Alibe Backend

API do projeto Alibe construída com NestJS, TypeScript, Prisma e PostgreSQL.

O projeto adota uma arquitetura modular inspirada em Clean Architecture e SOLID, mantendo as convenções e o sistema de injeção de dependências do NestJS. O objetivo é separar regras de negócio, casos de uso, entrada HTTP e persistência sem transformar cada funcionalidade em um conjunto desnecessário de camadas.

## Sumário

- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Configuração inicial](#configuração-inicial)
- [Executando com Docker](#executando-com-docker)
- [URLs importantes](#urls-importantes)
- [Infraestrutura AWS com MiniStack e CloudFormation](#infraestrutura-aws-com-ministack-e-cloudformation)
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
- AWS CloudFormation
- AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`)
- MiniStack para emulação local de serviços AWS

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

| Variável                | Responsabilidade                                                |
| ----------------------- | --------------------------------------------------------------- |
| `DATABASE_USER`         | Usuário criado no PostgreSQL pelo Docker Compose.               |
| `DATABASE_PASSWORD`     | Senha do usuário do PostgreSQL.                                 |
| `DATABASE_NAME`         | Nome do banco da aplicação.                                     |
| `APP_PORT`              | Porta exposta pela API quando executada pelo Docker Compose.    |
| `DATABASE_URL`          | URL de conexão utilizada pelo Prisma.                           |
| `MOCK_AUTH_ENABLED`     | Ativa temporariamente o usuário simulado da Sprint 1.           |
| `MOCK_AUTH_USER_ID`     | UUID de um usuário criado pela seed e injetado em cada request. |
| `AWS_REGION`            | Região usada pelo MiniStack e pelos comandos da AWS CLI.        |
| `AWS_S3_BUCKET`         | Nome do bucket utilizado pela aplicação.                        |
| `AWS_ENDPOINT_URL`      | Endpoint global dos serviços AWS; presente apenas no MiniStack. |
| `AWS_ACCESS_KEY_ID`     | Credencial fictícia local; em produção, prefira role ou OIDC.   |
| `AWS_SECRET_ACCESS_KEY` | Segredo fictício local; nunca versionar um valor real.          |

Nunca coloque tokens, senhas reais ou credenciais de produção no `.env.template`.

## Executando com Docker

Esta é a maneira recomendada para começar, porque API, PostgreSQL e Adminer utilizam a mesma rede do Docker.

### 1. Criar o `.env`

```bash
cp .env.template .env
```

O `.env.template` mantém uma URL apropriada para comandos executados diretamente no computador:

```dotenv
DATABASE_URL=postgres://postgres:postgres@localhost:5432/alibe
```

Ao iniciar o Backend pelo Docker Compose, o serviço `backend` sobrescreve somente dentro do container a `DATABASE_URL` com:

```dotenv
DATABASE_URL=postgres://postgres:postgres@alibe-db:5432/alibe
```

`alibe-db` é o DNS interno do serviço PostgreSQL na rede do Compose. Dessa forma, o mesmo código utiliza `localhost` no computador e `alibe-db` dentro do container, sem modificar a URL em tempo de execução. O Prisma aceita os protocolos `postgres://` e `postgresql://`.

### 2. Construir e iniciar os serviços

```bash
docker compose up --build
```

Para executar em segundo plano:

```bash
docker compose up --build -d
```

Ao iniciar o ambiente pelo Docker Compose, o Backend aguarda o PostgreSQL ficar saudável e
executa automaticamente:

```text
prisma generate
        ↓
prisma migrate deploy
        ↓
nest start --watch
```

`prisma generate` sincroniza o cliente tipado dentro do container. `prisma migrate deploy`
aplica somente as migrations versionadas que ainda estiverem pendentes; ele não cria uma nova
migration e não reaplica migrations concluídas.

Assim, quem apenas clona ou atualiza o projeto precisa somente executar
`docker compose up --build`. Quem altera o `schema.prisma` continua responsável por criar uma
nova migration com `prisma migrate dev`, validar o SQL gerado e versionar a pasta criada em
`prisma/migrations/` junto com o código correspondente.

### 3. Testar a API

```bash
curl -X POST http://localhost:3000/example \
    -F "description=Exemplo com PostgreSQL e S3" \
    -F "image=@./minha-imagem.png"
```

Resposta esperada:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Exemplo com PostgreSQL e S3",
  "imageUrl": "/example/550e8400-e29b-41d4-a716-446655440000/image",
  "createdAt": "2026-08-30T00:00:00.000Z"
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

Não utilize `docker compose down -v` ou `docker compose down --volumes` na rotina do projeto. Esses comandos apagam os dados locais do PostgreSQL, o histórico do Prometheus, o estado do Grafana e os recursos persistidos pelo MiniStack.

## URLs importantes

Os endereços abaixo consideram o ambiente local com `docker compose up` em execução:

| Recurso              | Endereço                                           | Finalidade                                          |
| -------------------- | -------------------------------------------------- | --------------------------------------------------- |
| API                  | <http://localhost:3000>                            | URL base do Backend.                                |
| Endpoint de exemplo  | <http://localhost:3000/example>                    | Verificação rápida da API.                          |
| Usuário mockado      | <http://localhost:3000/auth/me>                    | Mostra o usuário injetado na request na Sprint 1.   |
| Swagger UI           | <http://localhost:3000/docs>                       | Documentação interativa e teste dos endpoints.      |
| OpenAPI JSON         | <http://localhost:3000/docs-json>                  | Contrato OpenAPI consumível por outras ferramentas. |
| Métricas do Backend  | <http://localhost:3000/metrics>                    | Métricas brutas no formato Prometheus.              |
| Prometheus           | <http://localhost:9090>                            | Consulta e inspeção das métricas coletadas.         |
| Grafana              | <http://localhost:3001>                            | Página inicial do Grafana.                          |
| Dashboard do Backend | <http://localhost:3001/d/alibe-backend-monitoring> | Monitoramento do Backend.                           |
| Adminer              | <http://localhost:8080>                            | Interface para inspecionar o PostgreSQL.            |
| MiniStack            | <http://localhost:4566>                            | Endpoint local compatível com APIs da AWS.          |
| PostgreSQL           | `localhost:5432`                                   | Conexão ao banco a partir do computador.            |
| Prisma Studio        | <http://localhost:5555>                            | Interface do Prisma, quando iniciada manualmente.   |

Para iniciar o Prisma Studio pelo container do Backend:

```bash
docker compose exec backend npx prisma studio --hostname 0.0.0.0 --port 5555
```

No Adminer, use `alibe-db` como servidor. Dentro da rede do Compose, containers utilizam nomes de serviços como `alibe-db`, `backend` e `prometheus`; no navegador e em programas executados diretamente no computador, utilize `localhost` e a porta publicada.

## Infraestrutura AWS com MiniStack e CloudFormation

O projeto utiliza o MiniStack para simular serviços da AWS no ambiente local. Ele fica disponível em <http://localhost:4566>, enquanto a infraestrutura é descrita de forma versionável pelo template [`infra/cloudformation/alibe.yml`](infra/cloudformation/alibe.yml).

Atualmente, o template cria um bucket S3 privado para mídias, com versionamento, criptografia AES-256, bloqueio de acesso público, tags de projeto e ambiente e outputs com o nome e o ARN do bucket.

### Pré-requisitos

- Docker Compose em execução;
- AWS CLI instalada, verificável com `aws --version`;
- `AWS_REGION=us-east-2` configurada no `.env` a partir do `.env.template`.

### Executar localmente

Suba o MiniStack:

```bash
docker compose up -d ministack
docker compose logs -f ministack
```

Em outro terminal, na raiz do Backend, faça o deploy da stack local:

```bash
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
AWS_DEFAULT_REGION=us-east-2 \
aws --endpoint-url=http://localhost:4566 cloudformation deploy \
    --template-file infra/cloudformation/alibe.yml \
    --stack-name alibe-local \
    --parameter-overrides MediaBucketName=alibe-local-media \
    --region us-east-2
```

As credenciais `test` são fictícias e servem somente para o emulador local. O parâmetro `Environment` não aparece nesse comando porque seu valor padrão no template é `local`.

Para confirmar que a stack foi criada e consultar seus outputs:

```bash
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
AWS_DEFAULT_REGION=us-east-2 \
aws --endpoint-url=http://localhost:4566 cloudformation describe-stacks \
    --stack-name alibe-local \
    --region us-east-2
```

Para listar os buckets disponíveis no ambiente local:

```bash
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
AWS_DEFAULT_REGION=us-east-2 \
aws --endpoint-url=http://localhost:4566 s3api list-buckets \
    --region us-east-2
```

Para enviar um arquivo local existente ao bucket:

```bash
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
AWS_DEFAULT_REGION=us-east-2 \
aws --endpoint-url=http://localhost:4566 s3 cp \
    teste-s3.txt s3://alibe-local-media/teste-s3.txt
```

Para listar os arquivos armazenados no bucket:

```bash
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
AWS_DEFAULT_REGION=us-east-2 \
aws --endpoint-url=http://localhost:4566 s3 ls \
    s3://alibe-local-media/
```

O volume `ministack-data` preserva o estado local entre reinicializações. `docker compose down` mantém esse volume; `docker compose down -v` o remove.

### Integração do Backend com S3

O SDK oficial `@aws-sdk/client-s3` está encapsulado em `src/infrastructure/storage/`:

```text
storage/
├── s3-client.provider.ts    # Monta o S3Client somente com configuração
├── s3-storage.service.ts    # Upload e download de objetos
└── storage.module.ts        # Registra e exporta o serviço no NestJS
```

O código é único para todos os ambientes. Não existe verificação de `NODE_ENV` nem implementação separada para MiniStack: a presença ou ausência das variáveis altera apenas a configuração entregue ao mesmo `S3Client`.

| Execução                        | Endpoint                | Path style | Credenciais                                                |
| ------------------------------- | ----------------------- | ---------- | ---------------------------------------------------------- |
| Backend no Docker Compose       | `http://ministack:4566` | `true`     | `test` / `test`, somente local                             |
| Backend executado no computador | `http://localhost:4566` | `true`     | `test` / `test`, somente local                             |
| AWS real                        | variável ausente        | ausente    | cadeia padrão do SDK: profile, variáveis, OIDC ou IAM role |

Quando `AWS_ENDPOINT_URL` está configurada, o client S3 ativa path-style internamente porque esse formato é exigido pelo MiniStack. O desenvolvedor não precisa configurar uma segunda variável para esse detalhe do adapter.

Na AWS real, configure `AWS_REGION` e `AWS_S3_BUCKET`, remova `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` do ambiente quando a autenticação vier de role ou OIDC. O SDK passa automaticamente a usar o endpoint e a cadeia de credenciais padrão da AWS, sem mudança no código-fonte.

Um módulo que precise armazenar arquivos importa `StorageModule` e seu caso de uso depende do contrato geral `ObjectStorage`, nunca do SDK ou do `S3StorageService` concreto:

```ts
constructor(
  private readonly repository: ExampleRepository,
  private readonly storage: ObjectStorage,
) {}
```

O contrato disponibiliza `save`, `findByKey` e `delete`. O `delete` permite compensar falhas: se a imagem for enviada ao S3, mas o Prisma falhar ao criar o registro, o caso de uso remove o objeto órfão.

Os campos usados pelo armazenamento são:

| Campo         | Significado                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `key`         | Nome único do objeto dentro do bucket, equivalente ao caminho interno do arquivo.               |
| `bytes`       | Conteúdo binário enviado ao S3. No exemplo, são os bytes da imagem recebida pela API.           |
| `contentType` | Tipo MIME, como `image/png`. Ele permite que o navegador interprete a resposta como uma imagem. |

No download são devolvidos apenas `bytes` e `contentType`. ETag, versionamento, metadata, tamanho e data da alteração ficam fora do contrato enquanto não houver um caso de uso que precise deles.

### Exemplo com PostgreSQL e S3

O módulo `example` salva a descrição e a chave da imagem no PostgreSQL, enquanto os bytes ficam no S3:

```text
Controller HTTP
    -> CreateExampleUseCase
        -> ObjectStorage
            -> S3StorageService -> S3 ou MiniStack
        -> ExampleRepository
            -> PrismaExampleRepository -> PostgreSQL
```

O model Prisma possui `id`, `description`, `imageKey` e `createdAt`. Somente a chave, como `examples/{id}/image.png`, é persistida no banco; uma URL do MiniStack ou da AWS não é salva porque pode mudar entre ambientes.

Crie um exemplo pelo Swagger em <http://localhost:3000/docs> ou pelo terminal:

```bash
curl -X POST http://localhost:3000/example \
    -F "description=Exemplo com PostgreSQL e S3" \
    -F "image=@./minha-imagem.png"
```

Exemplo de resposta:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Exemplo com PostgreSQL e S3",
  "imageUrl": "/example/550e8400-e29b-41d4-a716-446655440000/image",
  "createdAt": "2026-08-30T00:00:00.000Z"
}
```

Consulte os dados ou baixe a imagem:

```bash
curl http://localhost:3000/example/550e8400-e29b-41d4-a716-446655440000

curl http://localhost:3000/example/550e8400-e29b-41d4-a716-446655440000/image \
    --output imagem-baixada.png
```

O upload utiliza `multipart/form-data`, exige os campos `description` e `image`, aceita apenas MIME `image/*` e limita o arquivo a 5 MB.

### Placeholder para uma AWS remota

Antes do deploy real, autentique a AWS CLI por um perfil, SSO ou role e confirme a conta selecionada:

```bash
aws sts get-caller-identity \
    --profile YOUR_AWS_PROFILE \
    --region YOUR_AWS_REGION
```

Depois, substitua todos os valores iniciados por `YOUR_` antes de executar:

```bash
AWS_PROFILE=YOUR_AWS_PROFILE \
AWS_DEFAULT_REGION=YOUR_AWS_REGION \
aws cloudformation deploy \
    --template-file infra/cloudformation/alibe.yml \
    --stack-name YOUR_REMOTE_STACK_NAME \
    --parameter-overrides \
        Environment=production \
        MediaBucketName=YOUR_GLOBALLY_UNIQUE_BUCKET_NAME \
    --region YOUR_AWS_REGION
```

Exemplo de significado dos placeholders:

| Placeholder                        | O que informar                                       |
| ---------------------------------- | ---------------------------------------------------- |
| `YOUR_AWS_PROFILE`                 | Perfil local autenticado na conta correta.           |
| `YOUR_AWS_REGION`                  | Região real escolhida, por exemplo `us-east-2`.      |
| `YOUR_REMOTE_STACK_NAME`           | Nome da stack, por exemplo `alibe-production`.       |
| `YOUR_GLOBALLY_UNIQUE_BUCKET_NAME` | Nome globalmente único para o bucket S3 de produção. |

No ambiente remoto, não utilize `--endpoint-url`, pois esse argumento direciona os comandos ao emulador local. Também não coloque `AWS_ACCESS_KEY_ID` ou `AWS_SECRET_ACCESS_KEY` reais no README, no Git ou em comandos compartilhados. Em CI, prefira autenticação por OIDC ou secrets protegidos da plataforma.

> **Atenção:** o comando remoto é apenas um modelo e não deve ser executado sem substituir os placeholders, confirmar conta e região e revisar o template. Um deploy remoto cria recursos reais e pode gerar custos.

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

### Autenticação temporária da Sprint 1

Enquanto a autenticação real não estiver disponível, `MockAuthenticationMiddleware` injeta em
cada request o mesmo contrato esperado futuramente:

```ts
request.user = { id: process.env.MOCK_AUTH_USER_ID };
```

O mock é controlado exclusivamente pelo ambiente:

```dotenv
MOCK_AUTH_ENABLED=true
MOCK_AUTH_USER_ID=11111111-1111-4111-8111-111111111111
```

O ID padrão pertence à primeira usuária da seed, Ana Beatriz Silva. O segundo usuário, Bruno
Henrique Souza, possui o ID `22222222-2222-4222-8222-222222222222`. Todos os 15 usuários da seed
possuem IDs determinísticos; eles podem ser consultados no Adminer.

Para simular outro usuário, altere `MOCK_AUTH_USER_ID` no `.env` e recrie somente o Backend:

```bash
docker compose up -d --force-recreate backend
```

O usuário selecionado pode ser conferido em `GET /auth/me`. Controllers que necessitam do usuário
recebem a request com `@Request() request: AuthenticatedRequest` e acessam `request.user.id`; o
`userId` nunca é recebido por path, query ou body. Quando a autenticação real for implementada, o
middleware temporário será desativado e um Guard validará as credenciais, mantendo o mesmo
`request.user`.

Em produção, mantenha obrigatoriamente:

```dotenv
MOCK_AUTH_ENABLED=false
```

### Endpoints mockados de grupos

Por enquanto, o módulo `groups` contém apenas os contratos HTTP já discutidos. Os próprios controllers
devolvem objetos mockados compatíveis com os DTOs; não existem services, use cases, repositories ou
persistência neste módulo.

| Método | Rota                           | Contrato mockado                         |
| ------ | ------------------------------ | ---------------------------------------- |
| GET    | `/groups`                      | Listagem da tela inicial.                |
| GET    | `/groups/:groupId`             | Grupo, participantes e próximo encontro. |
| POST   | `/groups`                      | Resposta de criação de grupo.            |
| GET    | `/groups/:groupId/invite-link` | Token atual e sua data de expiração.     |
| POST   | `/invite-links/:token/join`    | Acesso ao grupo pelo token de convite.   |

Neste mock, `GET /groups` devolve todos os grupos sem receber `userId`. Quando a autenticação for
implementada, o identificador será obtido do usuário autenticado e a mesma rota passará a filtrar
somente os grupos dos quais ele participa. O `userId` não será enviado em path, query ou body para
essa listagem.

`GET /groups/:groupId` devolve os dados básicos do grupo e a lista de participantes. O mock expõe
somente `id`, `name` e `profilePic` de cada participante; dados sensíveis, como `password_hash`,
nunca fazem parte da resposta. Futuramente, essa consulta utilizará os relacionamentos `user_group`.
O campo `nextEvent` contém o próximo encontro marcado ou `null` quando o grupo ainda não possui um
próximo encontro.

`POST /groups` recebe `multipart/form-data` com `name` obrigatório e `profile_pic` opcional. O usuário
criador não é enviado no body: futuramente ele também será obtido da autenticação. Como este é um
mock, a imagem não é armazenada e a resposta devolve apenas uma URL ilustrativa.

`GET /groups/:groupId/invite-link` cria um token quando não existe, reutiliza o token enquanto sua
data de expiração estiver no futuro e cria outro depois do vencimento. Como o estado é somente um
mock em memória, ele é perdido quando a aplicação reinicia. A resposta contém apenas `token` e
`expiresAt`.

`POST /invite-links/:token/join` recebe somente o token pela URL e responde somente com o próprio
`token`. Futuramente, o `userId` será extraído do usuário autenticado e não será enviado em path,
query ou body.

Os DTOs, exemplos de payload e respostas podem ser consultados e executados em
<http://localhost:3000/docs>. Outros fluxos serão adicionados somente depois que seus contratos
forem discutidos.

### Endpoint mockado de calendário

O calendário fica em um módulo próprio porque agrega informações de eventos, propostas,
disponibilidades, usuários e participantes do grupo. Nesta etapa, ele contém somente controller e
DTOs HTTP mockados, sem service, use case, repository ou persistência.

```http
GET /groups/:groupId/calendar?month=5&year=2026
```

O `groupId` é recebido pela URL; `month` e `year` são obrigatórios. `month` deve ser um número
entre 1 e 12 e `year` deve ser um inteiro com quatro dígitos. O `userId` não é recebido em path,
query ou body: futuramente virá da autenticação. A resposta contém somente dias com informações.
Os campos `scheduledEventIds`, `proposalIds`, `availableUserIds` e `completedEventIds` são arrays
de UUIDs, sem objetos intermediários.

O contrato completo pode ser consultado pelo Swagger em <http://localhost:3000/docs>.

### Endpoint mockado de disponibilidade

A disponibilidade fica no módulo `availability`, separado do calendário. O endpoint recebe o
grupo pela URL e futuramente obtém o usuário pela autenticação:

```http
POST /groups/:groupId/availabilities
```

`date` é obrigatória no formato `YYYY-MM-DD`. `startTime` e `endTime` são opcionais no formato
`HH:mm`, mas devem ser enviados juntos e o horário final deve ser posterior ao inicial. Quando
ambos são omitidos, a disponibilidade vale para o dia inteiro.

Os exemplos de requisição e resposta podem ser consultados pelo Swagger em
<http://localhost:3000/docs>.

### Status HTTP dos endpoints mockados

Os códigos abaixo descrevem o comportamento implementado atualmente. Eles também estão declarados
nos decorators do Swagger de cada controller.

| Método | Rota                              | Sucesso | Erros atuais |
| ------ | --------------------------------- | ------- | ------------ |
| GET    | `/groups`                         | `200`   | `500`        |
| GET    | `/groups/:groupId`                | `200`   | `400`, `500` |
| POST   | `/groups`                         | `201`   | `400`, `500` |
| GET    | `/groups/:groupId/invite-link`    | `200`   | `400`, `500` |
| POST   | `/invite-links/:token/join`       | `201`   | `400`, `500` |
| GET    | `/groups/:groupId/calendar`       | `200`   | `400`, `500` |
| POST   | `/groups/:groupId/availabilities` | `201`   | `400`, `500` |

| Status                      | Significado atual                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `200 OK`                    | Consulta processada e resposta mockada retornada com sucesso.                                                            |
| `201 Created`               | Recurso ou vínculo simulado criado com sucesso.                                                                          |
| `400 Bad Request`           | UUID inválido, campo obrigatório ausente, data ou intervalo inválido, `month` fora de 1–12 ou `year` sem quatro dígitos. |
| `500 Internal Server Error` | Falha inesperada não tratada durante o processamento.                                                                    |

Quando autenticação e persistência forem implementadas, os contratos deverão incorporar os códigos
abaixo junto com o comportamento e os testes correspondentes. Eles ainda não são retornados pelos
mocks atuais:

| Status futuro      | Situação prevista                               |
| ------------------ | ----------------------------------------------- |
| `401 Unauthorized` | Requisição sem autenticação válida.             |
| `403 Forbidden`    | Usuário autenticado sem acesso ao grupo.        |
| `404 Not Found`    | Grupo, convite ou outro recurso não encontrado. |
| `410 Gone`         | Tentativa de usar um convite expirado.          |

## Executando a API localmente

Use esta opção quando quiser executar o NestJS diretamente no computador e manter apenas o PostgreSQL no Docker.

### 1. Instalar as dependências

```bash
npm ci
```

`npm ci` utiliza exatamente as versões registradas no `package-lock.json` e é o comando utilizado pela CI. Use `npm install <pacote>` apenas quando estiver adicionando ou atualizando uma dependência.

### 2. Conferir a conexão local

O `.env.template` já utiliza `localhost`, então não é necessário trocar o host para executar o Prisma ou a API diretamente no computador:

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

> **Importante:** `prisma generate` não precisa que o PostgreSQL esteja rodando, não cria o banco,
> não cria tabelas e não executa migrations. Execute-o depois de `npm ci` e sempre que o
> `schema.prisma` mudar ao trabalhar diretamente no computador. Na execução pelo Docker Compose,
> esse comando e o `prisma migrate deploy` são executados automaticamente antes da API. O banco é
> criado pelo PostgreSQL/Docker; as tabelas são criadas ou alteradas por migrations. O Compose
> grava o client gerado no mesmo diretório `generated/prisma` usado pelo VS Code, portanto
> `docker compose up` também mantém as tipagens locais sincronizadas. O serviço roda como o
> usuário `node` para não criar esses arquivos com proprietário `root`.

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

| Local                                         | Responsabilidade                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                        | Define datasource, generator e modelos persistidos.                                    |
| `prisma/migrations/`                          | Guarda o histórico versionado das alterações do banco quando migrations forem criadas. |
| `prisma.config.ts`                            | Informa ao Prisma onde estão schema, migrations e `DATABASE_URL`.                      |
| `generated/prisma/`                           | Prisma Client gerado automaticamente; não deve ser editado manualmente.                |
| `src/infrastructure/prisma/prisma.service.ts` | Mantém a conexão compartilhada do NestJS com o Prisma.                                 |
| `src/infrastructure/prisma/prisma.module.ts`  | Exporta o `PrismaService` para os módulos que precisam de banco.                       |
| `src/modules/<módulo>/persistence/`           | Implementa os repositories daquele módulo usando o `PrismaService`.                    |

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

Seeds ficam em `prisma/seed.ts`. A seed usa a `DATABASE_URL` fornecida pelo ambiente, sem trocar o host no código.

```bash
# Executar no computador: usa localhost conforme o .env
npm run prisma:seed

# Executar no container já iniciado: o Compose injeta alibe-db
docker compose exec backend npm run prisma:seed
```

A seed deve ser idempotente sempre que possível, ou seja, poder ser executada novamente sem duplicar dados indevidamente. Dados de seed não substituem migrations. A seed atual limpa as tabelas antes de inserir os dados e deve ser usada somente em banco local.

## Scripts disponíveis

| Comando                        | Responsabilidade                                                             |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `npm run start`                | Inicia a aplicação uma vez em modo normal.                                   |
| `npm run start:dev`            | Inicia em modo watch e reinicia após alterações.                             |
| `npm run start:debug`          | Inicia em modo watch com suporte ao debugger.                                |
| `npm run build`                | Compila o projeto para `dist/`.                                              |
| `npm run start:prod`           | Executa o build compilado em `dist/src/main.js`.                             |
| `npm run prisma:generate`      | Gera o Prisma Client.                                                        |
| `npm run prisma:seed`          | Executa a seed no banco configurado pela `DATABASE_URL`.                     |
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
├── infra/
│   └── cloudformation/
│       └── alibe.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/                 # Criada quando existirem migrations
├── src/
│   ├── infrastructure/
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   └── storage/
│   │       ├── s3-client.provider.ts
│   │       ├── s3-storage.service.ts
│   │       └── storage.module.ts
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
| `infra/`                   | Templates versionados da infraestrutura, atualmente com AWS CloudFormation.     |
| `prisma/`                  | Schema e histórico de migrations do banco.                                      |
| `src/`                     | Código-fonte da aplicação.                                                      |
| `test/`                    | Testes centralizados e separados por tipo e módulo.                             |
| `.env.template`            | Contrato das variáveis de ambiente necessárias.                                 |
| `docker-compose.yml`       | Serviços locais da aplicação, banco, observabilidade e MiniStack.               |
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

O repository Prisma pode importar o `PrismaService` compartilhado de `src/infrastructure/prisma/`, mas deve devolver entidades ou resultados compreendidos pelo domínio e pela aplicação.

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
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
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
