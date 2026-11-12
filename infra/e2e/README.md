# Backend para os testes E2E do frontend

Stack mínima para os testes Maestro do frontend no CI. Sobe só o necessário para a API funcionar:

| Serviço     | Para quê                                                              |
| ----------- | --------------------------------------------------------------------- |
| `db`        | PostgreSQL 17 (alpine), dados em memória (`tmpfs`)                    |
| `ministack` | S3 (imagens) e SQS (fila de notificações)                             |
| `setup`     | Roda uma vez: migrations, cria bucket e fila e roda o seed (opcional) |
| `backend`   | A API, com a imagem `production` do `Dockerfile`, na porta 3000       |

Fica de fora tudo o que a API não precisa para responder: Grafana, Prometheus, Adminer, a Lambda de notificações e o aws-cli.

## Uso

Na raiz do repositório:

```bash
docker compose -f infra/e2e/docker-compose.yml up -d --build --wait
```

O `--wait` só retorna quando `GET /health/ready` responde 200. Para derrubar e apagar os dados:

```bash
docker compose -f infra/e2e/docker-compose.yml down -v
```

Variáveis opcionais:

- `SEED_ON_STARTUP` (padrão `true`): roda `prisma/seed.ts`. Os usuários do seed usam a senha `senha-segura`, por exemplo `ana.silva@example.com`.
- `APP_PORT` (padrão `3000`): porta exposta no host.
- `BETTER_AUTH_URL` (padrão `http://localhost:3000`).

## Como o frontend roda os testes E2E com este backend

O backend roda em Docker no próprio runner do CI, em `localhost:3000`. O app roda dentro do emulador Android, e dentro do emulador `localhost` é o próprio emulador. Por isso o `adb reverse` (passo 3) faz o `localhost:3000` do emulador apontar para o backend do runner. É o mesmo que já se faz no desenvolvimento com o celular.

São 4 mudanças no repositório do frontend.

### 1. Gerar o APK apontando para `localhost:3000`

Em `.github/workflows/local-build.yml`, o `EXPO_PUBLIC_API_URL` precisa estar definido quando o APK é compilado, porque o Expo embute a URL no bundle:

```yaml
- name: Compile Android APK
  working-directory: android
  env:
    EXPO_PUBLIC_API_URL: http://localhost:3000
  run: .\gradlew assembleRelease
```

### 2. Liberar HTTP no APK

O APK de release do Android bloqueia `http://` por padrão, até para localhost. Sem isso, o app não fala com o backend (o smoke atual passa, porque não chama a API, mas qualquer teste com login falha):

```bash
npx expo install expo-build-properties
```

E em `app.config.ts`, dentro de `plugins`:

```ts
['expo-build-properties', { android: { usesCleartextTraffic: true } }],
```

Se não quiser liberar HTTP no APK de produção, condicione a uma variável de ambiente que só o build de E2E define.

### 3. Subir o backend e ligar o `adb reverse` no workflow de E2E

Em `.github/workflows/e2e-tests.yml`, antes do passo do emulador:

```yaml
- name: Checkout backend
  uses: actions/checkout@v4
  with:
    repository: Alibe-AGES/Backend
    ref: develop
    path: backend

- name: Start backend
  working-directory: backend
  run: docker compose -f infra/e2e/docker-compose.yml up -d --build --wait
```

O repositório do backend é público, então o checkout não precisa de token. O `--wait` só termina quando a API já responde em `/health/ready`.

No `script:` do `android-emulator-runner`, antes do `maestro test`:

```bash
adb reverse tcp:3000 tcp:3000
```

E, depois do upload dos resultados do Maestro, os logs do backend para quando algo falhar:

```yaml
- name: Backend logs
  if: failure()
  working-directory: backend
  run: docker compose -f infra/e2e/docker-compose.yml logs
```

### 4. Usar os dados do seed nos testes

O banco começa com os dados de `prisma/seed.ts`. Para um fluxo de login no Maestro, use por exemplo `ana.silva@example.com` com a senha `senha-segura`. O banco é recriado a cada execução do CI, então os testes sempre começam do mesmo estado.
