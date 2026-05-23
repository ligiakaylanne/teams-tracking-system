import { z } from 'zod';

export const AgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),

  registerId: z
    .string()
    .min(1, 'ID de registro é obrigatório')
    .min(3, 'ID deve ter no mínimo 3 caracteres')
    .max(50, 'ID deve ter no máximo 50 caracteres')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'ID deve conter apenas letras, números, _ ou -'
    ),

  status: z.enum(['ATIVO', 'INATIVO'], {
    message: 'Status deve ser ATIVO ou INATIVO',
  }),
});

export const CheckInSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Latitude mínima: -90')
    .max(90, 'Latitude máxima: 90')
    .refine((v) => !isNaN(v), {
      message: 'Latitude inválida',
    }),

  longitude: z
    .number()
    .min(-180, 'Longitude mínima: -180')
    .max(180, 'Longitude máxima: 180')
    .refine((v) => !isNaN(v), {
      message: 'Longitude inválida',
    }),
});

export type AgentFormData = z.infer<typeof AgentSchema>;
export type CheckInFormData = z.infer<typeof CheckInSchema>;
