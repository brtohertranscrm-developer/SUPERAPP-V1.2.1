import React from 'react';
import { useTripHistory } from '../../hooks/useTripHistory';
import TripList from '../../components/user/history/TripList';
import TripTicketModal from '../../components/user/history/TripTicketModal';

export default function TripHistory() {
  const {
    user, navigate,
    bookings, isLoading, error,
    selectedTicket, setSelectedTicket
  } = useTripHistory();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-light pb-20 animate-fade-in-up relative">
      
      {/* Header Teks */}
      <div className="bg-white border-b border-gray-100 pt-12 pb-8 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-brand-dark mb-2">Riwayat Perjalanan</h1>
          <p className="text-gray-500 text-sm font-medium">Pantau status sewa motor dan penggunaan loker pintar Anda di sini.</p>
        </div>
      </div>

      {/* Area Daftar Riwayat */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <TripList 
          bookings={bookings} 
          isLoading={isLoading} 
          error={error} 
          navigate={navigate} 
          onOpenTicket={setSelectedTicket} 
        />
      </div>

      {/* Modal E-Tiket Pop-Up */}
      <TripTicketModal 
        ticket={selectedTicket} 
        onClose={() => setSelectedTicket(null)} 
        user={user} 
      />

    </div>
  );
}