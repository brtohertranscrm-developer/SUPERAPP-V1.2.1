import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, BarChart2, Loader2 } from 'lucide-react';

const fmtRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

const MONTHS = [
  { v: '01', l: 'Januari' }, { v: '02', l: 'Februari' }, { v: '03', l: 'Maret' },
  { v: '04', l: 'April' },   { v: '05', l: 'Mei' },       { v: '06', l: 'Juni' },
  { v: '07', l: 'Juli' },    { v: '08', l: 'Agustus' },   { v: '09', l: 'September' },
  { v: '10', l: 'Oktober' }, { v: '11', l: 'November' },  { v: '12', l: 'Desember' }
];

const YEARS = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i));

const CAT_COLORS = {
  servis:    '#3b82f6',
  bbm:       '#f97316',
  sewa:      '#a855f7',
  gaji:      '#10b981',
  marketing: '#ec4899',
  lainnya:   '#94a3b8'
};

const FinanceSummary = ({ summary, chartData, breakdown, isLoading, month, setMonth, year, setYear }) => {

  // ==========================================
  // FUNGSI EXPORT EXCEL (CSV)
  // ==========================================
  const handleExportExcel = () => {
    if (!summary && (!breakdown || breakdown.length === 0)) {
      alert('Tidak ada data untuk diexport pada periode ini.');
      return;
    }

    const monthLabel = MONTHS.find(m => m.v === month)?.l || month;
    
    // 1. Buat Header CSV Laporan Utama
    let csvContent = "LAPORAN KEUANGAN & KAS\n";
    csvContent += `Periode,${monthLabel} ${year}\n\n`;
    
    csvContent += "Keterangan,Jumlah,Total (Rp)\n";
    csvContent += `Total Pemasukan (Omset),${summary?.booking_count || 0} booking,${summary?.gross_revenue || 0}\n`;
    csvContent += `Total Pengeluaran,${summary?.expense_count || 0} item,${summary?.total_expense || 0}\n`;
    csvContent += `Sisa Kas (Pemasukan - Pengeluaran),-,${summary?.net_profit || 0}\n\n`;

    // 2. Buat Data Breakdown Pengeluaran
    csvContent += "RINCIAN PENGELUARAN\n";
    csvContent += "Kategori,Jumlah Transaksi,Total (Rp),Persentase\n";
    
    if (breakdown && breakdown.length > 0) {
      breakdown.forEach(row => {
        csvContent += `${row.category},${row.count},${row.total},${row.percentage}%\n`;
      });
    } else {
      csvContent += "Tidak ada data pengeluaran,,,\n";
    }

    // 3. Convert ke file Blob & Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Keuangan_${monthLabel}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
        <Loader2 size={32} className="animate-spin" />
        <span className="font-bold text-sm">Memuat laporan keuangan...</span>
      </div>
    );
  }

  const maxRevenue = chartData.length ? Math.max(...chartData.map((d) => d.revenue), 1) : 1;
  const profitPositive = (summary?.net_profit || 0) >= 0;

  return (
    <div className="space-y-6">

      {/* Filter Periode */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Periode:</span>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
        >
          {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-400 font-medium">
          Data per {MONTHS.find((m) => m.v === month)?.l} {year}
        </span>
      </div>

      {/* Kartu Metrik (Dengan Istilah Awam) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={20} className="text-blue-500" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pemasukan (Omset)</p>
          <p className="text-xl font-black text-slate-800">{fmtRp(summary?.gross_revenue)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{summary?.booking_count || 0} booking selesai</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingDown size={20} className="text-red-500" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pengeluaran</p>
          <p className="text-xl font-black text-slate-800">{fmtRp(summary?.total_expense)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{summary?.expense_count || 0} item tercatat</p>
        </div>

        <div className={`rounded-2xl shadow-sm border p-4 ${profitPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${profitPositive ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <TrendingUp size={20} className={profitPositive ? 'text-emerald-600' : 'text-red-600'} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sisa Kas (Bersih)</p>
          <p className={`text-xl font-black ${profitPositive ? 'text-emerald-700' : 'text-red-700'}`}>
            {fmtRp(summary?.net_profit)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Pemasukan – Pengeluaran</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <AlertCircle size={20} className="text-amber-500" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cek Kembali</p>
          <p className="text-xl font-black text-amber-600">{summary?.pending_reconciliation || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Bukti transfer pending</p>
        </div>
      </div>

      {/* Chart Tren Revenue Harian */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 size={18} className="text-blue-500" />
          <h3 className="font-black text-slate-800 text-sm">Tren Pendapatan Harian</h3>
        </div>

        {chartData.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm font-bold">
            Belum ada data booking selesai di periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1.5 min-h-[160px] min-w-max pt-4">
              {chartData.map((d) => {
                const heightPct = Math.max((d.revenue / maxRevenue) * 100, 4);
                const day = d.date?.split('-')[2];
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1 group" title={`${d.date}\nRp ${d.revenue.toLocaleString('id-ID')}\n${d.bookings_count} booking`}>
                    <div
                      className="w-6 bg-blue-400 group-hover:bg-blue-600 rounded-t-md transition-all cursor-pointer"
                      style={{ height: `${heightPct}%`, minHeight: '6px', maxHeight: '140px' }}
                    />
                    <span className="text-[9px] text-slate-400 font-bold">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Breakdown Pengeluaran per Kategori */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-black text-slate-800 text-sm mb-5">Breakdown Pengeluaran per Kategori</h3>

        {breakdown.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm font-bold">
            Belum ada pengeluaran di periode ini.
          </div>
        ) : (
          <div className="space-y-3">
            {breakdown.map((b) => (
              <div key={b.category}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700 capitalize">{b.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{b.count}x</span>
                    <span className="text-xs font-black text-slate-800">{fmtRp(b.total)}</span>
                    <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{b.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${b.percentage}%`,
                      backgroundColor: CAT_COLORS[b.category] || CAT_COLORS.lainnya
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tombol Print / Export */}
      <div className="flex flex-wrap justify-end gap-3 mt-8">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-2"
        >
          🖨️ Print PDF
        </button>
        <button
          onClick={handleExportExcel}
          className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2"
        >
          📊 Download Excel
        </button>
      </div>
    </div>
  );
};

export default FinanceSummary;