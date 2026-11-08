import { SQSClient } from '@aws-sdk/client-sqs';
import {
  createSqsClient,
  createSqsClientConfig,
  getNotificationQueueUrl,
} from '../../../../src/infrastructure/messaging/sqs-client.provider';

describe('SQS client configuration', () => {
  it('configures MiniStack entirely through environment variables', () => {
    expect(
      createSqsClientConfig({
        AWS_REGION: 'us-east-2',
        AWS_ENDPOINT_URL: 'http://ministack:4566',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
      })
    ).toEqual({
      region: 'us-east-2',
      endpoint: 'http://ministack:4566',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    });
  });

  it('uses AWS standard chains when local settings are absent', () => {
    expect(createSqsClientConfig({ AWS_REGION: 'us-east-2' })).toEqual({
      region: 'us-east-2',
    });
  });

  it('supports session credentials and client creation', () => {
    const environment = {
      AWS_REGION: 'us-east-2',
      AWS_ACCESS_KEY_ID: 'access-key',
      AWS_SECRET_ACCESS_KEY: 'secret-key',
      AWS_SESSION_TOKEN: 'session-token',
    };
    const client = createSqsClient(environment);

    expect(createSqsClientConfig(environment)).toEqual({
      region: 'us-east-2',
      credentials: {
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        sessionToken: 'session-token',
      },
    });
    expect(client).toBeInstanceOf(SQSClient);
    client.destroy();
  });

  it('rejects incomplete explicit credentials', () => {
    expect(() =>
      createSqsClientConfig({
        AWS_REGION: 'us-east-2',
        AWS_ACCESS_KEY_ID: 'incomplete',
      })
    ).toThrow('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be provided together');
  });

  it('requires the region and queue URL', () => {
    expect(() => createSqsClientConfig({})).toThrow(
      'AWS_REGION is required to initialize SQS messaging'
    );
    expect(() => getNotificationQueueUrl({})).toThrow(
      'AWS_SQS_NOTIFICATION_QUEUE_URL is required to initialize SQS messaging'
    );
  });
});
