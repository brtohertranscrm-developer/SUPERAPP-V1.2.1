'use strict';

const assert = require('assert');
const { calculateMotorRentalBreakdown } = require('./motorRentalPricing');

const run = () => {
  const price24h = 100000;
  const price12h = 60000;

  // 1) Calendar mode: 21 23:00 -> 22 23:00 = 12h + 24h (per tanggal)
  {
    const r = calculateMotorRentalBreakdown({
      startDate: '2026-04-21',
      startTime: '23:00',
      endDate: '2026-04-22',
      endTime: '23:00',
      price24h,
      price12h,
      billingMode: 'calendar',
      threshold12h: 12,
    });

    assert.equal(r.isValid, true);
    assert.equal(r.count12h, 1);
    assert.equal(r.count24h, 1);
    assert.equal(r.billableHours, 36);
    assert.equal(r.billableDayUnits, 1.5);
    assert.equal(r.baseTotal, price12h + price24h);
    assert.equal(r.packageSummary, '1 hari + 1 x 12 jam');
  }

  // 2) Calendar mode: < 12 jam tetap kena paket 12 jam
  {
    const r = calculateMotorRentalBreakdown({
      startDate: '2026-04-21',
      startTime: '10:00',
      endDate: '2026-04-21',
      endTime: '18:00',
      price24h,
      price12h,
      billingMode: 'calendar',
      threshold12h: 12,
    });
    assert.equal(r.isValid, true);
    assert.equal(r.count12h, 1);
    assert.equal(r.count24h, 0);
    assert.equal(r.baseTotal, price12h);
  }

  // 3) Stopwatch mode: 24 jam pas = 1x 24 jam
  {
    const r = calculateMotorRentalBreakdown({
      startDate: '2026-04-21',
      startTime: '23:00',
      endDate: '2026-04-22',
      endTime: '23:00',
      price24h,
      price12h,
      billingMode: 'stopwatch',
      threshold12h: 12,
    });
    assert.equal(r.isValid, true);
    assert.equal(r.count12h, 0);
    assert.equal(r.count24h, 1);
    assert.equal(r.baseTotal, price24h);
  }

  // 4) Stopwatch mode: 25 jam -> 1x24 + 1x12 (threshold 12)
  {
    const r = calculateMotorRentalBreakdown({
      startDate: '2026-04-21',
      startTime: '10:00',
      endDate: '2026-04-22',
      endTime: '11:00',
      price24h,
      price12h,
      billingMode: 'stopwatch',
      threshold12h: 12,
    });
    assert.equal(r.isValid, true);
    assert.equal(r.count24h, 1);
    assert.equal(r.count12h, 1);
    assert.equal(r.baseTotal, price24h + price12h);
  }

  // 5) Invalid: end <= start
  {
    const r = calculateMotorRentalBreakdown({
      startDate: '2026-04-21',
      startTime: '10:00',
      endDate: '2026-04-21',
      endTime: '10:00',
      price24h,
      price12h,
      billingMode: 'calendar',
      threshold12h: 12,
    });
    assert.equal(r.isValid, false);
  }
};

try {
  run();
  // eslint-disable-next-line no-console
  console.log('✅ motorRentalPricing tests passed');
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('❌ motorRentalPricing tests failed');
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
}

