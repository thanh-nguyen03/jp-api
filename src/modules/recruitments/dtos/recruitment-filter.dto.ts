import { BaseFilter } from '../../../constants/filter';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { AcceptedSortField } from '../../../decorators/accepted-sort-field.decorator';
import { $Enums } from '@prisma/client';

export class RecruitmentFilter extends BaseFilter {
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values($Enums.JobType))
  jobType: $Enums.JobType;

  @IsOptional()
  @IsInt()
  companyId: number;

  @IsOptional()
  @IsInt()
  minSalary: number;

  @IsOptional()
  @IsInt()
  maxSalary: number;

  @IsOptional()
  @IsInt()
  experience: number;

  @AcceptedSortField('id', 'updatedAt')
  sort: BaseFilter['sort'];
}
