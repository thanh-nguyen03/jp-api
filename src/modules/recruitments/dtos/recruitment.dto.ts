import { $Enums, Recruitment } from '@prisma/client';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RecruitmentDto implements Recruitment {
  id: number;
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  maxSalary: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  minSalary: number;

  @IsInt()
  @IsNotEmpty()
  experience: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values($Enums.JobType))
  jobType: $Enums.JobType;

  @IsDateString()
  @IsNotEmpty()
  deadline: Date;

  companyId: number;
  createdAt: Date;
  updatedAt: Date;
}
