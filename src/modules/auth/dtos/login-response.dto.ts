import { User } from '@prisma/client';

export class LoginResponseDto {
  access_token: string;
  refresh_token: string;
  user: Partial<User>;
}
