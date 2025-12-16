// upload.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [S3Service],
  exports: [S3Service],
})
export class UploadModule {}
