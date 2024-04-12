import { Company } from '@prisma/client';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CompanyDto implements Company {
  id: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(10)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsString()
  logo: string | null;

  createdAt: Date;
  updatedAt: Date;
}
