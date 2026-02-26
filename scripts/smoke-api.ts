import { PrismaClient, AccountingProvider, CargoProvider } from '@prisma/client';
import { compare, hash } from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

type JsonValue = Record<string, unknown>;

function logStep(msg: string) {
  process.stdout.write(`\n[SMOKE] ${msg}\n`);
}

async function postJson(path: string, body: JsonValue) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as JsonValue;
  return { res, data };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ensureStore() {
  const existing = await prisma.store.findFirst({ select: { id: true, tenantId: true } });
  if (existing) return existing;

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Smoke Tenant',
      slug: `smoke-tenant-${Date.now().toString(36)}`,
      plan: 'STARTER',
    },
    select: { id: true },
  });

  return prisma.store.create({
    data: {
      tenantId: tenant.id,
      name: 'Smoke Store',
      slug: `smoke-store-${Date.now().toString(36)}`,
    },
    select: { id: true, tenantId: true },
  });
}

async function main() {
  const created: {
    userId?: string;
    logisticsSettingId?: string;
    accountingIntegrationId?: string;
  } = {};

  try {
    logStep(`BASE_URL = ${BASE_URL}`);
    const store = await ensureStore();

    // 1) Forgot/reset password flow
    logStep('Forgot/reset password flow');
    const email = `smoke-${Date.now()}@example.com`;
    const oldPassword = 'SmokeTest123';
    const newPassword = 'SmokeReset456';
    const hashed = await hash(oldPassword, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Smoke User',
        password: hashed,
      },
      select: { id: true },
    });
    created.userId = user.id;

    const forgot = await postJson('/api/auth/forgot-password', { email });
    assert(forgot.res.status === 200, `forgot-password expected 200, got ${forgot.res.status}`);
    assert(forgot.data.ok === true, 'forgot-password expected ok=true');
    assert(typeof forgot.data.resetUrl === 'string', 'forgot-password expected resetUrl in development');

    const resetUrl = new URL(String(forgot.data.resetUrl));
    const token = resetUrl.searchParams.get('token');
    assert(token, 'reset token missing in resetUrl');

    const reset = await postJson('/api/auth/reset-password', {
      token,
      password: newPassword,
      confirmPassword: newPassword,
    });
    assert(reset.res.status === 200, `reset-password expected 200, got ${reset.res.status}`);
    assert(reset.data.ok === true, 'reset-password expected ok=true');

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });
    assert(!!updatedUser?.password, 'updated user password not found');
    const isNewPasswordValid = await compare(newPassword, updatedUser.password as string);
    assert(isNewPasswordValid, 'updated password hash check failed');

    const resetAgain = await postJson('/api/auth/reset-password', {
      token,
      password: 'Another789',
      confirmPassword: 'Another789',
    });
    assert(
      resetAgain.res.status === 400,
      `reset-password second attempt expected 400, got ${resetAgain.res.status}`
    );

    // 2) Marketplace unsupported platform test
    logStep('Marketplace test should return 501 for unsupported platforms');
    const marketplace = await postJson(`/api/stores/${store.id}/marketplace-connections/test`, {
      platform: 'AMAZON',
      sellerId: 'demo',
      apiKey: 'demo',
      apiSecret: 'demo',
    });
    assert(
      marketplace.res.status === 501,
      `marketplace test expected 501 for AMAZON, got ${marketplace.res.status}`
    );

    // 3) Accounting test: missing credentials -> 400, fake credentials -> 501
    logStep('Accounting test status checks');
    const accounting = await prisma.accountingIntegration.create({
      data: {
        storeId: store.id,
        provider: AccountingProvider.LOGO,
        name: `Smoke LOGO ${Date.now()}`,
        credentials: {},
      },
      select: { id: true },
    });
    created.accountingIntegrationId = accounting.id;

    const accMissing = await postJson(
      `/api/stores/${store.id}/accounting-integrations/${accounting.id}/test`,
      {}
    );
    assert(
      accMissing.res.status === 400,
      `accounting test expected 400 without credentials, got ${accMissing.res.status}`
    );

    await prisma.accountingIntegration.update({
      where: { id: accounting.id },
      data: { credentials: { apiKey: 'demo', apiSecret: 'demo' } },
    });

    const accUnsupported = await postJson(
      `/api/stores/${store.id}/accounting-integrations/${accounting.id}/test`,
      {}
    );
    assert(
      accUnsupported.res.status === 501,
      `accounting test expected 501 with placeholder credentials, got ${accUnsupported.res.status}`
    );

    // 4) Logistics test: missing credentials -> 400, fake credentials -> 501
    logStep('Logistics test status checks');
    const setting = await prisma.logisticsSetting.create({
      data: {
        storeId: store.id,
        provider: CargoProvider.YURTICI,
      },
      select: { id: true },
    });
    created.logisticsSettingId = setting.id;

    const logMissing = await postJson(
      `/api/stores/${store.id}/logistics-settings/${setting.id}/test`,
      {}
    );
    assert(
      logMissing.res.status === 400,
      `logistics test expected 400 without credentials, got ${logMissing.res.status}`
    );

    await prisma.logisticsSetting.update({
      where: { id: setting.id },
      data: { apiKey: 'demo', apiSecret: 'demo' },
    });

    const logUnsupported = await postJson(
      `/api/stores/${store.id}/logistics-settings/${setting.id}/test`,
      {}
    );
    assert(
      logUnsupported.res.status === 501,
      `logistics test expected 501 with placeholder credentials, got ${logUnsupported.res.status}`
    );

    logStep('All smoke checks passed.');
  } finally {
    if (created.logisticsSettingId) {
      await prisma.logisticsSetting.deleteMany({ where: { id: created.logisticsSettingId } });
    }
    if (created.accountingIntegrationId) {
      await prisma.accountingIntegration.deleteMany({ where: { id: created.accountingIntegrationId } });
    }
    if (created.userId) {
      await prisma.user.deleteMany({ where: { id: created.userId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n[SMOKE] FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
