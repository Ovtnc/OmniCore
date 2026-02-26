import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  emailFromResetIdentifier,
  hashResetToken,
  isPasswordResetIdentifier,
} from '@/lib/password-reset';

const resetSchema = z
  .object({
    token: z.string().min(1, 'Token gerekli'),
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz istek' },
        { status: 400 }
      );
    }

    const { token: rawToken, password } = parsed.data;
    const token = hashResetToken(rawToken);

    const verification = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: { gt: new Date() },
      },
    });

    if (!verification || !isPasswordResetIdentifier(verification.identifier)) {
      return NextResponse.json(
        { ok: false, error: 'Geçersiz veya süresi dolmuş bağlantı' },
        { status: 400 }
      );
    }

    const email = emailFromResetIdentifier(verification.identifier);
    if (!email) {
      return NextResponse.json(
        { ok: false, error: 'Geçersiz veya süresi dolmuş bağlantı' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Geçersiz veya süresi dolmuş bağlantı' },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: verification.identifier },
      }),
    ]);

    return NextResponse.json({ ok: true, message: 'Şifreniz başarıyla güncellendi.' });
  } catch (e) {
    console.error('Reset password error:', e);
    return NextResponse.json({ ok: false, error: 'Şifre güncellenemedi' }, { status: 500 });
  }
}

