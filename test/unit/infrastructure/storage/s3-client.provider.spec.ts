import { S3Client } from '@aws-sdk/client-s3';
import {
  createS3Client,
  createS3ClientConfig,
  getS3Bucket,
} from '../../../../src/infrastructure/storage/s3-client.provider';

describe('S3 client configuration', () => {
  it('configures MiniStack entirely through environment variables', () => {
    const config = createS3ClientConfig({
      AWS_REGION: 'us-east-2',
      AWS_ENDPOINT_URL: 'http://ministack:4566',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
    });
    expect(config).toEqual(
      expect.objectContaining({
        region: 'us-east-2',
        endpoint: 'http://ministack:4566',
        forcePathStyle: true,
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      })
    );
  });

  it('uses AWS standard chains when local settings are absent', () => {
    expect(createS3ClientConfig({ AWS_REGION: 'us-east-2' })).toEqual({
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
    const config = createS3ClientConfig(environment);
    const client = createS3Client(environment);

    expect(config).toEqual({
      region: 'us-east-2',
      credentials: {
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        sessionToken: 'session-token',
      },
    });
    expect(client).toBeInstanceOf(S3Client);
    client.destroy();
  });

  it('rejects incomplete explicit credentials', () => {
    expect(() =>
      createS3ClientConfig({
        AWS_REGION: 'us-east-2',
        AWS_ACCESS_KEY_ID: 'incomplete',
      })
    ).toThrow('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be provided together');
    expect(() =>
      createS3ClientConfig({
        AWS_REGION: 'us-east-2',
        AWS_SECRET_ACCESS_KEY: 'incomplete',
      })
    ).toThrow('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be provided together');
  });

  it('requires the region and bucket', () => {
    expect(() => createS3ClientConfig({})).toThrow(
      'AWS_REGION is required to initialize S3 storage'
    );
    expect(() => getS3Bucket({})).toThrow('AWS_S3_BUCKET is required to initialize S3 storage');
    expect(getS3Bucket({ AWS_S3_BUCKET: 'alibe-media' })).toBe('alibe-media');
  });
});
