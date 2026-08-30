#!/bin/sh

set -e

echo "Applying Alibe local infrastructure..."

aws \
  --endpoint-url=http://ministack:4566 \
  cloudformation deploy \
  --template-file /infra/cloudformation/alibe.yml \
  --stack-name alibe-local \
  --parameter-overrides \
    MediaBucketName="${AWS_S3_BUCKET}" \ 
  --region "${AWS_REGION}" \
  --no-fail-on-empty-changeset

echo "Alibe local infrastructure ready."