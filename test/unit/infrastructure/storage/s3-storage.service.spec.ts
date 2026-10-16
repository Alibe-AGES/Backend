import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { S3StorageService } from '../../../../src/infrastructure/storage/s3-storage.service';

describe('S3StorageService', () => {
  const send = jest.fn();
  const service = new S3StorageService({ send } as unknown as S3Client, 'alibe-local-media');

  beforeEach(() => send.mockReset());

  it('uploads an object to the configured bucket', async () => {
    send.mockResolvedValue({});

    await service.save({
      key: 'example-image.png',
      bytes: Buffer.from('image'),
      contentType: 'image/png',
    });

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'alibe-local-media',
      Key: 'example-image.png',
      Body: Buffer.from('image'),
      ContentType: 'image/png',
    });
  });

  it('downloads an object as bytes', async () => {
    send.mockResolvedValue({
      Body: {
        transformToByteArray: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3])),
      },
      ContentType: 'image/png',
    });

    const result = await service.findByKey('example-image.png');
    const command = send.mock.calls[0][0] as GetObjectCommand;

    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'alibe-local-media',
      Key: 'example-image.png',
    });
    expect(result).toEqual({
      bytes: Uint8Array.from([1, 2, 3]),
      contentType: 'image/png',
    });
  });

  it('rejects a download without a response body', async () => {
    send.mockResolvedValue({});

    await expect(service.findByKey('empty.txt')).rejects.toThrow(
      'S3 object empty.txt returned an empty body'
    );
  });

  it('returns null when S3 reports that the object does not exist', async () => {
    send
      .mockRejectedValueOnce({ name: 'NoSuchKey' })
      .mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } });

    await expect(service.findByKey('missing-one.png')).resolves.toBeNull();
    await expect(service.findByKey('missing-two.png')).resolves.toBeNull();
  });

  it('uses a safe content type when S3 does not provide one', async () => {
    send.mockResolvedValue({
      Body: {
        transformToByteArray: jest.fn().mockResolvedValue(Uint8Array.from([1])),
      },
    });

    await expect(service.findByKey('unknown.bin')).resolves.toEqual({
      bytes: Uint8Array.from([1]),
      contentType: 'application/octet-stream',
    });
  });

  it('deletes an object from the configured bucket', async () => {
    send.mockResolvedValue({});

    await service.delete('example-image.png');

    const command = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'alibe-local-media',
      Key: 'example-image.png',
    });
  });
});
