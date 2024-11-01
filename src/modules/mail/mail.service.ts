import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter = null;
  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('mail').user,
        pass: this.configService.get('mail').password,
      },
    });
  }

  async sendMail(to: string, subject: string, content: string) {
    const result = await this.transporter.sendMail({
      from: this.configService.get('mail').user,
      to,
      subject,
      html: content,
    });
  }
}
