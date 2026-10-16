# Plano de implantação do Backend Alibe na AWS

Este documento descreve como evoluir o deploy inicial do Backend até a arquitetura com ECR,
K3s, Prometheus, Grafana, SQS e Lambda em Go. Ele é um roteiro de execução: cada fase possui
pré-requisitos, tarefas, validações, riscos e critério de conclusão.

Nenhuma fase deve criar serviços AWS fora da estimativa aprovada sem revisão prévia. A referência
de custos é `Estimativa AWS Ages - Alibe.pdf`, com custo mensal estimado em US$ 32,67 para ECR,
S3, SQS, Lambda, RDS, EC2, EBS e um IPv4 público em `us-east-2`.

## 1. Princípios obrigatórios

1. Executar e validar uma fase antes de iniciar a seguinte.
2. Nunca salvar senhas, tokens, chaves AWS ou arquivos `.env.production` no Git.
3. Não usar `AWS_ACCESS_KEY_ID` ou `AWS_SECRET_ACCESS_KEY` na EC2. A aplicação usa a IAM Role da
   própria instância.
4. Não configurar `AWS_ENDPOINT_URL` em produção. Essa variável existe apenas para o MiniStack.
5. Não adicionar NAT Gateway, Load Balancer, EKS, Secrets Manager, outra instância ou outro banco
   sem revisão do orçamento e atualização da estimativa.
6. Imagens de produção recebem tags imutáveis baseadas no SHA do commit; não usar `latest`.
7. Atualizações de CloudFormation devem usar os mesmos nomes de stack. Atualizar uma stack não
   cria outra stack quando o nome é preservado.
8. Antes de executar qualquer change set, revisar substituições, exclusões e alterações no RDS,
   S3, EC2 e EBS.
9. Manter o RDS e a EC2 desligados fora dos períodos de desenvolvimento quando isso for compatível
   com a atividade planejada. O RDS interrompido volta a iniciar automaticamente após sete dias.
10. Prometheus e Grafana são containers dentro da EC2 já estimada; não são serviços AWS adicionais.

## 2. Estado atual e ordem das fases

### Infraestrutura já descrita

| Arquivo | Responsabilidade |
| --- | --- |
| `cloudformation/00-safety.yml` | Budget mensal e alerta de custo |
| `cloudformation/01-network.yml` | VPC, subnet pública, subnets privadas, rotas e Internet Gateway |
| `cloudformation/02-data.yml` | S3 privado e RDS PostgreSQL privado |
| `cloudformation/03-services.yml` | ECR da API e fila SQS |
| `cloudformation/04-compute.yml` | EC2, EBS, Elastic IP, IAM e Security Groups |
| `compose.ec2.yml` | Deploy inicial da API diretamente na EC2 |
| `.env.production.example` | Modelo das variáveis necessárias na EC2 |

### Ordem obrigatória

1. Validar o deploy manual com RDS e S3.
2. Criar a pipeline que publica as imagens no ECR.
3. Instalar o K3s e migrar a API para ele.
4. Ampliar a pipeline para realizar rollout no K3s.
5. Implantar Prometheus e Grafana no K3s.
6. Desenvolver o serviço de notificações em Go.
7. Implantar a Lambda e integrá-la à fila SQS.
8. Automatizar as atualizações de CloudFormation com change sets e aprovação.

Não automatizar o deploy por SSH e Docker Compose antes do K3s. Esse mecanismo seria descartado
logo depois. A primeira versão da pipeline publica imagens; o rollout automático entra depois que
o K3s estiver estável.

## 3. Fase zero — validar o deploy manual atual

### Objetivo

Provar que a API consegue executar na EC2, aplicar migrations no RDS e acessar o S3 por IAM antes
de introduzir ECR, K3s ou automação.

### 3.1 Preparar os recursos AWS

1. Selecionar a região `us-east-2` no console.
2. Confirmar que as stacks de network, data, services e compute estão em `CREATE_COMPLETE` ou
   `UPDATE_COMPLETE`.
3. Iniciar a EC2.
4. Retomar o RDS e aguardar o estado `Available`.
5. Anotar os seguintes outputs sem copiar senhas para documentos:
   - endpoint, porta, nome e usuário do RDS na stack de data;
   - nome do bucket S3 na stack de data;
   - Elastic IP na stack de compute.
6. Confirmar que o IPv4 público atual do administrador ainda corresponde ao parâmetro
   `AllowedClientCidr`. Se o IP mudou, atualizar a stack de compute antes do teste.

### 3.2 Preparar a EC2

O template atual cria a máquina, mas não instala Git ou Docker. Pelo terminal web da EC2:

1. Atualizar somente os pacotes necessários.
2. Instalar Git, Docker Engine e Docker Compose v2.
3. Habilitar e iniciar o serviço Docker.
4. Permitir que o usuário administrativo utilize Docker sem manter uma sessão root.
5. Verificar:

```bash
git --version
docker --version
docker compose version
```

O clone deve usar HTTPS, pois a saída da EC2 está limitada a HTTPS e ao PostgreSQL. Para
repositório privado, usar uma credencial de curta duração e nunca salvá-la no repositório.

### 3.3 Configurar as variáveis

Depois de clonar o repositório e selecionar a branch de infraestrutura:

```bash
cp infra/prod/.env.production.example infra/prod/.env.production
chmod 600 infra/prod/.env.production
```

Preencher:

- `DATABASE_URL`: usuário, senha codificada para URL, endpoint, porta e nome do RDS;
- `PORT=3000`;
- `BETTER_AUTH_SECRET`: valor aleatório com pelo menos 32 caracteres;
- `BETTER_AUTH_URL`: inicialmente `http://ELASTIC_IP`;
- `BETTER_AUTH_TRUSTED_ORIGINS`: somente schemes e origens realmente usados pelo aplicativo;
- `AWS_REGION=us-east-2`;
- `AWS_S3_BUCKET`: nome exato retornado pela stack de data.

Não adicionar `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `APP_PORT`,
`SEED_ON_STARTUP`, `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID` ou `AWS_SECRET_ACCESS_KEY`.

### 3.4 Construir e iniciar

```bash
docker compose -f infra/prod/compose.ec2.yml config
docker compose -f infra/prod/compose.ec2.yml up --build -d
```

O serviço `migrate` deve terminar com código zero. A API só deve iniciar depois disso.

```bash
docker compose -f infra/prod/compose.ec2.yml ps
docker compose -f infra/prod/compose.ec2.yml logs migrate
docker compose -f infra/prod/compose.ec2.yml logs -f api
```

### 3.5 Testes obrigatórios

1. Abrir `http://ELASTIC_IP/docs` a partir do CIDR autorizado.
2. Criar um usuário e efetuar login.
3. Criar dados que exercitem escrita e leitura no RDS.
4. Enviar uma imagem e recuperá-la por um endpoint autenticado.
5. Confirmar no S3 que o objeto foi criado e continua privado.
6. Reiniciar o container da API e confirmar que os dados permanecem no RDS/S3.
7. Verificar que não existem credenciais AWS no ambiente do container.

### 3.6 Critério de conclusão

- Swagger disponível;
- migrations concluídas;
- autenticação funcionando;
- leitura e escrita no RDS funcionando;
- upload e download autenticado no S3 funcionando;
- bucket não público;
- nenhum segredo no Git ou dentro da imagem.

### 3.7 Rollback

Se a migration falhar, não iniciar a API. Salvar o log, identificar a migration e corrigir o código;
não marcar migrations manualmente como concluídas sem revisar o estado real do banco. Para voltar a
uma versão anterior da API, usar o commit anterior e reconstruir a imagem. Não apagar o RDS nem o
bucket para corrigir falhas da aplicação.

## 4. Fase um — pipeline de imagens com ECR

### Objetivo

Construir imagens reproduzíveis no GitHub Actions e armazená-las no ECR. Nesta fase, a publicação
é automática, mas o deploy ainda pode ser manual.

### 4.1 Preparar autenticação por OIDC

Criar por CloudFormation uma role exclusiva para o GitHub Actions:

- confiar somente no provedor OIDC do GitHub;
- restringir a confiança ao repositório do Backend e à branch `main`;
- permitir login no ECR;
- permitir upload apenas no repositório `alibe/backend`;
- não conceder acesso ao RDS, S3 de mídias ou EC2 nesta fase;
- não criar access keys permanentes.

O workflow recebe apenas o ARN da role e a região como variável não secreta do repositório.

### 4.2 Criar o workflow de publicação

Criar `.github/workflows/publish-backend-image.yml` com execução em push para `main` e opção
manual por `workflow_dispatch`.

Etapas obrigatórias:

1. Checkout do SHA exato.
2. Reutilizar ou aguardar os checks de lint, testes e build.
3. Configurar credenciais AWS por OIDC.
4. Autenticar o Docker no ECR.
5. Configurar Docker Buildx.
6. Construir o target `production` para `linux/arm64`.
7. Construir o target `migration` para `linux/arm64`.
8. Publicar ambas no mesmo repositório usando tags únicas:
   - `api-<SHA_COMPLETO>`;
   - `migration-<SHA_COMPLETO>`.
9. Registrar no resumo do workflow os dois URIs publicados.

Não usar `latest`, pois o repositório ECR está configurado com tags imutáveis.

### 4.3 Validar a primeira publicação

- verificar a arquitetura ARM64 das imagens;
- confirmar o scan do ECR;
- revisar vulnerabilidades críticas antes do deploy;
- executar a imagem da API com variáveis de teste sem inserir segredos na linha de comando;
- confirmar que a imagem de migration contém Prisma e migrations;
- confirmar que a imagem da API executa como usuário não-root;
- confirmar que nenhuma imagem contém `.env.production`.

### 4.4 Usar a imagem manualmente antes do K3s

Na EC2, autenticar o Docker no ECR usando a IAM Role da instância e baixar o SHA desejado. Não
armazenar a senha temporária do ECR em arquivo. Adaptar `compose.ec2.yml` para receber os URIs por
variáveis, preservando a possibilidade de rollback para o SHA anterior.

O deploy automático não entra aqui. Primeiro provar que a EC2 consegue baixar e executar as duas
imagens publicadas.

### 4.5 Critério de conclusão

- merge na `main` publica duas imagens ARM64;
- tags são imutáveis e rastreáveis ao commit;
- GitHub autentica por OIDC;
- EC2 baixa imagens usando sua IAM Role;
- rollback manual para um SHA anterior foi testado.

## 5. Fase dois — instalar K3s e migrar a API

### Objetivo

Substituir o Docker Compose como orquestrador pelo K3s na mesma EC2, sem criar EKS, Load Balancer
ou outra máquina.

### 5.1 Preparar a instalação

1. Fixar uma versão suportada do K3s; não instalar automaticamente a versão mais recente sem teste.
2. Versionar um script de instalação em `infra/prod/k3s/`, mas executá-lo manualmente primeiro.
3. Manter o Traefik incluído no K3s para entrada HTTP, evitando ALB/NLB.
4. Manter a API do Kubernetes (`6443`) fechada para a internet. O `kubectl` inicial roda dentro da
   própria EC2.
5. Confirmar que o CIDR padrão de pods do K3s não conflita com `10.0.0.0/24` da VPC.
6. Verificar espaço livre no EBS antes da instalação.

### 5.2 Resolver pulls privados do ECR

Antes de mover a API, fazer uma prova isolada de pull do ECR pelo containerd do K3s.

Não usar um `imagePullSecret` estático como solução definitiva, pois o token do ECR expira. A
solução deve usar um credential provider compatível com ECR e a IAM Role da EC2, sem credenciais
permanentes. Essa integração precisa ser validada com a versão de K3s escolhida antes do cutover.

### 5.3 Implementar os manifests da API

Preencher `infra/prod/kubernetes/api.yml` com:

- `Namespace` do projeto;
- `ConfigMap` para `PORT`, `AWS_REGION` e `AWS_S3_BUCKET`;
- referência a `Secret` para `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e origens;
- `Deployment` da API usando `api-<SHA>`;
- duas réplicas, com a observação de que ambas ficam no mesmo nó e não oferecem alta disponibilidade
  contra falha da EC2;
- `Service` do tipo `ClusterIP`;
- `Ingress` do Traefik para porta 80;
- requests e limits de CPU/memória compatíveis com a `t4g.medium`;
- estratégia `RollingUpdate` que não tente criar mais pods do que a memória suporta;
- encerramento gracioso do processo Node.

Não versionar um objeto `Secret` com valores reais. Na primeira implantação, criar o Secret a partir
do `.env.production` diretamente na EC2. Depois, definir uma solução automatizada sem expor os
valores nos logs da pipeline.

### 5.4 Criar um endpoint de saúde

O projeto possui `/metrics`, mas ainda não possui um endpoint dedicado de saúde. Antes de ativar
probes, implementar:

- liveness: confirma que o processo responde;
- readiness: confirma que a API está pronta para receber tráfego;
- resposta sem dados sensíveis;
- testes unitários/E2E do endpoint.

Configurar `livenessProbe` e `readinessProbe` somente depois que esse endpoint existir. Não usar
`/docs` ou `/metrics` como substitutos de um health check.

### 5.5 Implementar migrations como Job

Criar um manifest de `Job` separado usando `migration-<SHA>`:

- executar `prisma migrate deploy` uma única vez por versão;
- usar o mesmo Secret de banco;
- não iniciar rollout da API se o Job falhar;
- manter histórico mínimo de Jobs concluídos/falhos;
- não executar seeds em produção.

### 5.6 Fazer o cutover

1. Publicar e testar as imagens no ECR.
2. Instalar K3s.
3. Criar ConfigMap e Secret.
4. Testar o pull das imagens.
5. Executar o Job de migration.
6. Parar o Compose para liberar a porta 80.
7. Aplicar Deployment, Service e Ingress.
8. Aguardar o rollout.
9. Executar novamente os testes de autenticação, RDS e S3.

Nunca manter Compose e K3s expondo a mesma API simultaneamente.

### 5.7 Rollback

- migrations compatíveis devem ser preparadas para coexistir com a versão anterior da API;
- em falha de rollout, apontar o Deployment para `api-<SHA_ANTERIOR>`;
- não tentar desfazer uma migration destrutiva automaticamente;
- manter pelo menos as imagens necessárias para o rollback dentro das cinco retidas no ECR.

### 5.8 Critério de conclusão

- API executando somente no K3s;
- migration executada por Job;
- imagens privadas baixadas sem chave estática;
- duas réplicas saudáveis;
- Traefik atendendo pelo Elastic IP;
- Compose antigo parado;
- rollback por SHA testado.

## 6. Fase três — Prometheus e Grafana no K3s

### Objetivo

Adicionar observabilidade dentro da EC2 existente, sem criar serviços AWS adicionais e sem deixar
interfaces administrativas públicas.

### 6.1 Planejar recursos e armazenamento

O template atual reduziu o EBS de 20 GB da estimativa para 12 GB. Antes de instalar observabilidade:

1. medir uso do sistema, K3s e imagens;
2. reservar no máximo aproximadamente 1 GB para séries do Prometheus;
3. limitar retenção a três dias;
4. limitar logs de containers;
5. manter margem para novas imagens e operações do K3s;
6. aumentar o EBS somente após revisar impacto no orçamento.

### 6.2 Implementar Prometheus

Preencher `infra/prod/kubernetes/prometheus.yml` com:

- `ConfigMap` de scrape;
- `Deployment` ou `StatefulSet` de uma réplica;
- `Service` apenas interno;
- PVC usando o provisionador local do K3s sobre o EBS da EC2;
- `--storage.tsdb.retention.time=3d`;
- `--storage.tsdb.retention.size=1GB`;
- requests e limits conservadores;
- coleta de `/metrics` pelo DNS do Service da API.

O endpoint `/metrics` não deve ficar público pelo Ingress. Criar regra explícita no Traefik ou no
Backend para impedir acesso externo quando a API passar a ser aberta além do CIDR administrativo.

### 6.3 Implementar Grafana

Preencher `infra/prod/kubernetes/grafana.yml` com:

- `Deployment` de uma réplica;
- `Service` apenas interno;
- datasource apontando para o Service do Prometheus;
- ConfigMaps ou volumes com os arquivos existentes de `grafana/provisioning/`;
- dashboard existente em `grafana/dashboards/alibe-backend.json`;
- PVC pequeno para configurações que precisem persistir;
- senha administrativa fornecida por Secret, nunca pelo valor padrão `admin` em produção;
- requests e limits conservadores.

Inicialmente acessar Grafana com `kubectl port-forward`. Não abrir as portas 3001 ou 9090 no
Security Group. Uma exposição posterior exige autenticação e TLS.

### 6.4 Validar

1. Gerar tráfego de sucesso e erro na API.
2. Confirmar targets `UP` no Prometheus.
3. Confirmar dashboard e datasource no Grafana.
4. Reiniciar pods e verificar persistência necessária.
5. Acompanhar consumo de RAM, CPU e disco durante algumas horas.
6. Confirmar que Prometheus e Grafana não são acessíveis diretamente pela internet.

### 6.5 Critério de conclusão

- métricas coletadas pelo Service interno;
- dashboard provisionado automaticamente;
- dados do Prometheus limitados a três dias/1 GB;
- nenhuma porta administrativa pública;
- EC2 permanece dentro dos limites de CPU, memória e disco.

## 7. Fase quatro — serviço Go de notificações e Lambda

### Objetivo

Consumir a fila SQS existente e enviar notificações via FCM/APNs usando uma Lambda em Go, sem NAT
Gateway e sem acesso direto da Lambda ao RDS.

### 7.1 Definir o caso de uso antes do código

Documentar quais eventos geram notificação: criação, atualização, convite, lembrete ou outro fluxo.
Se houver notificações programadas para muito tempo no futuro, interromper a implementação e revisar
a arquitetura: SQS não substitui um agendador de longo prazo e EventBridge não está na estimativa.

### 7.2 Definir o contrato SQS

Criar um schema versionado, por exemplo:

```json
{
  "version": 1,
  "type": "event.updated",
  "recipient": {
    "platform": "android",
    "pushToken": "provider-token"
  },
  "notification": {
    "title": "Evento atualizado",
    "body": "Confira os novos detalhes",
    "data": {
      "eventId": "uuid"
    }
  },
  "idempotencyKey": "uuid"
}
```

Não incluir senha, session token ou dados pessoais desnecessários. O SQS já está configurado com
criptografia gerenciada pela AWS e retenção de quatro dias.

### 7.3 Preparar cadastro de dispositivos

O aplicativo precisa obter o token do FCM/APNs e enviá-lo ao Backend autenticado. Implementar:

- tabela Prisma para dispositivos do usuário;
- plataforma, token, datas e status ativo;
- unicidade adequada para evitar duplicação;
- endpoint autenticado para registrar/atualizar token;
- endpoint para desativar token no logout;
- remoção ou desativação após resposta de token inválido do provedor;
- migrations e testes.

### 7.4 Integrar o Backend com SQS

- adicionar o cliente oficial de SQS;
- obter URL da fila por variável `AWS_SQS_QUEUE_URL`;
- usar a IAM Role da EC2/K3s, sem credenciais estáticas;
- buscar os tokens no RDS antes de publicar;
- publicar uma mensagem por destinatário ou um lote com limite explícito;
- não fazer a Lambda consultar o RDS;
- definir se falha ao enfileirar bloqueia ou apenas registra falha no fluxo principal;
- adicionar métricas e testes para publicação.

Será necessário incluir `AWS_SQS_QUEUE_URL` no ConfigMap de produção e conceder ao workload do K3s
o acesso já previsto na role da EC2.

### 7.5 Criar o serviço Go

Criar uma pasta independente, por exemplo `services/notifications/`, contendo:

- `go.mod` e `go.sum`;
- tipos do contrato versionado;
- handler SQS;
- adapters separados para FCM e APNs;
- validação de payload;
- logs estruturados sem tokens completos;
- idempotência por `idempotencyKey` dentro dos limites definidos;
- resposta de falha parcial de lote para que apenas mensagens com erro sejam repetidas;
- testes unitários do contrato e providers;
- testes de integração do handler com eventos SQS representativos.

### 7.6 Preparar credenciais dos provedores

FCM e APNs exigem credenciais externas. Antes do deploy, decidir uma forma segura compatível com o
orçamento aprovado. Não salvar JSON de service account, chave APNs ou conteúdo de chave privada no
Git, CloudFormation, imagem ou logs.

Uma possibilidade inicial é cadastrar os valores manualmente como variáveis criptografadas da
Lambda e manter a fonte em secrets protegidos do GitHub. A decisão precisa ser revisada antes da
implementação, pois adicionar Secrets Manager criaria outro serviço fora da estimativa atual.

### 7.7 Empacotar no ECR e implantar a Lambda

Quando o serviço existir:

1. adicionar um segundo repositório ECR para notificações em `03-services.yml`;
2. manter o armazenamento total dos repositórios dentro dos 5 GB estimados;
3. construir a imagem Go para `linux/amd64`, pois a estimativa da Lambda usa x86;
4. publicar com tag baseada no SHA;
5. adicionar por CloudFormation:
   - role mínima da Lambda;
   - função baseada na imagem do ECR;
   - event source mapping da fila SQS;
   - timeout curto;
   - 256 MB de memória;
   - 512 MB de armazenamento temporário;
   - concorrência limitada após teste de carga.

A Lambda deve permanecer fora da VPC. Ela recebe mensagens pelo serviço gerenciado do SQS e precisa
acessar FCM/APNs pela internet. Colocá-la nas subnets privadas exigiria NAT Gateway, que não está no
orçamento.

### 7.8 Retentativas e mensagens inválidas

Implementar falha parcial de lote e idempotência antes do teste real. Uma DLQ exigiria outra fila
SQS e não está explicitamente contemplada na estimativa; adicioná-la somente após revisão. Enquanto
não houver DLQ, monitorar repetições e aceitar que mensagens irrecuperáveis expirem conforme a
retenção configurada.

### 7.9 Validar ponta a ponta

1. Registrar dispositivo de teste.
2. Disparar um evento real no Backend.
3. Confirmar mensagem na SQS.
4. Confirmar invocação da Lambda.
5. Confirmar recebimento no FCM/APNs.
6. Forçar erro transitório e validar retry.
7. Forçar token inválido e validar desativação planejada.
8. Confirmar ausência de tokens completos nos logs.
9. Conferir métricas de invocações, erros e duração.

### 7.10 Critério de conclusão

- Backend publica usando IAM;
- Lambda consome a fila sem VPC/NAT;
- FCM e APNs recebem notificações;
- falhas parciais não repetem mensagens bem-sucedidas;
- credenciais externas não aparecem no repositório ou logs;
- volume de uso permanece dentro da estimativa.

## 8. Ampliar a pipeline para deploy no K3s

Esta etapa só começa depois das fases de ECR e K3s estarem validadas manualmente.

O workflow de deploy deve:

1. receber o SHA já publicado, sem reconstruir outra imagem;
2. executar ou aplicar o Job de migration;
3. aguardar o Job concluir;
4. atualizar o Deployment para `api-<SHA>`;
5. aguardar `kubectl rollout status`;
6. executar smoke test;
7. registrar o SHA implantado;
8. parar e permitir rollback manual se qualquer etapa falhar.

Antes de implementar, escolher como o GitHub Actions alcançará o K3s sem abrir a porta 6443 para a
internet e sem adicionar credenciais permanentes. Não liberar SSH para faixas amplas do GitHub como
atalho. A solução escolhida precisa respeitar os serviços aprovados e será validada separadamente.

## 9. Automatizar CloudFormation com segurança

Criar workflow separado do deploy da aplicação:

### Em pull requests

- validar sintaxe dos templates;
- executar lint de CloudFormation;
- apresentar diff dos arquivos;
- não acessar nem alterar recursos AWS.

### Na `main`

- autenticar por OIDC com role própria de infraestrutura;
- operar somente stacks do projeto e região `us-east-2`;
- criar change sets para stacks existentes;
- usar GitHub Environment com aprovação manual;
- mostrar substituições e exclusões antes da execução;
- executar stacks na ordem safety, network, data, services e compute;
- usar os nomes reais existentes, nunca nomes novos acidentalmente;
- preservar valores secretos anteriores ou recebê-los de secret protegido;
- usar `CAPABILITY_IAM` apenas nas stacks que criam roles;
- não iniciar RDS/EC2 como efeito colateral de um deploy da aplicação.

CloudFormation gerencia infraestrutura. A pipeline do Backend gerencia imagens e workloads. Não
misturar as duas responsabilidades em um único job sem necessidade.

## 10. Segurança, custo e operação

### Antes de cada implantação

- conferir conta e região AWS;
- verificar Budget e gasto acumulado;
- revisar change set;
- verificar se RDS/EC2 precisam realmente estar ligados;
- confirmar que o commit passou na pipeline;
- confirmar espaço livre no EBS;
- confirmar que nenhum arquivo `.env` entrou no Git ou na imagem.

### Depois de cada implantação

- executar smoke tests;
- revisar logs por erro ou segredo exposto;
- verificar consumo de CPU, RAM e disco;
- remover imagens sem uso somente após confirmar possibilidade de rollback;
- interromper RDS e EC2 quando a janela de uso terminar;
- registrar o SHA implantado e alterações de infraestrutura.

### Pontos que exigem decisão antes da abertura pública

- domínio e TLS/HTTPS;
- forma segura de automatizar acesso do pipeline ao K3s;
- armazenamento de credenciais FCM/APNs;
- necessidade de DLQ;
- necessidade real de duas réplicas no único nó;
- retorno do EBS para os 20 GB estimados caso 12 GB se mostrem insuficientes.

## 11. Definição de conclusão do projeto de infraestrutura

O trabalho estará concluído quando:

- CloudFormation representar somente os recursos aprovados;
- API e migrations forem publicadas no ECR por SHA;
- K3s executar a API sem credenciais AWS estáticas;
- Prometheus e Grafana funcionarem dentro dos limites da EC2/EBS;
- Backend publicar eventos na SQS;
- Lambda Go enviar notificações FCM/APNs;
- pipelines tiverem aprovação, rollback e separação entre aplicação e infraestrutura;
- segredos não estiverem no Git, imagens ou logs;
- custo observado permanecer abaixo de US$ 35 mensais.
