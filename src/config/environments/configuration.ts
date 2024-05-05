import { JwtSignOptions } from '@nestjs/jwt';
import * as process from 'process';

export interface IConfig {
  jwt: JwtSignOptions;
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucketName: string;
  };
  mail: {
    user: string;
    password: string;
  };
}

export default (): IConfig => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.BUCKET_NAME,
  },
  mail: {
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
  },
});
