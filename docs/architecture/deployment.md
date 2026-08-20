# Proposta simples de deploy

Este documento registra somente a primeira proposta de deploy do Backend. Ela ainda não foi implementada na AWS.

## Componentes

```text
Aplicativo / Internet
        |
        v
Load Balancer (ALB)
        |
        v
ECS Service
   |          |
EC2 #1     EC2 #2
   \          /
    RDS PostgreSQL

O Backend nas EC2 também lê e grava imagens no S3.
```

Responsabilidades:

| Componente     | Responsabilidade                                                                           |
| -------------- | ------------------------------------------------------------------------------------------ |
| ALB            | Receber as requisições e distribuí-las entre as instâncias disponíveis.                    |
| ECS            | Manter e atualizar os containers do Backend executados nas EC2. ECS não é o load balancer. |
| Duas EC2       | Executar duas cópias do Backend.                                                           |
| RDS PostgreSQL | Armazenar os dados da aplicação.                                                           |
| S3             | Armazenar as imagens utilizadas pela aplicação. O Backend acessa o bucket.                 |
| ECR            | Armazenar a imagem Docker utilizada pelo ECS.                                              |

O diagrama editável está em [`../diagrams/cd.drawio`](../diagrams/cd.drawio).

## Fluxo proposto de CD

```text
Merge em main
  -> CI passa
  -> GitHub Actions cria a imagem Docker
  -> publica a imagem no ECR
  -> solicita ao ECS a atualização do Backend
  -> ECS atualiza os containers nas duas EC2
```

Esse fluxo ainda precisa ser configurado. Antes disso, precisamos criar e identificar os recursos AWS e decidir como as migrations do Prisma serão executadas.

## Notificações push: primeira versão

Não precisamos de SQS ou Lambda para começar.

```text
Backend percebe que precisa notificar
  -> procura o token do aparelho salvo no banco
  -> envia a mensagem ao Firebase Cloud Messaging
  -> Firebase entrega no Android
     ou encaminha ao APNs no iPhone
```

O diagrama editável está em [`../diagrams/push-notifications.drawio`](../diagrams/push-notifications.drawio).

A primeira versão envia diretamente pelo Firebase. Outros serviços só serão avaliados se surgir uma necessidade concreta.

## Referências oficiais

- [Amazon ECS com load balancing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/fcm-architecture)
- [Ícones oficiais de arquitetura AWS](https://aws.amazon.com/architecture/icons/)
