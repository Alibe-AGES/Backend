import { Module } from '@nestjs/common';
import { ObjectStorage } from '../../shared/storage/object-storage';
import { createS3Client, getS3Bucket, S3_BUCKET, S3_CLIENT } from './s3-client.provider';
import { S3StorageService } from './s3-storage.service';

@Module({
  providers: [
    { provide: S3_CLIENT, useFactory: createS3Client },
    { provide: S3_BUCKET, useFactory: getS3Bucket },
    S3StorageService,
    {
      provide: ObjectStorage,
      useExisting: S3StorageService,
    },
  ],
  exports: [ObjectStorage],
})
export class StorageModule {}
