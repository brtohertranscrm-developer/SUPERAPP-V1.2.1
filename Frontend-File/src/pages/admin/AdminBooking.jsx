import React, { useState } from 'react';
import { useBooking } from '../../hooks/useBooking';
import BookingTable from '../../components/admin/booking/BookingTable';
import BookingModal from '../../components/admin/booking/BookingModal';

const AdminBooking = () => {
  // 1. Tambahkan updateBookingPricing di sini
  const { bookings, loading, updateBookingStatus, updateBookingPricing } = useBooking();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

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
      </div>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <BookingTable 
          data={bookings} 
          onEdit={handleOpenEdit} 
          onQuickUpdate={updateBookingStatus}
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
    </div>
  );
};

export default AdminBooking;
