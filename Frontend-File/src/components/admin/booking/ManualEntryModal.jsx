import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiFetch } from '../../../utils/api';

const toDatetimeLocal = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const defaultStart = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  d.setSeconds(0, 0);
  return toDatetimeLocal(d);
};

const defaultEnd = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(d.getMinutes() + 30);
  d.setSeconds(0, 0);
  return toDatetimeLocal(d);
};

export default function ManualEntryModal({ onClose, onCreated }) {
  const [tab, setTab] = useState('booking'); // booking | user
  const [isLoading, setIsLoading] = useState(true);
  const [catalogs, setCatalogs] = useState({ motors: [], cars: [], lockers: [], locker_min_hours: 3 });
  const [error, setError] = useState('');

  const [userForm, setUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    location: 'Lainnya',
    ktp_id: '',
    reset_password: true,
  });

  const [createdUser, setCreatedUser] = useState(null); // { user, temp_password }

  const [bookingForm, setBookingForm] = useState({
    item_type: 'motor',
    motor_id: '',
    car_id: '',
    locker_id: '',
    location: '',
    start_date: defaultStart(),
    end_date: defaultEnd(),
    duration_hours: 6,
    total_price: '',
    base_price: '',
    service_fee: 0,
    addon_fee: 0,
    delivery_fee: 0,
    discount_amount: 0,
    payment_status: 'paid', // paid|unpaid
    payment_method: 'transfer',
    trip_scope: 'local',
    trip_destination: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');
    apiFetch('/api/admin/manual/catalogs')
      .then((res) => {
        if (!mounted) return;
        if (!res?.success) throw new Error(res?.error || 'Gagal memuat katalog.');
        setCatalogs(res.data || { motors: [], cars: [], lockers: [], locker_min_hours: 3 });
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Gagal memuat katalog.');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const motorOptions = catalogs.motors || [];
  const carOptions = catalogs.cars || [];
  const lockerOptions = catalogs.lockers || [];

  const canSubmitUser = userForm.name.trim().length >= 2 && userForm.phone.trim().length >= 6;
  const canSubmitBooking = Boolean(createdUser?.user?.id);

  const itemTypeLabel = useMemo(() => {
    if (bookingForm.item_type === 'motor') return 'Motor';
    if (bookingForm.item_type === 'car') return 'Mobil';
    return 'Loker';
  }, [bookingForm.item_type]);

  const submitUser = async () => {
    setResultMsg('');
    setError('');
    if (!canSubmitUser) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/admin/manual/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userForm,
          ktp_id: userForm.ktp_id || null,
          email: userForm.email || null,
        }),
      });
      if (!res?.success) throw new Error(res?.error || 'Gagal membuat user.');
      setCreatedUser(res.data || null);
      setResultMsg('User siap. Lanjut buat booking manual.');
      setTab('booking');
    } catch (e) {
      setError(e.message || 'Gagal membuat user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBooking = async () => {
    setResultMsg('');
    setError('');
    if (!createdUser?.user?.id) {
      setError('Buat user terlebih dahulu.');
      setTab('user');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        user_id: createdUser.user.id,
        item_type: bookingForm.item_type,
        payment_status: bookingForm.payment_status,
        payment_method: bookingForm.payment_method,
        location: bookingForm.location,
      };

      if (bookingForm.item_type === 'locker') {
        Object.assign(payload, {
          locker_id: bookingForm.locker_id ? Number(bookingForm.locker_id) : null,
          duration_hours: Number(bookingForm.duration_hours) || catalogs.locker_min_hours || 3,
          start_date: bookingForm.start_date,
          item_name: `Loker`,
          pickup_fee: 0,
          drop_fee: 0,
        });
      } else {
        Object.assign(payload, {
          start_date: bookingForm.start_date,
          end_date: bookingForm.end_date,
          total_price: Number(bookingForm.total_price) || 0,
          base_price: Number(bookingForm.base_price || bookingForm.total_price) || 0,
          service_fee: Number(bookingForm.service_fee) || 0,
          addon_fee: Number(bookingForm.addon_fee) || 0,
          delivery_fee: Number(bookingForm.delivery_fee) || 0,
          discount_amount: Number(bookingForm.discount_amount) || 0,
          duration_hours: Number(bookingForm.duration_hours) || 1,
          trip_scope: bookingForm.trip_scope,
          trip_destination: bookingForm.trip_destination,
          price_notes: bookingForm.notes || null,
        });

        if (bookingForm.item_type === 'motor') {
          payload.motor_id = bookingForm.motor_id ? Number(bookingForm.motor_id) : null;
          const m = motorOptions.find((x) => String(x.id) === String(bookingForm.motor_id));
          payload.item_name = m?.display_name || m?.name || 'Motor';
        } else {
          payload.car_id = bookingForm.car_id ? Number(bookingForm.car_id) : null;
          const c = carOptions.find((x) => String(x.id) === String(bookingForm.car_id));
          payload.item_name = c?.display_name || c?.name || 'Mobil';
        }
      }

      const res = await apiFetch('/api/admin/manual/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res?.success) throw new Error(res?.error || 'Gagal membuat booking manual.');

      const oid = res?.data?.order_id || '';
      setResultMsg(`Booking manual dibuat: ${oid}`);
      if (onCreated) onCreated({ order_id: oid, user: createdUser.user });
    } catch (e) {
      setError(e.message || 'Gagal membuat booking manual.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = tab === 'user' ? 'Tambah User Manual' : 'Booking Manual';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-black text-slate-900">{title}</div>
            <div className="text-xs text-slate-500 font-semibold">
              Buat user (KYC settled, tanpa OTP), lalu buat booking {itemTypeLabel} dengan status pending.
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <X size={18} className="text-slate-700" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('user')}
              className={`px-4 py-2 rounded-xl text-xs font-black border ${
                tab === 'user' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              1) User
            </button>
            <button
              type="button"
              onClick={() => setTab('booking')}
              className={`px-4 py-2 rounded-xl text-xs font-black border ${
                tab === 'booking' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
              }`}
              disabled={!createdUser?.user?.id}
              title={!createdUser?.user?.id ? 'Buat user dulu' : ''}
            >
              2) Booking
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center text-slate-500 font-bold gap-2">
              <Loader2 size={18} className="animate-spin" /> Memuat...
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-3 text-sm font-bold">
              {error}
            </div>
          ) : null}

          {!isLoading && resultMsg ? (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl px-4 py-3 text-sm font-bold">
              {resultMsg}
            </div>
          ) : null}

          {tab === 'user' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nama</div>
                <input
                  value={userForm.name}
                  onChange={(e) => setUserForm((s) => ({ ...s, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                  placeholder="Nama customer"
                />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">No HP</div>
                <input
                  value={userForm.phone}
                  onChange={(e) => setUserForm((s) => ({ ...s, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email (opsional)</div>
                <input
                  value={userForm.email}
                  onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                  placeholder="email@domain.com"
                />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">NIK (opsional)</div>
                <input
                  value={userForm.ktp_id}
                  onChange={(e) => setUserForm((s) => ({ ...s, ktp_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                  placeholder="16 digit"
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={userForm.reset_password}
                    onChange={(e) => setUserForm((s) => ({ ...s, reset_password: e.target.checked }))}
                  />
                  Buat password sementara (biar customer bisa login)
                </label>
                <button
                  type="button"
                  onClick={submitUser}
                  disabled={!canSubmitUser || isSubmitting}
                  className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan User'}
                </button>
              </div>

              {createdUser?.user?.id ? (
                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xs font-black text-slate-900 mb-1">User siap:</div>
                  <div className="text-xs text-slate-700 font-bold">
                    {createdUser.user.name} • {createdUser.user.phone} • {createdUser.user.email}
                  </div>
                  {createdUser.temp_password ? (
                    <div className="mt-2 text-xs font-black text-slate-900">
                      Password sementara: <span className="font-mono">{createdUser.temp_password}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Jenis</div>
                  <select
                    value={bookingForm.item_type}
                    onChange={(e) => setBookingForm((s) => ({ ...s, item_type: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold bg-white"
                  >
                    <option value="motor">Motor</option>
                    <option value="car">Mobil</option>
                    <option value="locker">Loker</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status Bayar</div>
                  <select
                    value={bookingForm.payment_status}
                    onChange={(e) => setBookingForm((s) => ({ ...s, payment_status: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold bg-white"
                  >
                    <option value="paid">Paid (menunggu konfirmasi/jadwal)</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Metode</div>
                  <select
                    value={bookingForm.payment_method}
                    onChange={(e) => setBookingForm((s) => ({ ...s, payment_method: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold bg-white"
                  >
                    <option value="transfer">Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="qris">QRIS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Lokasi / Pickup</div>
                  <input
                    value={bookingForm.location}
                    onChange={(e) => setBookingForm((s) => ({ ...s, location: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                    placeholder="Yogyakarta / Solo"
                  />
                </div>

                {bookingForm.item_type === 'motor' ? (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Motor</div>
                    <select
                      value={bookingForm.motor_id}
                      onChange={(e) => setBookingForm((s) => ({ ...s, motor_id: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold bg-white"
                    >
                      <option value="">Pilih motor</option>
                      {motorOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.display_name} — {m.location}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {bookingForm.item_type === 'car' ? (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Mobil</div>
                    <select
                      value={bookingForm.car_id}
                      onChange={(e) => setBookingForm((s) => ({ ...s, car_id: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold bg-white"
                    >
                      <option value="">Pilih mobil</option>
                      {carOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {bookingForm.item_type === 'locker' ? (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Loker</div>
                    <select
                      value={bookingForm.locker_id}
                      onChange={(e) => setBookingForm((s) => ({ ...s, locker_id: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold bg-white"
                    >
                      <option value="">Pilih loker</option>
                      {lockerOptions.map((l) => (
                        <option key={l.id} value={l.id}>
                          {String(l.type || 'loker')} — {l.location} (stok {l.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              {bookingForm.item_type === 'locker' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Mulai</div>
                    <input
                      type="datetime-local"
                      value={bookingForm.start_date}
                      onChange={(e) => setBookingForm((s) => ({ ...s, start_date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Durasi (jam) — min {catalogs.locker_min_hours || 3}
                    </div>
                    <input
                      type="number"
                      value={bookingForm.duration_hours}
                      min={catalogs.locker_min_hours || 3}
                      onChange={(e) => setBookingForm((s) => ({ ...s, duration_hours: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Mulai</div>
                      <input
                        type="datetime-local"
                        value={bookingForm.start_date}
                        onChange={(e) => setBookingForm((s) => ({ ...s, start_date: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Selesai</div>
                      <input
                        type="datetime-local"
                        value={bookingForm.end_date}
                        onChange={(e) => setBookingForm((s) => ({ ...s, end_date: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tujuan Pemakaian</div>
                      <input
                        value={bookingForm.trip_destination}
                        onChange={(e) => setBookingForm((s) => ({ ...s, trip_destination: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                        placeholder="Contoh: Malioboro, Borobudur, dll"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Harga</div>
                      <input
                        value={bookingForm.total_price}
                        onChange={(e) => setBookingForm((s) => ({ ...s, total_price: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                        placeholder="Contoh: 275000"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500 font-semibold">
                  User: <span className="font-black text-slate-900">{createdUser?.user?.name || '-'}</span>
                </div>
                <button
                  type="button"
                  onClick={submitBooking}
                  disabled={!canSubmitBooking || isSubmitting}
                  className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Membuat...</> : 'Buat Booking Manual'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

