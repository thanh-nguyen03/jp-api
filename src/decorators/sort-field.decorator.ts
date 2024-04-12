import { plainToClass, Transform, Type } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { IsOptional, ValidateNested } from 'class-validator';
import { Sort } from '../constants/sort';

export const SortField = () =>
  applyDecorators(
    IsOptional(),
    Type(() => Sort),
    ValidateNested({ each: true }),
    Transform(
      ({ value }) =>
        value?.split(',')?.map((sortString) => {
          const field = sortString?.split(':')?.[0];
          const direction = sortString?.split(':')?.[1]?.toUpperCase() ?? 'ASC';
          return plainToClass(Sort, { field, direction });
        }),
      { toClassOnly: true },
    ),
  );
