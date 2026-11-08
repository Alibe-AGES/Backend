# Deploy automático (CD)

## Como funciona

Tudo fica no workflow `.github/workflows/cd-production.yml` do Backend. A cada merge na `main`
com os testes verdes, dois jobs rodam em paralelo:

| Job      | O que faz                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy` | pede à EC2 (via SSM, sem SSH) que rode `/home/ec2-user/deploy.sh` com o commit novo                                                                   |
| `lambda` | lê o commit do submódulo `services/notification-service`; se for diferente do que a Lambda roda, builda esse commit, envia ao ECR e atualiza a Lambda |

O `deploy.sh` **mora na EC2**, não no repositório. O workflow só chama o script com o commit novo.

**Para atualizar a Lambda:** faça o merge no `Notification_Service`, aponte o submódulo para o
commit novo e faça o merge no Backend:

```bash
cd services/notification-service && git fetch && git checkout origin/main && cd ../..
git add services/notification-service && git commit -m "chore: atualiza notification-service"
```

O login do GitHub na AWS é feito sem chave (OIDC), com a permissão criada pela stack
`alibe-prod-cicd` (`infra/prod/cloudformation/05-cicd.yml`).

## Configuração (uma vez)

1. **Permissões do GitHub**, no CloudShell da AWS:

   ```bash
   git clone -b develop https://github.com/Alibe-AGES/Backend.git && cd Backend
   aws cloudformation deploy --stack-name alibe-prod-cicd \
     --template-file infra/prod/cloudformation/05-cicd.yml --capabilities CAPABILITY_NAMED_IAM
   aws cloudformation describe-stacks --stack-name alibe-prod-cicd \
     --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' --output table
   ```

   Se der erro dizendo que o provider do GitHub já existe, rode o `deploy` de novo com
   `--parameter-overrides CreateGitHubOidcProvider=false`.

2. **Permissão de SSM na EC2**, pelo console: EC2 → `alibe-prod-compute` → aba **Segurança** →
   **Função do IAM** → **Adicionar permissões** → **Anexar políticas** →
   `AmazonSSMManagedInstanceCore`. Depois, na EC2: `sudo systemctl restart amazon-ssm-agent`.

3. **Secrets** (Settings → Secrets and variables → Actions):

   | Repositório | Secret            | Valor                                       |
   | ----------- | ----------------- | ------------------------------------------- |
   | `Backend`   | `AWS_ROLE_ARN`    | output `BackendDeployRoleArn`               |
   | `Backend`   | `EC2_INSTANCE_ID` | ID da instância (EC2 → Instâncias, `i-...`) |

4. **Script na EC2:** `/home/ec2-user/deploy.sh` precisa existir e aceitar a variável `SHA`
   (o commit a implantar).

## Voltar uma versão

GitHub → Actions → _CD Production_ → **Run workflow** → informe o commit anterior do Backend.
A EC2 e a Lambda voltam para o que esse commit tinha.

## Atenção

- A stack `alibe-prod-compute` usa "sempre a AMI mais recente". Ao atualizá-la, passe
  `PinnedAmiId` com a AMI atual da EC2, senão a EC2 é **recriada do zero**.
- A stack `alibe-prod-services` guarda a tag inicial da Lambda (`NotificationImageTag`). Ao
  atualizá-la, informe a tag que a Lambda está usando agora.
