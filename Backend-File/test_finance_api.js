/**
 * TEST SCRIPT — Finance API Brothers Trans
 * ==========================================
 * Test semua endpoint finance secara otomatis via HTTP request
 * Tidak butuh library tambahan — pakai native Node.js http
 *
 * Cara pakai:
 *   1. Pastikan backend sudah running: node server.js
 *   2. Isi ADMIN_TOKEN di bawah (ambil dari localStorage setelah login admin)
 *   3. cd BACKEND && node test_finance_api.js
 */

const http = require('http');

// ==========================================
// KONFIGURASI — sesuaikan sebelum jalankan
// ==========================================
const BASE_URL = 'http://localhost:5001';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'ISI_TOKEN_ADMIN_DISINI';
// ORDER_ID: ambil dari database, contoh: BTM-202401-0001
const TEST_ORDER_ID = process.env.TEST_ORDER_ID || '';

// ==========================================
// HELPER
// ==========================================
let passed = 0, failed = 0;

const request = (method, path, body = null) => new Promise((resolve, reject) => {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
      catch { resolve({ status: res.statusCode, body: data }); }
    });
  });

  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

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

const assert = (condition, msg) => {
  if (!condition) throw new Error(msg || 'Assertion gagal');
};

// ==========================================
// SUITE TESTS
// ==========================================
const runTests = async () => {
  console.log('\n🧪 Brothers Trans — Finance API Tests');
  console.log('='.repeat(50));

  if (ADMIN_TOKEN === 'ISI_TOKEN_ADMIN_DISINI') {
    console.log('\n⚠️  ADMIN_TOKEN belum diisi!');
    console.log('   Cara: ADMIN_TOKEN=xxx node test_finance_api.js\n');
    process.exit(1);
  }

  // ==========================================
  // 1. REKONSILIASI
  // ==========================================
  console.log('\n📋 1. Rekonsiliasi Pembayaran');

  await test('GET /reconciliations — berhasil fetch list', async () => {
    const res = await request('GET', '/api/admin/finance/reconciliations');
    assert(res.status === 200, `Status: ${res.status}`);
    assert(res.body.success, 'success harus true');
    assert(Array.isArray(res.body.data), 'data harus array');
  });

  await test('GET /reconciliations?status=pending — filter status', async () => {
    const res = await request('GET', '/api/admin/finance/reconciliations?status=pending');
    assert(res.status === 200, `Status: ${res.status}`);
    assert(Array.isArray(res.body.data), 'data harus array');
    // Semua item harus pending
    res.body.data.forEach(r => assert(r.status === 'pending', `Ada status bukan pending: ${r.status}`));
  });

  if (TEST_ORDER_ID) {
    await test('POST /reconciliations — upload bukti transfer valid', async () => {
      // Test tanpa file (hanya field teks)
      const options = {
        hostname: 'localhost', port: 5001,
        path: '/api/admin/finance/reconciliations',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      };
      const body = `order_id=${TEST_ORDER_ID}&bank_name=bca&transfer_amount=150000&transfer_date=${new Date().toISOString().split('T')[0]}`;
      const res = await new Promise((resolve) => {
        const req = http.request(options, (r) => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        });
        req.write(body);
        req.end();
      });
      assert(res.status === 201 || res.status === 200, `Unexpected status: ${res.status} — ${JSON.stringify(res.body)}`);
    });

    await test('POST /reconciliations — order_id tidak ada harus 404', async () => {
      const options = {
        hostname: 'localhost', port: 5001,
        path: '/api/admin/finance/reconciliations',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      };
      const body = `order_id=INVALID-ORDER-9999&bank_name=bca&transfer_amount=100000&transfer_date=2024-01-01`;
      const res = await new Promise((resolve) => {
        const req = http.request(options, (r) => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        });
        req.write(body);
        req.end();
      });
      assert(res.status === 404, `Harus 404, dapat: ${res.status}`);
    });
  } else {
    console.log('  ⚠️  TEST_ORDER_ID kosong — skip test POST rekonsiliasi');
  }

  // ==========================================
  // 2. PENGELUARAN
  // ==========================================
  console.log('\n💸 2. Pengeluaran Operasional');

  let expenseId;

  await test('GET /expenses — berhasil fetch list', async () => {
    const res = await request('GET', '/api/admin/finance/expenses');
    assert(res.status === 200, `Status: ${res.status}`);
    assert(Array.isArray(res.body.data), 'data harus array');
  });

  await test('GET /expenses?category=servis — filter kategori', async () => {
    const res = await request('GET', '/api/admin/finance/expenses?category=servis');
    assert(res.status === 200, `Status: ${res.status}`);
    res.body.data.forEach(e => assert(e.category === 'servis', `Kategori bukan servis: ${e.category}`));
  });

  await test('POST /expenses — tambah pengeluaran valid', async () => {
    const options = {
      hostname: 'localhost', port: 5001,
      path: '/api/admin/finance/expenses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    };
    const today = new Date().toISOString().split('T')[0];
    const body = `category=bbm&amount=80000&description=Test+seed+BBM&expense_date=${today}`;
    const res = await new Promise((resolve) => {
      const req = http.request(options, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
      });
      req.write(body);
      req.end();
    });
    assert(res.status === 201, `Harus 201, dapat: ${res.status} — ${JSON.stringify(res.body)}`);
    expenseId = res.body.id;
  });

  await test('POST /expenses — kategori invalid harus 400', async () => {
    const options = {
      hostname: 'localhost', port: 5001,
      path: '/api/admin/finance/expenses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    };
    const body = `category=invalid_category&amount=50000&expense_date=2024-01-01`;
    const res = await new Promise((resolve) => {
      const req = http.request(options, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
      });
      req.write(body);
      req.end();
    });
    assert(res.status === 400, `Harus 400, dapat: ${res.status}`);
  });

  if (expenseId) {
    await test('PUT /expenses/:id — edit pengeluaran', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request('PUT', `/api/admin/finance/expenses/${expenseId}`, {
        category: 'bbm', amount: 90000, description: 'Updated via test', expense_date: today
      });
      assert(res.status === 200, `Status: ${res.status}`);
      assert(res.body.success, 'success harus true');
    });

    await test('DELETE /expenses/:id — hapus pengeluaran', async () => {
      const res = await request('DELETE', `/api/admin/finance/expenses/${expenseId}`);
      assert(res.status === 200, `Status: ${res.status}`);
      assert(res.body.success, 'success harus true');
    });
  }

  // ==========================================
  // 3. LAPORAN KEUANGAN
  // ==========================================
  console.log('\n📊 3. Laporan Keuangan');

  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();

  await test('GET /summary — P&L bulan ini', async () => {
    const res = await request('GET', `/api/admin/finance/summary?month=${m}&year=${y}`);
    assert(res.status === 200, `Status: ${res.status}`);
    assert(res.body.data, 'harus ada field data');
    const d = res.body.data;
    assert(typeof d.gross_revenue === 'number', 'gross_revenue harus number');
    assert(typeof d.total_expense === 'number', 'total_expense harus number');
    assert(d.net_profit === d.gross_revenue - d.total_expense, `net_profit salah: ${d.net_profit} !== ${d.gross_revenue} - ${d.total_expense}`);
    console.log(`     📈 Revenue: Rp ${d.gross_revenue.toLocaleString('id-ID')}`);
    console.log(`     📉 Expense: Rp ${d.total_expense.toLocaleString('id-ID')}`);
    console.log(`     💰 Profit:  Rp ${d.net_profit.toLocaleString('id-ID')}`);
  });

  await test('GET /revenue-chart — data harian', async () => {
    const res = await request('GET', `/api/admin/finance/revenue-chart?month=${m}&year=${y}`);
    assert(res.status === 200, `Status: ${res.status}`);
    assert(Array.isArray(res.body.data), 'data harus array');
    res.body.data.forEach(d => {
      assert(d.date && d.revenue !== undefined, `Data tidak lengkap: ${JSON.stringify(d)}`);
    });
  });

  await test('GET /expense-breakdown — per kategori', async () => {
    const res = await request('GET', `/api/admin/finance/expense-breakdown?month=${m}&year=${y}`);
    assert(res.status === 200, `Status: ${res.status}`);
    assert(Array.isArray(res.body.data), 'data harus array');
    // Total persentase tidak boleh melebihi 100%
    const totalPct = res.body.data.reduce((a, d) => a + (d.percentage || 0), 0);
    assert(totalPct <= 101, `Total persentase terlalu tinggi: ${totalPct}%`); // 101 toleransi rounding
  });

  // ==========================================
  // 4. VENDOR PAYOUTS
  // ==========================================
  console.log('\n🤝 4. Vendor Payouts');

  await test('GET /vendor-payouts — berhasil fetch list', async () => {
    const res = await request('GET', '/api/admin/finance/vendor-payouts');
    assert(res.status === 200, `Status: ${res.status}`);
    assert(Array.isArray(res.body.data), 'data harus array');
  });

  await test('POST /vendor-payouts/generate — tanpa periode harus 400', async () => {
    const res = await request('POST', '/api/admin/finance/vendor-payouts/generate', {});
    assert(res.status === 400, `Harus 400, dapat: ${res.status}`);
  });

  await test('POST /vendor-payouts/generate — generate periode valid', async () => {
    const start = `${y}-${m}-01`;
    const end = new Date().toISOString().split('T')[0];
    const res = await request('POST', '/api/admin/finance/vendor-payouts/generate', {
      period_start: start, period_end: end
    });
    assert(res.status === 201 || res.status === 200, `Status: ${res.status} — ${JSON.stringify(res.body)}`);
    assert(res.body.success, 'success harus true');
    console.log(`     💡 ${res.body.message}`);
  });

  // ==========================================
  // 5. PERMISSION TEST — tanpa token harus 401/403
  // ==========================================
  console.log('\n🔒 5. Permission & Auth');

  await test('GET /reconciliations tanpa token → 401/403', async () => {
    const options = {
      hostname: 'localhost', port: 5001,
      path: '/api/admin/finance/reconciliations',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    const res = await new Promise((resolve) => {
      const req = http.request(options, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => resolve({ status: r.statusCode }));
      });
      req.end();
    });
    assert(res.status === 401 || res.status === 403, `Harus 401/403, dapat: ${res.status}`);
  });

  await test('GET /expenses tanpa token → 401/403', async () => {
    const options = {
      hostname: 'localhost', port: 5001,
      path: '/api/admin/finance/expenses',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    const res = await new Promise((resolve) => {
      const req = http.request(options, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => resolve({ status: r.statusCode }));
      });
      req.end();
    });
    assert(res.status === 401 || res.status === 403, `Harus 401/403, dapat: ${res.status}`);
  });

  // ==========================================
  // HASIL AKHIR
  // ==========================================
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${passed + failed}`);
  console.log(`🎯 Score:  ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('='.repeat(50) + '\n');

  process.exit(failed > 0 ? 1 : 0);
};

runTests().catch(err => {
  console.error('\n💥 Test runner error:', err.message);
  process.exit(1);
});
