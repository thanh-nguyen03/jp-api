import { ApplicationDto } from './dtos/application.dto';
import { CreateApplicationDto } from './dtos/create-application.dto';
import { PageResultDto } from '../../constants/page-result.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationFilter } from './dtos/application-filter.query';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Message } from '../../constants/message';
import { $Enums, Prisma, User } from '@prisma/client';
import sortConvert from '../../helpers/sort-convert.helper';
import { UpdateApplicationDto } from './dtos/update-application.dto';
import { FileService } from '../files/file.service';
import { MailService } from '../mail/mail.service';
import mailApproveTemplate from '../../templates/mail-approve-template';
import mailRejectedTemplate from '../../templates/mail-rejected-template';
import { AmqpService } from '../amqp/amqp.service';

export abstract class ApplicationService {
  abstract createApplication(
    data: CreateApplicationDto,
    userId: number,
  ): Promise<ApplicationDto>;

  abstract updateApplication(
    applicationId: number,
    data: UpdateApplicationDto,
  ): Promise<ApplicationDto>;

  abstract findAll(
    filter: ApplicationFilter,
  ): Promise<PageResultDto<ApplicationDto>>;

  abstract findByRecruitmentAndUser(
    recruitmentId: number,
    user: User,
  ): Promise<ApplicationDto>;

  abstract findByRecruitment(
    recruitmentId: number,
    _user: User,
  ): Promise<ApplicationDto[]>;

  abstract getApplicationDetail(
    applicationId: number,
    _user: User,
  ): Promise<ApplicationDto>;

  abstract updateApplicationStatus(
    applicationId: number,
    _user: User,
    isApproved: boolean,
  ): Promise<ApplicationDto>;
}

@Injectable()
export class ApplicationServiceImpl extends ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
    private readonly mailService: MailService,
    private readonly amqpService: AmqpService,
  ) {
    super();
  }

  async findByRecruitmentAndUser(
    recruitmentId: number,
    user: User,
  ): Promise<ApplicationDto> {
    const application = await this.prisma.application.findFirst({
      where: {
        AND: {
          recruitmentId,
          userId: user.id,
        },
      },
      include: {
        recruitment: true,
        cv: true,
      },
    });

    if (!application) {
      throw new NotFoundException(
        Message.USER_NOT_APPLIED(`${user.firstName} ${user.lastName}`),
      );
    }

    if (application.userId !== user.id) {
      throw new ForbiddenException();
    }

    // create the signed url for the cv
    const cvUrl = await this.fileService.get(application.cv.id);

    return {
      ...application,
      cvUrl,
    };
  }

  async createApplication(
    data: CreateApplicationDto,
    userId: number,
  ): Promise<ApplicationDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new BadRequestException(Message.USER_NOT_FOUND);
    }

    if (user.role !== $Enums.Role.USER) {
      throw new ForbiddenException(Message.USER_NOT_ALLOWED_TO_APPLY);
    }

    const { cvId, recruitmentId, ...rest } = data;

    const recruitment = await this.prisma.recruitment.findUnique({
      where: {
        id: recruitmentId,
      },
      include: {
        applications: true,
      },
    });

    if (!recruitment) {
      throw new BadRequestException(Message.RECRUITMENT_NOT_FOUND);
    }

    // check if not passed the deadline
    if (recruitment.deadline < new Date()) {
      throw new BadRequestException(Message.RECRUITMENT_DEADLINE_PASSED);
    }

    const cv = await this.prisma.file.findUnique({
      where: {
        id: cvId,
      },
    });

    if (!cv) {
      throw new BadRequestException(Message.CV_NOT_FOUND(cvId));
    }

    // check if user has already applied for this recruitment
    const isApplied = recruitment.applications.some(
      (application) => application.userId === userId,
    );

    if (isApplied) {
      throw new BadRequestException(
        Message.USER_ALREADY_APPLIED(`${user.firstName} ${user.lastName}`),
      );
    }

    return this.prisma.application.create({
      data: {
        ...rest,
        cv: {
          connect: {
            id: cvId,
          },
        },
        recruitment: {
          connect: {
            id: recruitmentId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async findAll(
    filter: ApplicationFilter,
  ): Promise<PageResultDto<ApplicationDto>> {
    const { userId, recruitmentId, status, limit, offset, sort } = filter;

    const query: Prisma.ApplicationFindManyArgs = {
      where: {
        userId,
        recruitmentId,
        status,
      },
      take: limit,
      skip: offset,
      orderBy: sortConvert(sort),
    };

    const result = await this.prisma.$transaction([
      this.prisma.application.findMany(query),
      this.prisma.application.count({ where: query.where }),
    ]);

    return PageResultDto.of(result[0], result[1], offset, limit);
  }

  async findByRecruitment(recruitmentId: number, _user: User) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: _user.id,
      },
      include: {
        company: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!user.company) {
      throw new ForbiddenException();
    }

    const recruitment = await this.prisma.recruitment.findUnique({
      where: {
        id: recruitmentId,
      },
      include: {
        company: true,
      },
    });

    if (!recruitment) {
      throw new NotFoundException(Message.RECRUITMENT_NOT_FOUND);
    }

    if (recruitment.companyId !== user.company.id) {
      throw new ForbiddenException(Message.RECRUITMENT_COMPANY_FORBIDDEN);
    }

    return this.prisma.application.findMany({
      where: {
        recruitmentId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        cv: true,
      },
    });
  }

  async getApplicationDetail(applicationId: number, _user: User) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: _user.id,
      },
      include: {
        company: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!user.company) {
      throw new ForbiddenException();
    }

    const application = await this.prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        cv: true,
        recruitment: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        Message.APPLICATION_NOT_FOUND(String(applicationId)),
      );
    }

    if (application.recruitment.companyId !== user.company.id) {
      throw new ForbiddenException(Message.APPLICATION_NOT_BELONG_TO_USER);
    }

    // create the signed url for the cv
    const cvUrl = await this.fileService.get(application.cv.id);

    return {
      ...application,
      cvUrl,
    };
  }

  async updateApplication(
    applicationId: number,
    data: UpdateApplicationDto,
  ): Promise<ApplicationDto> {
    const application = await this.prisma.application.findUnique({
      where: {
        id: applicationId,
      },
    });

    if (!application) {
      throw new NotFoundException(
        Message.APPLICATION_NOT_FOUND(String(applicationId)),
      );
    }

    const { message, status, cvId } = data;

    return this.prisma.application.update({
      where: {
        id: applicationId,
      },
      data: {
        message,
        status,
        cv: {
          connect: {
            id: cvId,
          },
        },
      },
    });
  }

  async updateApplicationStatus(
    applicationId: number,
    _user: User,
    isApproved: boolean,
  ): Promise<ApplicationDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: _user.id,
      },
      include: {
        company: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!user.company) {
      throw new ForbiddenException(Message.APPLICATION_NOT_BELONG_TO_USER);
    }

    // check role
    if (
      user.role !== $Enums.Role.COMPANY_ADMIN &&
      user.role !== $Enums.Role.COMPANY_HR
    ) {
      throw new ForbiddenException();
    }

    const application = await this.prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        user: true,
        recruitment: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        Message.APPLICATION_NOT_FOUND(String(applicationId)),
      );
    }

    if (application.recruitment.companyId !== user.company.id) {
      throw new ForbiddenException(Message.APPLICATION_NOT_BELONG_TO_USER);
    }

    const updatedApplication = await this.prisma.application.update({
      where: {
        id: applicationId,
      },
      data: {
        status: isApproved ? 'APPROVED' : 'REJECTED',
      },
    });

    // send email to user
    if (isApproved) {
      this.amqpService.emitMessage('notification-queue', '', {
        type: 'APPROVED',
        application,
      });
    } else {
      this.amqpService.emitMessage('notification-queue', '', {
        type: 'REJECTED',
        application,
      });
    }

    return updatedApplication;
  }
}
