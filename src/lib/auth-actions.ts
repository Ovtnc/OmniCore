'use server';

import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const registerSchema = z
  .object({
    name: z.string().min(1, 'Ad gerekli').max(100),
    email: z.string().email('Geçerli bir e-posta girin').transform((s) => s.trim().toLowerCase()),
    password: z
      .string()
      .min(8, 'Şifre en az 8 karakter olmalı')
      .max(128)
      .regex(/[A-Za-z]/, 'Şifre en az bir harf içermeli')
      .regex(/[0-9]/, 'Şifre en az bir rakam içermeli'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

export type RegisterState = { ok: true } | { ok: false; error: string; field?: string };

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const field = (first.name?.[0] || first.email?.[0] || first.password?.[0] || first.confirmPassword?.[0]) as string | undefined;
    return { ok: false, error: parsed.error.message, field };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: 'Bu e-posta adresi zaten kayıtlı.', field: 'email' };
  }

  const hashedPassword = await hash(password, 12);

  const base = (name.replace(/\s+/g, '-').toLowerCase() || 'isletme').replace(/[^a-z0-9-]/g, '');
  const slug = `${base}-${Date.now().toString(36)}`.slice(0, 48) || 't-' + Date.now().toString(36);

  const user = await prisma.user.create({
    data: {
      email,
      name: name.trim(),
      password: hashedPassword,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: name.trim() || 'İşletmem',
      slug,
      plan: 'STARTER',
    },
  });

  await prisma.store.create({
    data: {
      tenantId: tenant.id,
      name: 'Ana Mağaza',
      slug: 'default',
    },
  });

  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  return { ok: true };
}
