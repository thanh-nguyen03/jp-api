import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import ResponseDto from '../../constants/response.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    console.log('file', file);
    return ResponseDto.successDefault(
      await this.fileService.upload(file, user),
    );
  }

  @Get(':fileId')
  async getFile(@Param('fileId') fileId: string) {
    return ResponseDto.successDefault(await this.fileService.get(fileId));
  }
}
