import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CompanyService } from '../company.service';
import { CompanyFilter } from '../dtos/company-filter.query';
import ResponseDto from '../../../constants/response.dto';
import { Message } from '../../../constants/message';
import { CompanyDto } from '../dtos/company.dto';
import { Roles } from '../../../decorators/role.decorator';
import { Role, User } from '@prisma/client';
import { CreateCompanyDto } from '../dtos/create-company.dto';
import { CreateCompanyHrDto } from '../dtos/create-company-hr.dto';
import { CurrentUser } from '../../../decorators/current-user.decorator';

@Roles(Role.ADMIN)
@Controller('admin/companies')
export class AdminCompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async list(@Query() filter: CompanyFilter) {
    return ResponseDto.successDefault(
      await this.companyService.findAll(filter),
    );
  }

  @Get(':id')
  async getCompanyById(@Param('id', ParseIntPipe) id: number) {
    return ResponseDto.successDefault(await this.companyService.findById(id));
  }

  @Get(':code')
  async getCompanyByCode(@Param('code') code: string) {
    return ResponseDto.successDefault(
      await this.companyService.findByCode(code),
    );
  }

  @Roles(Role.ADMIN)
  @Post()
  async createCompany(@Body() data: CreateCompanyDto) {
    return ResponseDto.success(
      await this.companyService.createCompany(data),
      Message.COMPANY_CREATED,
    );
  }

  @Put(':id')
  async updateCompany(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: CompanyDto,
  ) {
    return ResponseDto.success(
      await this.companyService.updateCompany(id, data),
      Message.COMPANY_UPDATED,
    );
  }

  @Delete(':id')
  async deleteCompany(@Param('id', ParseIntPipe) id: number) {
    await this.companyService.deleteCompany(id);
    return ResponseDto.successWithoutData(Message.COMPANY_DELETED);
  }

  @Roles(Role.COMPANY_ADMIN)
  @Post('my-company/hr')
  async createCompanyHR(
    @Body(new ParseArrayPipe({ items: CreateCompanyHrDto }))
    data: CreateCompanyHrDto[],
    @CurrentUser() user: User,
  ) {
    return ResponseDto.successDefault(
      await this.companyService.createCompanyHR(data, user),
    );
  }

  @Get('my-company/hr')
  @Roles(Role.COMPANY_ADMIN)
  async getCompanyHR(@CurrentUser() user: User) {
    return ResponseDto.successDefault(
      await this.companyService.getCompanyHRList(user),
    );
  }

  @Delete('my-company/hr/:id')
  @Roles(Role.COMPANY_ADMIN)
  async deleteCompanyHR(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.companyService.deleteCompanyHR(id, user);
    return ResponseDto.successWithoutData(Message.COMPANY_HR_DELETED);
  }
}
