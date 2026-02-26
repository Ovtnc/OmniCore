import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateRawResetToken,
  hashResetToken,
  makeResetIdentifier,
  resetTokenExpiresAt,
} from '@/lib/password-reset';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String((body as { email?: string }).email ?? '')
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, error: 'E-posta gerekli' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // Kullanıcı var/yok bilgisini dışarı sızdırmamak için her durumda başarılı yanıt ver.
    if (!user) {
      return NextResponse.json({
        ok: true,
        message: 'Eğer e-posta sistemde kayıtlıysa şifre sıfırlama bağlantısı oluşturuldu.',
      });
    }

    const identifier = makeResetIdentifier(email);
    const rawToken = generateRawResetToken();
    const token = hashResetToken(rawToken);
    const expires = resetTokenExpiresAt();

    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({
      data: { identifier, token, expires },
    });

    const origin = req.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;

    // Mail servisi yoksa local test için linki döndür.
    const isProd = process.env.NODE_ENV === 'production';
    return NextResponse.json({
      ok: true,
      message: 'Eğer e-posta sistemde kayıtlıysa şifre sıfırlama bağlantısı oluşturuldu.',
      ...(isProd ? {} : { resetUrl }),
    });
  } catch (e) {
    console.error('Forgot password error:', e);
    return NextResponse.json({ ok: false, error: 'İstek işlenemedi' }, { status: 500 });
  }
}

