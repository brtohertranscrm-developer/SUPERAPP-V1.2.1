import React, { useContext, useMemo, useState } from 'react';
import { useBooking } from '../../hooks/useBooking';
import BookingTable from '../../components/admin/booking/BookingTable';
import BookingModal from '../../components/admin/booking/BookingModal';
import ManualEntryModal from '../../components/admin/booking/ManualEntryModal';
import { AuthContext } from '../../context/AuthContext';

const AdminBooking = () => {
  // 1. Tambahkan updateBookingPricing di sini
  const { bookings, loading, updateBookingStatus, updateBookingPricing, fetchBookings } = useBooking();
  const { user } = useContext(AuthContext) || {};
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const canManualEntry = useMemo(() => {
    if (user?.role === 'superadmin') return true;
    let perms = [];
    try {
      perms = typeof user?.permissions === 'string' ? JSON.parse(user.permissions) : (user?.permissions || []);
    } catch {
      perms = [];
    }
    return Array.isArray(perms) && perms.includes('manual_entry');
  }, [user]);

  const handleOpenEdit = (bookingItem) => {
    setSelectedBooking(bookingItem); 
    setIsModalOpen(true);
  };

  const handleModalSubmit = (orderId, formData) => {
    return updateBookingStatus(orderId, formData);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manajemen Transaksi (Booking)</h1>
        {canManualEntry ? (
          <button
            type="button"
            onClick={() => setIsManualOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-rose-500 transition-colors"
          >
            + Input Manual
          </button>
        ) : null}
      </div>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <BookingTable
          data={bookings}
          onEdit={handleOpenEdit}
          onQuickUpdate={updateBookingStatus}
          onRefresh={fetchBookings}
        />
      )}

      {isModalOpen && (
        <BookingModal 
          initialData={selectedBooking}
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleModalSubmit}
          // 2. Oper fungsi ini agar admin bisa update harga dan tersimpan ke database
          onSavePricing={updateBookingPricing} 
        />
      )}

      {isManualOpen && (
        <ManualEntryModal
          onClose={() => setIsManualOpen(false)}
          onCreated={() => fetchBookings()}
        />
      )}
    </div>
  );
};

export default AdminBooking;
