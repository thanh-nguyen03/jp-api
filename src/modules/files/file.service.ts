import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { Message } from 'src/constants/message';

export abstract class FileService {
  abstract upload(file: Express.Multer.File, user: User): Promise<string>;
  abstract get(fileId: string): Promise<string>;
}

@Injectable()
export class FileServiceImpl extends FileService {
  private readonly s3Client: S3Client;
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.s3Client = new S3Client({
      region: this.configService.get('aws').region,
    });
  }

  async upload(file: Express.Multer.File, user: User): Promise<string> {
    const key = `${uuid()}-${file.originalname}`;
    const putObjectCommand = new PutObjectCommand({
      ContentType: file.mimetype,
      Bucket: this.configService.get('aws').bucketName,
      Key: key,
      Body: file.buffer,
    });

    await this.s3Client.send(putObjectCommand);

    const savedFile = await this.prisma.file.create({
      data: {
        name: file.originalname,
        size: file.size,
        contentType: file.mimetype,
        key,
        createdBy: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    return savedFile.id;
  }

  async get(fileId: string): Promise<string> {
    const file = await this.prisma.file.findUnique({
      where: {
        id: fileId,
      },
    });

    if (!file) {
      throw new NotFoundException(Message.FILE_NOT_FOUND);
    }

    const getObjectCommand = new GetObjectCommand({
      Bucket: this.configService.get('aws').bucketName,
      Key: file.key,
    });

    return await getSignedUrl(this.s3Client, getObjectCommand, {
      expiresIn: 60 * 60 * 24 * 7,
    });
  }
}
