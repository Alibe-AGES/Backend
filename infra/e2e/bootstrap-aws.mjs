// Cria no MiniStack o bucket e a fila que a API usa. Roda no container
// `setup` de infra/e2e/docker-compose.yml, com o SDK que já é dependência
// do backend, para não precisar da imagem do aws-cli no CI.
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { CreateQueueCommand, SQSClient } from '@aws-sdk/client-sqs';

const region = process.env.AWS_REGION;
const endpoint = process.env.AWS_ENDPOINT_URL;
const bucket = process.env.AWS_S3_BUCKET;
const queueName = process.env.AWS_SQS_NOTIFICATION_QUEUE_URL.split('/').pop();

const s3 = new S3Client({ region, endpoint, forcePathStyle: true });
const sqs = new SQSClient({ region, endpoint });

try {
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
} catch (error) {
  if (error.name !== 'BucketAlreadyOwnedByYou' && error.name !== 'BucketAlreadyExists') {
    throw error;
  }
}

await sqs.send(new CreateQueueCommand({ QueueName: queueName }));

console.log(`MiniStack pronto: bucket ${bucket}, fila ${queueName}`);
