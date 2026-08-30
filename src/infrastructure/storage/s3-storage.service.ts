import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import {
  ObjectStorage,
  type SaveObjectInput,
  type StoredObject,
} from '../../shared/storage/object-storage';
import { S3_BUCKET, S3_CLIENT } from './s3-client.provider';

@Injectable()
export class S3StorageService extends ObjectStorage {
  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    @Inject(S3_BUCKET) private readonly bucket: string
  ) {
    super();
  }

  async save(input: SaveObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.bytes,
        ContentType: input.contentType,
      })
    );
  }

  async findByKey(key: string): Promise<StoredObject | null> {
    try {
      const output = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      );

      if (!output.Body) {
        throw new Error(`S3 object ${key} returned an empty body`);
      }

      return {
        bytes: await output.Body.transformToByteArray(),
        contentType: output.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private isNotFound(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const s3Error = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    return s3Error.name === 'NoSuchKey' || s3Error.$metadata?.httpStatusCode === 404;
  }
}
