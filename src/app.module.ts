import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/environments/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AppLoggerMiddleware } from './middlewares/api-loggers.middleware';
import { CompanyModule } from './modules/company/company.module';
import { RecruitmentModule } from './modules/recruitments/recruitment.module';
import { FilesModule } from './modules/files/file.module';
import { ApplicationModule } from './modules/applications/application.module';
import { MailModule } from './modules/mail/mail.module';
import { StatisticModule } from './modules/statistics/statistic.module';
import { SleepMiddleware } from './middlewares/sleep.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configuration],
    }),
    MailModule,
    FilesModule,
    AuthModule,
    UserModule,
    CompanyModule,
    RecruitmentModule,
    ApplicationModule,
    StatisticModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(SleepMiddleware).forRoutes('*');
    consumer.apply(AppLoggerMiddleware).forRoutes('*');
  }
}
