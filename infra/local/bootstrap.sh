#!/bin/sh

set -e

echo "Applying Alibe local infrastructure..."

NOTIFICATION_CODE_KEY="local-infrastructure/notification-service.zip"

aws \
  --endpoint-url=http://ministack:4566 \
  cloudformation deploy \
  --template-file /infra/local/cloudformation/storage.yml \
  --stack-name alibe-local \
  --parameter-overrides \
    MediaBucketName="${AWS_S3_BUCKET}" \
  --region "${AWS_REGION}" \
  --no-fail-on-empty-changeset

echo "Uploading the local notification Lambda package..."

aws \
  --endpoint-url=http://ministack:4566 \
  s3 cp \
  /artifacts/notification-service.zip \
  "s3://${AWS_S3_BUCKET}/${NOTIFICATION_CODE_KEY}" \
  --region "${AWS_REGION}"

aws \
  --endpoint-url=http://ministack:4566 \
  cloudformation deploy \
  --template-file /infra/local/cloudformation/notifications.yml \
  --stack-name alibe-local-notifications \
  --parameter-overrides \
    MediaBucketName="${AWS_S3_BUCKET}" \
    NotificationCodeS3Key="${NOTIFICATION_CODE_KEY}" \
  --capabilities CAPABILITY_IAM \
  --region "${AWS_REGION}" \
  --no-fail-on-empty-changeset

# O objeto S3 usa sempre a mesma chave. Esta chamada garante que uma nova
# compilacao do Go atualize a funcao mesmo quando o template nao mudou.
aws \
  --endpoint-url=http://ministack:4566 \
  lambda update-function-code \
  --function-name alibe-local-notification \
  --s3-bucket "${AWS_S3_BUCKET}" \
  --s3-key "${NOTIFICATION_CODE_KEY}" \
  --region "${AWS_REGION}" \
  >/dev/null

echo "Alibe local infrastructure ready."
