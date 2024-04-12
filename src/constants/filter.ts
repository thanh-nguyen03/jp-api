import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Sort } from './sort';
import { AcceptedSortField } from '../decorators/accepted-sort-field.decorator';
import { SortField } from '../decorators/sort-field.decorator';
import { Default } from '../decorators/default.decorator';

export class BaseFilter {
  @IsOptional()
  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  limit: number = 20;

  @AcceptedSortField()
  @SortField()
  @Default([])
  sort: Array<Sort> = [];
}
