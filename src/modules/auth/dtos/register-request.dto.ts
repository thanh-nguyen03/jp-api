import { IsEmail, IsNotEmpty, IsString, Min } from 'class-validator';

export class RegisterRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @Min(6)
  password: string;
}
