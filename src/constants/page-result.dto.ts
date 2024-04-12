import { Exclude } from 'class-transformer';

export class PageResultDto<T> {
  @Exclude()
  data: T[];

  total: number;
  offset: number;
  limit: number;

  constructor(data: T[], total: number, offset: number, limit: number) {
    this.data = data;
    this.total = total;
    this.offset = offset;
    this.limit = limit;
  }

  static of<T>(data: T[], total: number, offset: number, limit: number) {
    return new PageResultDto(data, total, offset, limit);
  }
}
