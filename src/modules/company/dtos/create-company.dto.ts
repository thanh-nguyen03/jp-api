import { CompanyDto } from './company.dto';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateCompanyDto extends CompanyDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  companyAccountEmail: string;

  @IsString()
  @IsNotEmpty()
  companyAccountFirstName: string;

  @IsString()
  @IsNotEmpty()
  companyAccountLastName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  companyAccountPassword: string;
}
