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
  static readonly LOGIN_SUCCESSFUL = 'Login successful';
  static readonly REGISTER_SUCCESSFUL = 'Register successful';
  static readonly WRONG_EMAIL_OR_PASSWORD = 'Wrong email or password';
  static readonly INVALID_REFRESH_TOKEN = 'Invalid refresh token';
}
