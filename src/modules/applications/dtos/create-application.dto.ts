import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  cvId: string;

  @IsInt()
  @IsNotEmpty()
  recruitmentId: number;
}
