import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import type { TenantPlan, TenantRole } from '@prisma/client';

declare module 'next-auth' {
  interface JWT {
    id?: string;
    tenantId?: string | null;
    plan?: TenantPlan | null;
    role?: TenantRole | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    } & {
      tenantId?: string | null;
      plan?: TenantPlan | null;
      role?: TenantRole | null;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'E-posta', type: 'email' },
        password: { label: 'Şifre', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user?.password) return null;
        const { compare } = await import('bcryptjs');
        const valid = await compare(String(credentials.password), user.password);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
      allowDangerousEmailAccountLinking: true, // Aynı e-posta ile credentials hesabı varsa bağla
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        const tenantUser = await prisma.tenantUser.findFirst({
          where: { userId: user.id },
          include: { tenant: true },
          orderBy: { createdAt: 'asc' },
        });
        if (tenantUser) {
          token.tenantId = tenantUser.tenantId;
          token.plan = tenantUser.tenant.plan;
          token.role = tenantUser.role;
        } else {
          token.tenantId = null;
          token.plan = null;
          token.role = null;
        }
      }
      if (trigger === 'update' && session) {
        token.tenantId = (session as { tenantId?: string }).tenantId ?? token.tenantId;
        token.plan = (session as { plan?: TenantPlan }).plan ?? token.plan;
        token.role = (session as { role?: TenantRole }).role ?? token.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string | null;
        session.user.plan = token.plan as TenantPlan | null;
        session.user.role = token.role as TenantRole | null;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
      if (isAuthPage) return true;
      const isProtected =
        pathname.startsWith('/') &&
        !pathname.startsWith('/api/auth') &&
        !pathname.startsWith('/_next') &&
        !pathname.startsWith('/favicon');
      const isDashboard =
        pathname === '/' ||
        pathname.startsWith('/orders') ||
        pathname.startsWith('/products') ||
        pathname.startsWith('/stores') ||
        pathname.startsWith('/categories') ||
        pathname.startsWith('/marketplace') ||
        pathname.startsWith('/accounting') ||
        pathname.startsWith('/payments') ||
        pathname.startsWith('/logistics') ||
        pathname.startsWith('/b2b') ||
        pathname.startsWith('/reports') ||
        pathname.startsWith('/support') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/tools') ||
        pathname.startsWith('/xml-wizard');
      if (isDashboard && !auth?.user) {
        return Response.redirect(new URL('/login', request.url));
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const count = await prisma.tenantUser.count({ where: { userId: user.id } });
      if (count > 0) return;
      await createDefaultTenantAndStore(user.id, user.name ?? user.email);
    },
    async linkAccount({ user }) {
      if (!user.id) return;
      const count = await prisma.tenantUser.count({ where: { userId: user.id } });
      if (count > 0) return;
      await createDefaultTenantAndStore(user.id, user.name ?? user.email ?? 'Kullanıcı');
    },
  },
});

async function createDefaultTenantAndStore(userId: string, name: string) {
  const base = (name.trim() || 'isletme').replace(/\s+/g, '-').toLowerCase();
  const safeSlug = `${base}-${Date.now().toString(36)}`.replace(/[^a-z0-9-]/g, '').slice(0, 48) || 't-' + userId.slice(0, 8);
  const tenant = await prisma.tenant.create({
    data: {
      name: name.trim() || 'İşletmem',
      slug: safeSlug,
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
      userId,
      role: 'OWNER',
    },
  });
}
