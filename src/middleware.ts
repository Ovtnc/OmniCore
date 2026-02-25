import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export default auth((req) => {
  // auth config'daki authorized callback giriş yoksa /login'e yönlendirir
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Dashboard ve korumalı sayfalar (auth kontrolü auth.ts authorized içinde).
     * API auth, static, _next hariç.
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
