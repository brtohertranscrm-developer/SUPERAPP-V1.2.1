import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Calendar, CheckCircle2, ExternalLink, Loader2, MapPin, Minus, Plus, Ticket, XCircle } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';

const rupiah = (v) => {
  const n = Number(v) || 0;
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `Rp ${n.toLocaleString('id-ID')}`;
  }
};

const orderId = () => `TRX-TKT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

export default function TicketDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const loc = useLocation();
  const { user } = useContext(AuthContext) || {};

  const [isLoading, setIsLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);
  const [variantId, setVariantId] = useState(null);
  const [visitDate, setVisitDate] = useState('');
  const [qty, setQty] = useState(1);
  const [successOrder, setSuccessOrder] = useState('');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/tickets/products/${encodeURIComponent(slug)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Tiket tidak ditemukan.');
        if (!mounted) return;
        setItem(data.data);
        const first = data?.data?.variants?.[0];
        setVariantId(first?.id || null);
      } catch (e) {
        if (!mounted) return;
        setItem(null);
        setError(e?.message || 'Gagal memuat tiket.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    // eslint-disable-next-line no-void
    void run();
    return () => { mounted = false; };
  }, [slug]);

  const variant = useMemo(() => {
    const list = Array.isArray(item?.variants) ? item.variants : [];
    return list.find((v) => v.id === variantId) || list[0] || null;
  }, [item, variantId]);

  const total = useMemo(() => (Number(variant?.price) || 0) * (Number(qty) || 1), [variant, qty]);

  const canBuy = !!variant?.id && !!visitDate && qty >= 1 && qty <= 50;

  const doBuy = async () => {
    if (!canBuy) return;
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    if (!token || !user) {
      navigate('/login', { state: { from: loc.pathname }, replace: true });
      return;
    }

    setIsBuying(true);
    setError('');
    setSuccessOrder('');
    const id = orderId();
    try {
      const payload = {
        order_id: id,
        item_type: 'ticket',
        item_name: item?.title || 'Tiket',
        location: item?.city || 'jogja',
        start_date: visitDate,
        ticket_product_id: item?.id,
        ticket_variant_id: variant?.id,
        ticket_qty: qty,
        payment_method: 'transfer',
      };

      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Gagal membuat order tiket.');

      setSuccessOrder(id);
      navigate(`/payment/${id}`, {
        state: {
          orderData: {
            ...(data?.data || {}),
            order_id: id,
            item_type: 'ticket',
            item_name: item?.title || 'Tiket',
            total_price: data?.data?.total_price ?? total,
            payment_method: 'transfer',
          },
        },
        replace: true,
      });
    } catch (e) {
      setError(e?.message || 'Gagal membuat order.');
    } finally {
      setIsBuying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-10 text-center">
          <Loader2 size={42} className="text-rose-500 animate-spin mx-auto mb-3" />
          <div className="font-black text-slate-700">Memuat tiket...</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-10 text-center max-w-lg w-full">
          <XCircle size={48} className="text-slate-300 mx-auto mb-3" />
          <div className="text-xl font-black text-slate-900 mb-2">Tiket tidak ditemukan</div>
          <div className="text-sm font-bold text-slate-500">{error || 'Coba kembali ke daftar tiket.'}</div>
          <button
            type="button"
            onClick={() => navigate('/tiket')}
            className="mt-6 px-6 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800"
          >
            Kembali ke /tiket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {error ? (
          <div className="mb-5 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100">
            <XCircle size={18} className="shrink-0 mt-0.5" /> {error}
          </div>
        ) : null}

        {successOrder ? (
          <div className="mb-5 bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-emerald-100">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> Order dibuat: {successOrder}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="h-64 bg-slate-100">
              {item.cover_image_url ? (
                <img src={item.cover_image_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Ticket size={64} />
                </div>
              )}
            </div>
            <div className="p-6 sm:p-8">
              <div className="text-2xl sm:text-3xl font-black tracking-tight">{item.title}</div>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm font-bold text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={16} className="text-rose-500" /> {item.city || '-'}
                </span>
                {item.venue_name ? <span className="text-slate-400">•</span> : null}
                {item.venue_name ? <span className="truncate">{item.venue_name}</span> : null}
              </div>
              {item.address ? (
                <div className="mt-2 text-sm font-medium text-slate-500">{item.address}</div>
              ) : null}
              {item.maps_url ? (
                <a
                  href={item.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-black text-rose-600 hover:text-rose-700"
                >
                  Buka Google Maps <ExternalLink size={16} />
                </a>
              ) : null}

              {item.description_html ? (
                <div
                  className="mt-6 prose prose-slate max-w-none"
                  // konten admin (trusted). sanitasi untuk public pages bisa ditambah belakangan.
                  dangerouslySetInnerHTML={{ __html: item.description_html }}
                />
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-7">
              <div className="text-sm font-black text-slate-900 mb-4">Pilih Jadwal & Varian</div>

              <label className="block mb-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                  <Calendar size={14} /> Tanggal Kunjungan (Wajib)
                </div>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
                  required
                />
              </label>

              <label className="block mb-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Varian</div>
                <select
                  value={String(variant?.id || '')}
                  onChange={(e) => setVariantId(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-black text-slate-800"
                >
                  {(item.variants || []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {rupiah(v.price)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</div>
                  <div className="text-sm font-bold text-slate-600">Jumlah voucher (1 voucher = 1 tiket)</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center font-black hover:bg-slate-100"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="w-14 text-center font-black text-slate-900">{qty}</div>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(50, q + 1))}
                    className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center font-black hover:bg-slate-100"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-700">Total</div>
                  <div className="text-xl font-black text-rose-600">{rupiah(total)}</div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 font-semibold">
                  Setelah pembayaran diverifikasi, voucher akan muncul di dashboard kamu dan bisa diredeem oleh vendor pada tanggal kunjungan.
                </div>
              </div>

              <button
                type="button"
                disabled={isBuying || !canBuy}
                onClick={doBuy}
                className="mt-5 w-full px-6 py-4 rounded-2xl bg-rose-500 text-white font-black hover:bg-rose-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isBuying ? <Loader2 className="animate-spin" size={18} /> : <Ticket size={18} />}
                Beli Voucher
              </button>

              <button
                type="button"
                onClick={() => navigate('/tiket')}
                className="mt-3 w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 font-black text-slate-800 hover:bg-slate-50"
              >
                Kembali ke Daftar
              </button>
            </div>

            {item.terms_html ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-7">
                <div className="text-sm font-black text-slate-900 mb-3">Syarat & Ketentuan</div>
                <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: item.terms_html }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

