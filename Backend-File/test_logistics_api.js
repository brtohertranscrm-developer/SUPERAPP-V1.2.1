/**
 * TEST SCRIPT — Logistics Tasks API (Pengantaran/Pengembalian)
 * ===========================================================
 * Cara pakai:
 *   1) Pastikan backend running: `node server.js`
 *   2) Ambil token admin dari localStorage (admin_token)
 *   3) Jalankan:
 *      ADMIN_TOKEN=xxx node test_logistics_api.js
 *
 * Catatan:
 * - Untuk POST/EDIT/CANCEL butuh role superadmin/admin atau permission `logistics_manage`.
 * - Untuk GET/COMPLETE butuh permission `logistics`.
 */

const http = require('http');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'ISI_TOKEN_ADMIN_DISINI';

let passed = 0;
let failed = 0;

const request = (method, path, body = null) => new Promise((resolve, reject) => {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
      catch { resolve({ status: res.statusCode, body: data }); }
    });
  });

  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || 'Assertion gagal');
};

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${err.message}`);
    failed++;
  }
};

const runTests = async () => {
  console.log('\n🧪 Brother Trans — Logistics API Tests');
  console.log('='.repeat(54));

  if (ADMIN_TOKEN === 'ISI_TOKEN_ADMIN_DISINI') {
    console.log('\n⚠️  ADMIN_TOKEN belum diisi!');
    console.log('   Cara: ADMIN_TOKEN=xxx node test_logistics_api.js\n');
    process.exit(1);
  }

  let createdId = null;

  await test('GET /logistics/tasks?task_type=delivery — list', async () => {
    const res = await request('GET', '/api/admin/logistics/tasks?task_type=delivery');
    assert(res.status === 200, `Status: ${res.status}`);
    assert(res.body?.success, 'success harus true');
    assert(Array.isArray(res.body?.data), 'data harus array');
  });

  await test('POST /logistics/tasks — create manual (delivery)', async () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dtLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const res = await request('POST', '/api/admin/logistics/tasks', {
      task_type: 'delivery',
      scheduled_at: dtLocal,
      motor_type: 'TEST UNIT',
      customer_name: 'Test Customer',
      customer_phone: '080000000000',
      location_text: 'Test Location',
      assigned_to_name: 'Test Driver',
      notes: 'Created by test script',
    });

    assert(res.status === 200, `Status: ${res.status} — ${JSON.stringify(res.body)}`);
    assert(res.body?.success, 'success harus true');
    assert(res.body?.data?.id, 'data.id harus ada');
    createdId = res.body.data.id;
  });

  if (createdId) {
    await test('PATCH /logistics/tasks/:id/complete — checklist', async () => {
      const res = await request('PATCH', `/api/admin/logistics/tasks/${createdId}/complete`);
      assert(res.status === 200, `Status: ${res.status} — ${JSON.stringify(res.body)}`);
      assert(res.body?.success, 'success harus true');
      assert(String(res.body?.data?.status).toLowerCase() === 'completed', 'status harus completed');
    });

    await test('GET /logistics/tasks/:id — detail', async () => {
      const res = await request('GET', `/api/admin/logistics/tasks/${createdId}`);
      assert(res.status === 200, `Status: ${res.status}`);
      assert(res.body?.success, 'success harus true');
      assert(res.body?.data?.id === createdId, 'id harus sama');
    });

    await test('DELETE /logistics/tasks/:id — hard delete', async () => {
      const res = await request('DELETE', `/api/admin/logistics/tasks/${createdId}`);
      // Bisa 200, atau 403 jika token tidak punya logistics_manage.
      assert([200, 403].includes(res.status), `Unexpected status: ${res.status} — ${JSON.stringify(res.body)}`);
    });
  } else {
    console.log('  ⚠️  createdId kosong — skip tests complete/detail');
  }

  console.log('\n' + '-'.repeat(54));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('-'.repeat(54) + '\n');

  process.exit(failed > 0 ? 1 : 0);
};

runTests();
