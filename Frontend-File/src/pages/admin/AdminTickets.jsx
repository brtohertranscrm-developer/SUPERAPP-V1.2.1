import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Plus, RefreshCcw, Save, XCircle, UserPlus } from 'lucide-react';
import { API_URL } from '../../components/admin/settings/settingsConstants';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);

export default function AdminTickets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [variants, setVariants] = useState([]);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [vendorModalKey, setVendorModalKey] = useState(1);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) || null,
    [products, selectedId]
  );

  const emptyProduct = {
    id: null,
    slug: '',
    title: '',
    category: 'attraction',
    city: 'jogja',
    venue_name: '',
    address: '',
    maps_url: '',
    vendor_id: '',
    cover_image_url: '',
    description_html: '',
    terms_html: '',
    is_active: 1,
  };

  const [form, setForm] = useState(emptyProduct);
  const [variantForm, setVariantForm] = useState({
    id: null,
    product_id: null,
    name: '',
    price: '',
    quota_per_day: '0',
    is_active: 1,
  });

  const loadVendors = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/tickets/vendors`, { headers: { ...authHeaders() } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) throw new Error(data?.error || 'Gagal memuat vendor.');
    setVendors(Array.isArray(data.data) ? data.data : []);
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/tickets/products`, { headers: { ...authHeaders() } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) throw new Error(data?.error || 'Gagal memuat produk tiket.');
    setProducts(Array.isArray(data.data) ? data.data : []);
  }, []);

  const loadVariants = useCallback(async (productId) => {
    if (!productId) { setVariants([]); return; }
    const res = await fetch(`${API_URL}/api/admin/tickets/products/${productId}/variants`, { headers: { ...authHeaders() } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) throw new Error(data?.error || 'Gagal memuat varian.');
    setVariants(Array.isArray(data.data) ? data.data : []);
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadVendors(), loadProducts()]);
    } catch (e) {
      setError(e?.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, [loadProducts, loadVendors]);

  useEffect(() => {
    // eslint-disable-next-line no-void
    void reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    if (!selected) {
      setForm(emptyProduct);
      setVariants([]);
      return;
    }
    setForm({
      id: selected.id,
      slug: selected.slug || '',
      title: selected.title || '',
      category: selected.category || 'attraction',
      city: selected.city || 'jogja',
      venue_name: selected.venue_name || '',
      address: selected.address || '',
      maps_url: selected.maps_url || '',
      vendor_id: selected.vendor_id || '',
      cover_image_url: selected.cover_image_url || '',
      description_html: selected.description_html || '',
      terms_html: selected.terms_html || '',
      is_active: Number(selected.is_active) === 0 ? 0 : 1,
    });
    // eslint-disable-next-line no-void
    void loadVariants(selected.id).catch((e) => setError(e?.message || 'Gagal memuat varian.'));
  }, [selected, loadVariants]);

  const handleNew = () => {
    setSelectedId(null);
    setForm(emptyProduct);
    setVariantForm({ id: null, product_id: null, name: '', price: '', quota_per_day: '0', is_active: 1 });
    setVariants([]);
  };

  const openVendorModal = () => {
    setError('');
    setVendorForm({ name: '', email: '', phone: '', password: '' });
    setVendorModalKey((k) => k + 1); // helps avoid browser autofill caching
    setIsVendorModalOpen(true);
  };

  const saveProduct = async () => {
    setLoading(true);
    setError('');
    try {
      const body = {
        ...form,
        slug: slugify(form.slug || form.title),
        vendor_id: form.vendor_id || null,
      };
      const method = form.id ? 'PUT' : 'POST';
      const url = form.id
        ? `${API_URL}/api/admin/tickets/products/${form.id}`
        : `${API_URL}/api/admin/tickets/products`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Gagal menyimpan produk.');
      await loadProducts();
      if (!form.id && data.id) setSelectedId(data.id);
    } catch (e) {
      setError(e?.message || 'Gagal menyimpan.');
    } finally {
      setLoading(false);
    }
  };

  const createVendor = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/tickets/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(vendorForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Gagal membuat vendor.');
      setIsVendorModalOpen(false);
      setVendorForm({ name: '', email: '', phone: '', password: '' });
      await loadVendors();
    } catch (e) {
      setError(e?.message || 'Gagal membuat vendor.');
    } finally {
      setLoading(false);
    }
  };

  const saveVariant = async () => {
    setLoading(true);
    setError('');
    try {
      const productId = form.id || variantForm.product_id;
      if (!productId) throw new Error('Simpan produk dulu sebelum menambah varian.');
      const body = {
        product_id: productId,
        name: variantForm.name,
        price: variantForm.price,
        quota_per_day: variantForm.quota_per_day,
        is_active: variantForm.is_active,
      };
      const method = variantForm.id ? 'PUT' : 'POST';
      const url = variantForm.id
        ? `${API_URL}/api/admin/tickets/variants/${variantForm.id}`
        : `${API_URL}/api/admin/tickets/variants`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Gagal menyimpan varian.');
      await loadVariants(productId);
      setVariantForm({ id: null, product_id: productId, name: '', price: '', quota_per_day: '0', is_active: 1 });
    } catch (e) {
      setError(e?.message || 'Gagal menyimpan varian.');
    } finally {
      setLoading(false);
    }
  };

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  }), []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Ticketing</h1>
          <p className="text-sm font-bold text-slate-500">Kelola produk tiket/event + varian harga (1 voucher per item, tanggal wajib).</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reloadAll}
            className="px-4 py-3 rounded-2xl bg-white border border-slate-200 font-black text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCcw size={16} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleNew}
            className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 flex items-center gap-2"
            disabled={loading}
          >
            <Plus size={16} /> Produk Baru
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-5 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100">
          <XCircle size={18} className="shrink-0 mt-0.5" /> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: list */}
        <div className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-black text-slate-900">Produk</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {products.length} items
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {products.map((p) => {
              const isActive = Number(p.is_active) !== 0;
              const isSelected = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left px-5 py-4 border-b border-slate-50 hover:bg-slate-50 transition ${
                    isSelected ? 'bg-rose-50/40' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 truncate">{p.title}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 truncate">
                        /{p.slug} • {p.city} • {p.category}
                      </div>
                      <div className="mt-1 text-[11px] font-black text-slate-700">
                        Mulai dari Rp {(Number(p.min_price) || 0).toLocaleString('id-ID')}
                        <span className="text-slate-400"> • </span>
                        {Number(p.variant_count) || 0} varian
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      isActive ? 'bg-emerald-500/90 text-white' : 'bg-slate-300 text-slate-700'
                    }`}>
                      {isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </button>
              );
            })}
            {products.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-slate-500">
                Belum ada produk. Klik “Produk Baru”.
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-black text-slate-900">Detail Produk</div>
              <button
                type="button"
                onClick={saveProduct}
                disabled={loading}
                className="px-4 py-3 rounded-2xl bg-rose-500 text-white font-black hover:bg-rose-600 flex items-center gap-2 disabled:opacity-60"
              >
                <Save size={16} /> Simpan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Judul</div>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                  placeholder="Tiket Candi Prambanan"
                />
              </label>
              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Slug</div>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                  placeholder="tiket-candi-prambanan"
                />
              </label>
              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Kota</div>
                <select
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                >
                  <option value="jogja">jogja</option>
                  <option value="solo">solo</option>
                </select>
              </label>
              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Kategori</div>
                <input
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                  placeholder="attraction / museum / concert / event"
                />
              </label>
              <label className="block md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</div>
                  <button
                    type="button"
                    onClick={openVendorModal}
                    className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <UserPlus size={14} /> Tambah Vendor
                  </button>
                </div>
                <select
                  value={form.vendor_id || ''}
                  onChange={(e) => setForm((p) => ({ ...p, vendor_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                >
                  <option value="">(Belum di-set)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name || v.email} ({v.email})
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-[11px] text-slate-500 font-semibold">
                  Vendor dipakai untuk akses portal redeem + rekap di <span className="font-black text-slate-700">/vendor</span>.
                </div>
              </label>

              <label className="block md:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cover Image URL</div>
                <input
                  value={form.cover_image_url}
                  onChange={(e) => setForm((p) => ({ ...p, cover_image_url: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                  placeholder="https://..."
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Venue / Lokasi</div>
                <input
                  value={form.venue_name}
                  onChange={(e) => setForm((p) => ({ ...p, venue_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                  placeholder="Nama tempat / venue"
                />
              </label>
              <label className="block md:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Alamat</div>
                <input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                  placeholder="Alamat singkat"
                />
              </label>
              <label className="block md:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Google Maps URL</div>
                <input
                  value={form.maps_url}
                  onChange={(e) => setForm((p) => ({ ...p, maps_url: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                  placeholder="https://maps.app.goo.gl/..."
                />
              </label>
              <label className="block md:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</div>
                <select
                  value={String(form.is_active)}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === '0' ? 0 : 1 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                >
                  <option value="1">Aktif</option>
                  <option value="0">Nonaktif</option>
                </select>
              </label>
            </div>

            <div className="mt-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Deskripsi</div>
              <ReactQuill value={form.description_html} onChange={(v) => setForm((p) => ({ ...p, description_html: v }))} modules={quillModules} />
            </div>
            <div className="mt-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Syarat & Ketentuan</div>
              <ReactQuill value={form.terms_html} onChange={(v) => setForm((p) => ({ ...p, terms_html: v }))} modules={quillModules} />
            </div>
          </div>

          {/* Variants */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-black text-slate-900">Varian Harga</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{variants.length} varian</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={variantForm.name}
                onChange={(e) => setVariantForm((p) => ({ ...p, name: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                placeholder="Dewasa / Anak / VIP"
              />
              <input
                value={variantForm.price}
                onChange={(e) => setVariantForm((p) => ({ ...p, price: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                placeholder="Harga (angka)"
                inputMode="numeric"
              />
              <input
                value={variantForm.quota_per_day}
                onChange={(e) => setVariantForm((p) => ({ ...p, quota_per_day: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                placeholder="Kuota/hari (0=unlimited)"
                inputMode="numeric"
              />
              <select
                value={String(variantForm.is_active)}
                onChange={(e) => setVariantForm((p) => ({ ...p, is_active: e.target.value === '0' ? 0 : 1 }))}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none md:col-span-2"
              >
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
              <button
                type="button"
                onClick={saveVariant}
                disabled={loading}
                className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 disabled:opacity-60"
              >
                {variantForm.id ? 'Update Varian' : 'Tambah Varian'}
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() =>
                    setVariantForm({
                      id: v.id,
                      product_id: v.product_id,
                      name: v.name || '',
                      price: String(v.price || ''),
                      quota_per_day: String(v.quota_per_day || 0),
                      is_active: Number(v.is_active) === 0 ? 0 : 1,
                    })
                  }
                  className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 truncate">{v.name}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        Rp {(Number(v.price) || 0).toLocaleString('id-ID')} • Kuota/hari: {Number(v.quota_per_day) || 0}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      Number(v.is_active) !== 0 ? 'bg-emerald-500/90 text-white' : 'bg-slate-300 text-slate-700'
                    }`}>
                      {Number(v.is_active) !== 0 ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </button>
              ))}
              {variants.length === 0 ? (
                <div className="text-sm font-bold text-slate-500 text-center py-6">
                  Belum ada varian. Tambahkan minimal 1 varian.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Vendor modal */}
      {isVendorModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div key={vendorModalKey} className="w-full max-w-lg bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-black text-slate-900">Tambah Vendor</div>
                <div className="text-sm font-bold text-slate-500 mt-1">
                  Buat akun vendor untuk akses portal <span className="font-black text-slate-700">/vendor</span> (redeem & rekap).
                </div>
                <div className="mt-2 text-[11px] text-slate-500 font-semibold">
                  Kalau muncul email “admin brothers” otomatis, itu biasanya <span className="font-black text-slate-700">autofill browser</span>. Silakan hapus dan isi email vendor.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
                aria-label="Tutup"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                name="vendor_name"
                autoComplete="off"
                value={vendorForm.name}
                onChange={(e) => setVendorForm((p) => ({ ...p, name: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none md:col-span-2"
                placeholder="Nama vendor"
              />
              <input
                name="vendor_email"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                value={vendorForm.email}
                onChange={(e) => setVendorForm((p) => ({ ...p, email: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none md:col-span-2"
                placeholder="Email vendor"
                inputMode="email"
              />
              <input
                name="vendor_phone"
                type="tel"
                autoComplete="off"
                value={vendorForm.phone}
                onChange={(e) => setVendorForm((p) => ({ ...p, phone: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                placeholder="No HP"
              />
              <input
                name="vendor_password"
                autoComplete="new-password"
                value={vendorForm.password}
                onChange={(e) => setVendorForm((p) => ({ ...p, password: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-800 outline-none"
                placeholder="Password"
                type="password"
              />
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(false)}
                className="px-5 py-3 rounded-2xl bg-white border border-slate-200 font-black text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={createVendor}
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-rose-500 text-white font-black hover:bg-rose-600 disabled:opacity-60"
              >
                Buat Vendor
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
