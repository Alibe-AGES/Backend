import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';

export const S3_CLIENT = Symbol('S3_CLIENT');
export const S3_BUCKET = Symbol('S3_BUCKET');

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to initialize S3 storage`);
  }
  return value;
}

function optional(environment: NodeJS.ProcessEnv, name: string): string | undefined {
  return environment[name]?.trim() || undefined;
}

export function createS3ClientConfig(environment: NodeJS.ProcessEnv = process.env): S3ClientConfig {
  const region = required(environment, 'AWS_REGION');
  const endpoint = optional(environment, 'AWS_ENDPOINT_URL');
  const accessKeyId = optional(environment, 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = optional(environment, 'AWS_SECRET_ACCESS_KEY');
  const sessionToken = optional(environment, 'AWS_SESSION_TOKEN');

  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be provided together');
  }

  return {
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    ...(accessKeyId && secretAccessKey
      ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken ? { sessionToken } : {}),
          },
        }
      : {}),
  };
}

export function createS3Client(environment: NodeJS.ProcessEnv = process.env): S3Client {
  return new S3Client(createS3ClientConfig(environment));
}

export function getS3Bucket(environment: NodeJS.ProcessEnv = process.env): string {
  return required(environment, 'AWS_S3_BUCKET');
}
