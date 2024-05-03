import { $Enums, Application } from '@prisma/client';

export class ApplicationDto implements Application {
  id: number;
  message: string;
  status: $Enums.ApplicationStatus;
  cvId: string | null;
  recruitmentId: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;

  cvUrl?: string;
}
