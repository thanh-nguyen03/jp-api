import { Message } from './message';
import { PageResultDto } from './page-result.dto';

export default class ResponseDto<T = null> {
  data: T | T[];
  message: Message;
  success: boolean;
  pageInfo?: PageResultDto<T>;

  constructor(data: T, message: Message, success: boolean) {
    this.data = data;
    this.message = message;
    this.success = success;

    if (data instanceof PageResultDto) {
      this.data = data.data;
      this.pageInfo = {
        total: data.total,
        offset: data.offset,
        limit: data.limit,

        // Exclude data from the response
        data: null,
      };
    }
  }

  static success<T>(data: T, message: Message) {
    return new ResponseDto<T>(data, message, true);
  }

  static error<T>(data: T, message: Message) {
    return new ResponseDto<T>(data, message, false);
  }

  static successWithoutData(message: Message) {
    return new ResponseDto(null, message, true);
  }

  static errorWithoutData(message: Message) {
    return new ResponseDto(null, message, false);
  }

  static successDefault<T>(data: T) {
    return new ResponseDto<T>(data, Message.SUCCESS, true);
  }

  static errorDefault<T>(data: T) {
    return new ResponseDto<T>(data, Message.ERROR, false);
  }
}
