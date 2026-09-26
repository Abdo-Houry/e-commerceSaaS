import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canOperate, computeAccess, nextPeriodEnd } from '../src';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-16T12:00:00Z');
const at = (days: number) => new Date(now.getTime() + days * DAY);

describe('computeAccess', () => {
  it('trial → grace → expired, with 3 grace days', () => {
    const trial = (endInDays: number) => computeAccess({ plan: 'trial', trialEndsAt: at(endInDays), currentPeriodEnd: null }, 3, now);
    assert.equal(trial(5).state, 'trial');
    assert.equal(trial(5).daysLeft, 8, 'days left counts the grace period');
    assert.equal(trial(-1).state, 'grace');
    assert.equal(trial(-1).daysLeft, 2);
    assert.equal(trial(-3).state, 'grace');
    assert.equal(trial(-3.01).state, 'expired');
    assert.equal(trial(-3.01).daysLeft, 0);
  });

  it('paid periods use currentPeriodEnd, not the old trial date', () => {
    const a = computeAccess({ plan: 'basic', trialEndsAt: at(-100), currentPeriodEnd: at(10) }, 3, now);
    assert.equal(a.state, 'active');
    const b = computeAccess({ plan: 'basic', trialEndsAt: at(10), currentPeriodEnd: at(-10) }, 3, now);
    assert.equal(b.state, 'expired');
  });

  it('suspension overrides everything', () => {
    const a = computeAccess(
      { plan: 'basic', trialEndsAt: null, currentPeriodEnd: at(300), suspendedAt: now, suspensionReason: 'مخالفة' },
      3,
      now,
    );
    assert.equal(a.state, 'suspended');
    assert.equal(a.suspensionReason, 'مخالفة');
    assert.equal(canOperate(a.state), false);
  });

  it('only trial, active and grace may operate', () => {
    assert.deepEqual(
      (['trial', 'active', 'grace', 'expired', 'suspended'] as const).map(canOperate),
      [true, true, true, false, false],
    );
  });
});

describe('nextPeriodEnd', () => {
  it('extends from the current end when paying early, so no days are lost', () => {
    const end = nextPeriodEnd(at(10), 1, now);
    const expected = at(10);
    expected.setMonth(expected.getMonth() + 1);
    assert.equal(end.toISOString(), expected.toISOString());
  });

  it('starts from now when the period already ended', () => {
    const end = nextPeriodEnd(at(-20), 3, now);
    const expected = new Date(now);
    expected.setMonth(expected.getMonth() + 3);
    assert.equal(end.toISOString(), expected.toISOString());
  });
});
