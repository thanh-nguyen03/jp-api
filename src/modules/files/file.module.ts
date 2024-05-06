import { Module } from '@nestjs/common';
import { FileService, FileServiceImpl } from './file.service';
import { FileController } from './file.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FileController],
  providers: [
    {
      provide: FileService,
      useClass: FileServiceImpl,
    },
  ],
  exports: [FileService],
})
export class FilesModule {}
