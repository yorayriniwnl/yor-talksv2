export const PASSWORD_REQUIREMENT_MESSAGE =
  'Use 8 or more characters with uppercase, lowercase, a number, and a symbol.';

export type PasswordRequirement = {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'symbol';
  label: string;
  met: boolean;
};

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { id: 'length', label: '8+ characters', met: password.length >= 8 },
    { id: 'uppercase', label: 'Uppercase', met: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'Lowercase', met: /[a-z]/.test(password) },
    { id: 'number', label: 'Number', met: /[0-9]/.test(password) },
    { id: 'symbol', label: 'Symbol', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isValidPassword(password: string): boolean {
  return getPasswordRequirements(password).every((requirement) => requirement.met);
}
