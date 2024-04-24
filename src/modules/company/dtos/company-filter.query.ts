import { PartialType } from '@nestjs/mapped-types';
import { BaseFilter } from '../../../constants/filter';
import { AcceptedSortField } from '../../../decorators/accepted-sort-field.decorator';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompanyFilter extends PartialType(BaseFilter) {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @AcceptedSortField('id', 'code', 'name')
  sort?: BaseFilter['sort'];
}
