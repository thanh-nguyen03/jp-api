import { IsIn, IsString } from 'class-validator';

export class Sort {
  @IsString()
  field: string;

  @IsString()
  @IsIn(['desc', 'asc'])
  direction: 'desc' | 'asc';
}
