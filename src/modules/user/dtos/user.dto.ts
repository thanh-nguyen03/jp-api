import { $Enums, User } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserDto implements User {
  avatar: string | null;
  createdAt: Date;
  displayName: string | null;
  email: string;
  firstName: string;
  id: number;
  lastName: string;

  @Exclude()
  password: string;
  role: $Enums.Role;
  updatedAt: Date;
}
