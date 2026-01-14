import { z } from 'zod';

/**
 * Схемы валидации для входных данных пользователя
 * Используется библиотека Zod для типобезопасной валидации
 */

// Валидация email адреса
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(255, 'Email is too long')
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Валидация пароля
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long');

// Валидация имени (первое и последнее)
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Zа-яА-ЯёЁіІїЇєЄ\s'-]+$/, 'Name contains invalid characters')
  .trim();

// Валидация телефона (международный формат)
export const phoneSchema = z
  .string()
  .min(10, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .regex(/^[\d\s\-\+\(\)]+$/, 'Phone number contains invalid characters')
  .trim();

// Валидация адреса
export const addressSchema = z
  .string()
  .min(5, 'Address is too short')
  .max(500, 'Address is too long')
  .trim();

// Валидация Eircode (ирландский почтовый индекс)
export const eircodeSchema = z
  .string()
  .min(1, 'Eircode is required')
  .max(20, 'Eircode is too long')
  .regex(/^[A-Z0-9\s]+$/i, 'Eircode contains invalid characters')
  .trim();

// Валидация даты рождения (формат YYYY-MM-DD)
export const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
  .refine((date) => {
    const parsed = new Date(date);
    const today = new Date();
    const minDate = new Date('1900-01-01');
    return parsed <= today && parsed >= minDate;
  }, 'Date must be between 1900-01-01 and today');

// Валидация сообщения чата
export const chatMessageSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(10000, 'Message is too long (maximum 10000 characters)')
  .trim();

// Валидация профиля пользователя
export const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  mobileNumber: phoneSchema,
  address: addressSchema,
  eircode: eircodeSchema,
  dateOfBirth: dateOfBirthSchema
});

// Валидация формы регистрации/входа
export const authFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

// Валидация формы регистрации (с требованиями к паролю)
export const registrationFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

// Типы для использования в компонентах
export type ProfileFormData = z.infer<typeof profileSchema>;
export type AuthFormData = z.infer<typeof authFormSchema>;
export type RegistrationFormData = z.infer<typeof registrationFormSchema>;

/**
 * Вспомогательная функция для безопасной валидации
 * Возвращает либо валидированные данные, либо ошибку
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Возвращаем первую ошибку валидации
      const firstError = error.errors[0];
      return { 
        success: false, 
        error: firstError?.message || 'Validation failed' 
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Валидация с получением всех ошибок
 */
export function validateDataWithAllErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => err.message);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}
