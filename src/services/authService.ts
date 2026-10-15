import { isAllowedStudentDomain } from '../utils/authValidation';

export const authService = {
  validateEmail(email: string): boolean {
    return isAllowedStudentDomain(email);
  },

  validatePassword(password: string): boolean {
    return typeof password === 'string' && password.length >= 6;
  }
};
