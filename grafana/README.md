# Monitoramento local

Esta pasta mantém o provisionamento do Grafana e o dashboard do Backend versionados no Git. Ao iniciar o Docker Compose, nenhuma configuração manual é necessária.

## Estrutura

```text
grafana/
├── dashboards/
│   └── alibe-backend.json
└── provisioning/
    ├── dashboards/
    │   └── dashboards.yml
    └── datasources/
        └── prometheus.yml
```

- `prometheus.yml`, na raiz do projeto, coleta `/metrics` do serviço `backend` a cada 5 segundos.
- `provisioning/datasources/prometheus.yml` registra o Prometheus com o UID estável `prometheus`.
- `provisioning/dashboards/dashboards.yml` carrega os dashboards na pasta `Alibe`.
- `dashboards/alibe-backend.json` é a fonte versionada do dashboard **Alibe Backend Monitoring**.

## Inicialização

Na raiz do Backend:

```bash
docker compose up -d --build
```

Acessos locais:

- Backend: <http://localhost:3000>
- Métricas: <http://localhost:3000/metrics>
- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3001>
- Dashboard direto: <http://localhost:3001/d/alibe-backend-monitoring>

O primeiro acesso local do Grafana usa `admin` / `admin` e solicita a troca da senha. Depois disso, utilize a nova senha definida. O dashboard fica em **Dashboards > Browse > Alibe > Alibe Backend Monitoring**.

Também é possível pesquisar por `Alibe Backend Monitoring` com `Ctrl + K`. O número apresentado em **Recent dashboards** considera apenas dashboards já visitados e pode aparecer como zero antes do primeiro acesso.

Na URL direta, `/d/` é a rota do próprio Grafana para dashboards e `alibe-backend-monitoring` é o UID estável definido no JSON. Isso não representa uma pasta do repositório.

## Painéis de erros

O dashboard possui:

- total acumulado de respostas HTTP de erro;
- gráfico temporal da quantidade de requisições;
- gráfico temporal da taxa percentual de erros;
- fallback visual para zero enquanto não houver erros registrados.

Os gráficos começam a apresentar séries depois que a API recebe requisições. Erros lançados dentro de endpoints reais são registrados como `4xx` ou `5xx`; uma rota totalmente inexistente pode ser resolvida pelo Nest antes de chegar ao interceptor HTTP.

## Persistência

O Compose usa volumes nomeados:

- `prometheus-data`: séries temporais do Prometheus, com retenção de 7 dias;
- `grafana-data`: usuários, preferências e estado local do Grafana;
- `db-data`: dados do PostgreSQL da aplicação.

Não use `docker compose down -v` na rotina do projeto: a opção `-v` apaga todos esses volumes, incluindo o banco local e o histórico de monitoramento. Para apenas parar os serviços, use:

```bash
docker compose down
```

## Alterando o dashboard

O JSON do repositório é a fonte de verdade. Alterações feitas pela interface podem ficar salvas apenas no volume local. Para versioná-las:

1. abra o dashboard no Grafana;
2. selecione **Share > Export**;
3. exporte o JSON preservando o UID `alibe-backend-monitoring` e o datasource `prometheus`;
4. substitua `grafana/dashboards/alibe-backend.json` pelo arquivo exportado;
5. valide e revise o diff antes do commit.

Os painéis HTTP começam a apresentar dados depois que a API recebe requisições. O painel informativo final não inventa métricas: Health, Prisma e informações de containers somente devem ganhar consultas quando exporters ou métricas reais forem implementados.
