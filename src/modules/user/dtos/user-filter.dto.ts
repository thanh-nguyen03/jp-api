import { BaseFilter } from '../../../constants/filter';
import { IsOptional, IsString } from 'class-validator';
import { AcceptedSortField } from '../../../decorators/accepted-sort-field.decorator';

export class UserFilter extends BaseFilter {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @AcceptedSortField('id', 'name')
  sort?: BaseFilter['sort'];
}
