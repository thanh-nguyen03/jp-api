import { registerDecorator, ValidationArguments } from 'class-validator';
import { Sort } from '../constants/sort';

export const AcceptedSortField =
  (...acceptedSortFields: string[]) =>
  (object: unknown, propertyName: string) => {
    registerDecorator({
      name: 'acceptedSortField',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [acceptedSortFields],
      options: {
        message: `sortField must be in [${acceptedSortFields.join(', ')}]`,
      },
      validator: {
        validate: (value: Sort[], { constraints }: ValidationArguments) => {
          const [fields] = constraints;
          return (
            fields.length === 0 ||
            value?.length === 0 ||
            value?.every((s: Sort) => fields.includes(s.field))
          );
        },
      },
    });
  };
