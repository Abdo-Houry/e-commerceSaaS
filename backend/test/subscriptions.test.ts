import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createPublicOrderSchema, platformSettingsSchema, subscriptionRequestSchema } from '@matjari/shared';
import * as subscriptions from '../src/services/subscription.service';
import { createApp } from '../src/app';
import { AppDataSource } from '../src/config/data-source';
import { Subscription } from '../src/entities/Subscription';
import { SubscriptionPayment } from '../src/entities/SubscriptionPayment';
import { User } from '../src/entities/User';
import * as admin from '../src/services/admin.service';
import * as platform from '../src/services/platform.service';
import * as pub from '../src/services/public.service';
import { HttpError } from '../src/utils/http-error';
import { signAccessToken } from '../src/utils/tokens';
import { createFixture, setupDatabase, teardownDatabase } from './helpers';

const DAY = 24 * 60 * 60 * 1000;
const PLANS = { monthly: { enabled: true, price: 1000 }, semiannual: { enabled: true, price: 5500 }, annual: { enabled: true, price: 10000 } };
let server: Server;
let base: string;

before(async () => {
  await setupDatabase();
  platform.clearSettingsCache();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
after(async () => {
  server?.close();
  await teardownDatabase();
});

async function setTrialEnd(storeId: string, daysFromNow: number) {
  await AppDataSource.getRepository(Subscription).update({ storeId }, { plan: 'trial', trialEndsAt: new Date(Date.now() + daysFromNow * DAY), currentPeriodEnd: null });
}

function api(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${base}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers } });
}

const orderFor = (f: Awaited<ReturnType<typeof createFixture>>) =>
  createPublicOrderSchema.parse({
    slug: f.store.slug,
    items: [{ productId: f.mug.id, quantity: 1 }],
    customerName: 'زبون',
    customerPhone: '0933111222',
    zoneId: f.zone.id,
    customerAddress: 'عنوان تجريبي',
  });

describe('Subscription enforcement', () => {
  it('keeps working during the 3-day grace period, then locks the dashboard and hides the storefront', async () => {
    const f = await createFixture();
    const token = signAccessToken(f.user.id);

    await setTrialEnd(f.store.id, -1); // ended yesterday → grace
    assert.equal((await api('/products', token)).status, 200);
    await pub.createPublicOrder(orderFor(f));

    await setTrialEnd(f.store.id, -4); // grace over → expired
    const locked = await api('/products', token);
    assert.equal(locked.status, 402);
    assert.equal(((await locked.json()) as { error: { code: string } }).error.code, 'SUBSCRIPTION_EXPIRED');
    assert.equal((await api('/orders', token)).status, 402);
    // Still reachable so the merchant can see how to pay.
    assert.equal((await api('/subscription', token)).status, 200);
    assert.equal((await api('/store/me', token)).status, 200);
    const me = (await (await api('/auth/me', token)).json()) as { data: { access: { state: string } } };
    assert.equal(me.data.access.state, 'expired');

    await assert.rejects(pub.getPublicStore(f.store.slug), (e: unknown) => e instanceof HttpError && e.code === 'STORE_UNAVAILABLE');
    await assert.rejects(pub.createPublicOrder(orderFor(f)), (e: unknown) => e instanceof HttpError && e.status === 404);
  });

  it('new stores get the trial length configured by the admin', async () => {
    const settings = { ...platform.toSettingsDto(await platform.getSettings()), plans: PLANS };
    await platform.updateSettings(platformSettingsSchema.parse({ ...settings, trialDays: 30 }));
    const f = await createFixture();
    const sub = await AppDataSource.getRepository(Subscription).findOneByOrFail({ storeId: f.store.id });
    const days = Math.round((sub.trialEndsAt!.getTime() - Date.now()) / DAY);
    assert.equal(days, 30);
    await platform.updateSettings(platformSettingsSchema.parse({ ...settings, trialDays: 14 }));
  });
});

describe('Admin actions', () => {
  it('activation records the payment, reopens an expired store, and paying early keeps remaining days', async () => {
    const f = await createFixture();
    const adminUser = await createFixture();
    await AppDataSource.getRepository(User).update(adminUser.user.id, { role: 'admin' });

    await setTrialEnd(f.store.id, -10);
    assert.equal((await admin.getStoreDetail(f.store.id)).access.state, 'expired');

    const activated = await admin.activateSubscription(f.store.id, adminUser.user.id, { planId: 'monthly', months: 1, amount: 1000, method: 'sham_cash', note: 'إشعار 123' });
    assert.equal(activated.access.state, 'active');
    assert.equal(activated.plan, 'basic');
    assert.equal(activated.payments.length, 1);
    assert.equal(activated.payments[0]!.adminName, 'تاجر');
    await pub.getPublicStore(f.store.slug); // visible again

    const firstEnd = new Date(activated.access.endsAt!);
    const renewed = await admin.activateSubscription(f.store.id, adminUser.user.id, { planId: null, months: 2, amount: 2000, method: 'cash', note: null });
    const expected = new Date(firstEnd);
    expected.setMonth(expected.getMonth() + 2);
    assert.equal(renewed.access.endsAt, expected.toISOString());
    assert.equal(await AppDataSource.getRepository(SubscriptionPayment).countBy({ storeId: f.store.id }), 2);
  });

  it('suspension blocks the store even with a paid subscription, and lifting it restores access', async () => {
    const f = await createFixture();
    const token = signAccessToken(f.user.id);
    await admin.activateSubscription(f.store.id, f.user.id, { planId: 'annual', months: 12, amount: 0, method: 'other', note: null });

    const suspended = await admin.suspendStore(f.store.id, 'مخالفة سياسة المنصة');
    assert.equal(suspended.access.state, 'suspended');
    const res = await api('/products', token);
    assert.equal(res.status, 402);
    assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'STORE_SUSPENDED');
    await assert.rejects(pub.getPublicStore(f.store.slug));

    assert.equal((await admin.unsuspendStore(f.store.id)).access.state, 'active');
    assert.equal((await api('/products', token)).status, 200);
  });

  it('SQL state filter agrees with computeAccess for every state', async () => {
    const graceDays = (await platform.getSettings()).graceDays;
    const cases = [
      { days: 5, expect: 'trial' },
      { days: -1, expect: 'grace' },
      { days: -(graceDays + 1), expect: 'expired' },
    ] as const;
    for (const c of cases) {
      const f = await createFixture();
      await setTrialEnd(f.store.id, c.days);
      const list = await admin.listStores({ page: 1, limit: 100, state: c.expect, search: f.store.slug });
      assert.deepEqual(list.items.map((s) => [s.id, s.access.state]), [[f.store.id, c.expect]], `state ${c.expect}`);
    }
    const overview = await admin.overview();
    assert.ok(overview.stores.expired >= 1 && overview.stores.grace >= 1 && overview.stores.trial >= 1);
  });

  it('the admin API is invisible to merchants (404) and works for admins', async () => {
    const merchant = await createFixture();
    const asMerchant = await api('/admin/overview', signAccessToken(merchant.user.id));
    assert.equal(asMerchant.status, 404);

    await AppDataSource.getRepository(User).update(merchant.user.id, { role: 'admin' });
    const asAdmin = await api('/admin/overview', signAccessToken(merchant.user.id));
    assert.equal(asAdmin.status, 200);
  });
});

describe('Subscription requests (merchant pays, admin approves)', () => {
  async function configure() {
    const current = platform.toSettingsDto(await platform.getSettings());
    await platform.updateSettings(
      platformSettingsSchema.parse({
        ...current,
        currency: 'USD',
        plans: PLANS,
        paymentMethods: { ...current.paymentMethods, sham_cash: { enabled: true, details: 'كود الحساب' }, usdt: { enabled: false, details: '' } },
      }),
    );
  }

  it('an expired merchant can submit a request; the amount comes from the plan, and approval activates it', async () => {
    await configure();
    const f = await createFixture();
    const adminUser = await createFixture();
    await setTrialEnd(f.store.id, -10);
    const token = signAccessToken(f.user.id);

    // The HTTP route works even while the store is locked.
    const created = await api('/subscription/requests', token, {
      method: 'POST',
      body: JSON.stringify({ planId: 'semiannual', method: 'sham_cash', reference: 'TX-991', amount: 1, months: 99 }),
    });
    assert.equal(created.status, 201);
    const request = ((await created.json()) as { data: { id: string; amount: number; months: number; status: string } }).data;
    assert.deepEqual([request.amount, request.months, request.status], [5500, 6, 'pending']);

    await assert.rejects(
      subscriptions.createRequest(f.store.id, subscriptionRequestSchema.parse({ planId: 'monthly', method: 'sham_cash' })),
      (e: unknown) => e instanceof HttpError && e.code === 'REQUEST_PENDING',
    );
    await assert.rejects(
      subscriptions.createRequest(f.store.id, subscriptionRequestSchema.parse({ planId: 'monthly', method: 'usdt' })),
      (e: unknown) => e instanceof HttpError && e.code === 'METHOD_UNAVAILABLE',
    );

    const pendingList = await admin.listRequests({ page: 1, limit: 50, status: 'pending' });
    assert.ok(pendingList.items.some((r) => r.id === request.id && r.store?.slug === f.store.slug));

    const approved = await admin.approveRequest(request.id, adminUser.user.id);
    assert.equal(approved.status, 'approved');
    const detail = await admin.getStoreDetail(f.store.id);
    assert.equal(detail.access.state, 'active');
    assert.equal(detail.payments[0]!.planId, 'semiannual');
    assert.equal(detail.payments[0]!.amount, 5500);
    assert.equal((await api('/products', token)).status, 200);

    await assert.rejects(admin.approveRequest(request.id, adminUser.user.id), (e: unknown) => e instanceof HttpError && e.code === 'REQUEST_REVIEWED');
  });

  it('rejection keeps the store locked, records the reason, and allows a new request', async () => {
    await configure();
    const f = await createFixture();
    await setTrialEnd(f.store.id, -10);
    const first = await subscriptions.createRequest(f.store.id, subscriptionRequestSchema.parse({ planId: 'monthly', method: 'sham_cash' }));
    const rejected = await admin.rejectRequest(first.id, f.user.id, 'لم يصل المبلغ');
    assert.equal(rejected.status, 'rejected');
    assert.equal(rejected.rejectionReason, 'لم يصل المبلغ');
    assert.equal((await admin.getStoreDetail(f.store.id)).access.state, 'expired');

    const mine = await subscriptions.getMySubscription(f.store.id);
    assert.equal(mine.requests[0]!.status, 'rejected');
    assert.deepEqual(mine.plans.map((p) => [p.id, p.savingsPercent]), [['monthly', 0], ['semiannual', 8], ['annual', 17]]);

    const second = await subscriptions.createRequest(f.store.id, subscriptionRequestSchema.parse({ planId: 'annual', method: 'sham_cash' }));
    assert.equal(second.status, 'pending');
  });
});
