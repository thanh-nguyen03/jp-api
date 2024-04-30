export class Message {
  // Common
  static readonly SUCCESS = 'Success';
  static readonly ERROR = 'Error';

  // User
  static readonly USER_NOT_FOUND = (message: string) =>
    `User with ID/Email: '${message}' not found`;
  static readonly USER_ALREADY_EXISTS = (message: string) =>
    `User with Email: '${message}' already exists`;

  // Auth
  static readonly LOGIN_SUCCESSFULLY = 'Login successfully';
  static readonly REGISTER_SUCCESSFULLY = 'Register successfully';
  static readonly WRONG_EMAIL_OR_PASSWORD = 'Wrong email or password';
  static readonly INVALID_REFRESH_TOKEN = 'Invalid refresh token';

  // Company
  static readonly COMPANY_CREATED = 'Company created successfully';
  static readonly COMPANY_UPDATED = 'Company updated successfully';
  static readonly COMPANY_DELETED = 'Company deleted successfully';
  static readonly COMPANY_NOT_FOUND = 'Company not found';
  static readonly COMPANY_CODE_NOT_FOUND = (message: string) =>
    `Company with code: '${message}' not found`;
  static readonly COMPANY_CODE_ALREADY_EXISTS = (message: string) =>
    `Company with code: '${message}' already exists`;

  // Recruitment
  static readonly RECRUITMENT_CREATED = 'Recruitment created successfully';
  static readonly RECRUITMENT_UPDATED = 'Recruitment updated successfully';
  static readonly RECRUITMENT_DELETED = 'Recruitment deleted successfully';
  static readonly RECRUITMENT_NOT_FOUND = 'Recruitment not found';
  static readonly RECRUITMENT_COMPANY_FORBIDDEN =
    'Recruitment not belong to your company';

  // File
  static readonly FILE_TOO_LARGE = 'File too large';
  static readonly FILE_NOT_FOUND = 'File not found';
}
