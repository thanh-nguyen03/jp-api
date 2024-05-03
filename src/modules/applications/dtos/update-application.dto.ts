import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { $Enums } from '@prisma/client';

export class UpdateApplicationDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  cvId: string;

  @IsOptional()
  @IsString()
  @IsIn([Object.values($Enums.ApplicationStatus), ''])
  status?: $Enums.ApplicationStatus;
}
