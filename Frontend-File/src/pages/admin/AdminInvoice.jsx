import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, CheckCircle2, Download, Loader2, AlertCircle } from 'lucide-react';
import { useBooking } from '../../hooks/useBooking'; // Pastikan path hook benar

export default function AdminInvoice() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { fetchBookingByOrderId } = useBooking(); // Asumsi fungsi ini tersedia di hook Anda
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    const getInvoiceData = async () => {
      try {
        setLoading(true);
        // Mengambil data riil dari backend berdasarkan Order ID di URL
        const data = await fetchBookingByOrderId(id);
        if (!data) throw new Error("Data transaksi tidak ditemukan");
        setInvoice(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getInvoiceData();
  }, [id, fetchBookingByOrderId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-rose-500">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Memuat Invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-slate-500">
        <AlertCircle size={48} className="mb-4 text-rose-500" />
        <p className="font-bold uppercase tracking-widest text-xs">{error || "Terjadi kesalahan"}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-rose-500 font-bold text-sm underline">Kembali</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-fade-in-up">
      {/* ACTIONS BAR */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-rose-500 rounded-xl transition-all shadow-md active:scale-95">
            <Printer size={16} /> Cetak Invoice
          </button>
        </div>
      </div>

      {/* KERTAS INVOICE */}
      <div className="bg-white rounded-[2rem] p-8 sm:p-12 shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-0">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-8 mb-8 gap-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center font-black text-2xl shadow-sm">B</div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Brother<span className="text-rose-500">Trans</span></h1>
                <p className="text-xs text-slate-500 font-medium italic">Mobility & Smart Solutions</p>
              </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <h2 className="text-3xl font-black text-slate-100 tracking-widest uppercase">Invoice</h2>
            <p className="text-sm font-bold text-slate-900 mt-2">#{invoice.order_id}</p>
            <p className="text-xs text-slate-500 font-medium">Tgl: {new Date(invoice.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* INFO PELANGGAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pelanggan</p>
            <h3 className="text-lg font-black text-slate-900">{invoice.user_name || 'Pelanggan'}</h3>
            <p className="text-sm text-slate-600 font-medium mt-1">{invoice.user_email}</p>
          </div>
          <div className="md:text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status Pembayaran</p>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold border ${
              invoice.payment_status === 'paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {invoice.payment_status === 'paid' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {invoice.payment_status === 'paid' ? 'LUNAS' : 'PENDING'}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-3 italic">ID Transaksi: {invoice.id}</p>
          </div>
        </div>

        {/* TABEL ITEM */}
        <div className="mb-10 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="p-4">Item / Layanan</th>
                <th className="p-4 text-center">Tipe</th>
                <th className="p-4 text-right">Total Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                <tr className="text-slate-700 font-medium">
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{invoice.item_name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Sewa Unit Kendaraan/Loker</p>
                  </td>
                  <td className="p-4 text-center capitalize">{invoice.item_type}</td>
                  <td className="p-4 text-right font-bold text-slate-900">Rp {invoice.total_price?.toLocaleString('id-ID')}</td>
                </tr>
            </tbody>
          </table>
        </div>

        {/* RINGKASAN TOTAL */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <div className="w-full md:w-1/2 flex justify-between items-center p-6 bg-slate-50 rounded-[1.5rem]">
            <span className="font-black text-slate-900 uppercase tracking-widest text-xs">Total Akhir</span>
            <span className="font-black text-2xl text-rose-500">Rp {invoice.total_price?.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="mt-16 text-center">
            <div className="inline-block p-4 border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Dokumen Digital Brother Trans</p>
            </div>
        </div>
      </div>
    </div>
  );
}