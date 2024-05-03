import { BaseFilter } from '../../../constants/filter';
import { PartialType } from '@nestjs/mapped-types';
import { AcceptedSortField } from '../../../decorators/accepted-sort-field.decorator';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { $Enums } from '@prisma/client';

export class ApplicationFilter extends PartialType(BaseFilter) {
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  recruitmentId: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  userId: number;

  @IsOptional()
  @IsString()
  @IsIn([...Object.values($Enums.ApplicationStatus), ''])
  status: $Enums.ApplicationStatus;

  @AcceptedSortField('id')
  sort?: BaseFilter['sort'];
}
