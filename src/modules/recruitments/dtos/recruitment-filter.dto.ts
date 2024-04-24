import { BaseFilter } from '../../../constants/filter';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { AcceptedSortField } from '../../../decorators/accepted-sort-field.decorator';
import { $Enums } from '@prisma/client';
import { Transform } from 'class-transformer';

export class RecruitmentFilter extends BaseFilter {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  @IsIn([...Object.values($Enums.JobType), ''])
  jobType?: $Enums.JobType;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  companyId?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  minSalary?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  maxSalary?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  experience?: number;

  @AcceptedSortField('id', 'updatedAt')
  sort?: BaseFilter['sort'];
}
