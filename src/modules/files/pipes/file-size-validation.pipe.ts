import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Message } from '../../../constants/message';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  transform(value: any) {
    // Max file size is 5MB
    if (value.size > 5 * 1024 * 1024) {
      throw new BadRequestException(Message.FILE_TOO_LARGE);
    }
    return value;
  }
}
