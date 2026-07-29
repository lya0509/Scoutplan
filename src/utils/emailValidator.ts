// Validación y detección inteligente de errores tipográficos en correos (ej: gmial.com -> gmail.com)

const COMMON_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'iclaud.com': 'icloud.com',
};

export interface EmailValidationResult {
  isValid: boolean;
  errorMessage?: string;
  suggestedEmail?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Formato básico de correo con Expresión Regular
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return {
      isValid: false,
      errorMessage: 'El correo electrónico no tiene un formato válido (ej: usuario@dominio.com).'
    };
  }

  // 2. Detección de errores típicos de dominio (ej: gmial.com)
  const parts = cleanEmail.split('@');
  if (parts.length === 2) {
    const username = parts[0];
    const domain = parts[1];

    if (COMMON_DOMAINS[domain]) {
      const correctedDomain = COMMON_DOMAINS[domain];
      const suggested = `${username}@${correctedDomain}`;
      return {
        isValid: false,
        errorMessage: `¿Escribiste bien tu correo? Parece que quisiste decir "${suggested}".`,
        suggestedEmail: suggested
      };
    }
  }

  return { isValid: true };
}
