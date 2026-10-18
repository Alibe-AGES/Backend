import { SQSClient, type SQSClientConfig } from '@aws-sdk/client-sqs';

export const SQS_CLIENT = Symbol('SQS_CLIENT');
export const NOTIFICATION_QUEUE_URL = Symbol('NOTIFICATION_QUEUE_URL');

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to initialize SQS messaging`);
  }
  return value;
}

function optional(environment: NodeJS.ProcessEnv, name: string): string | undefined {
  return environment[name]?.trim() || undefined;
}

export function createSqsClientConfig(
  environment: NodeJS.ProcessEnv = process.env
): SQSClientConfig {
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
    ...(endpoint ? { endpoint } : {}),
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

export function createSqsClient(environment: NodeJS.ProcessEnv = process.env): SQSClient {
  return new SQSClient(createSqsClientConfig(environment));
}

export function getNotificationQueueUrl(environment: NodeJS.ProcessEnv = process.env): string {
  return required(environment, 'AWS_SQS_NOTIFICATION_QUEUE_URL');
}
