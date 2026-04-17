import React from 'react';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import TripCard from './TripCard';

const TripList = ({ bookings, isLoading, error, navigate, onOpenTicket }) => {
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-rose-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold text-slate-500">Menarik data perjalanan Anda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-center shadow-sm">
        <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
        <p className="text-red-600 font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-sm font-bold text-red-700 hover:text-red-800 underline transition-colors">Coba Lagi</button>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200 shadow-sm">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
          <Clock className="text-gray-400" size={32} />
        </div>
        <h3 className="text-xl font-black text-brand-dark">Belum ada aktivitas</h3>
        <p className="text-gray-500 text-sm mt-1 mb-6 font-medium">Mulai petualangan Anda bersama Brother Trans sekarang!</p>
        <button onClick={() => navigate('/motor')} className="bg-brand-dark text-white px-8 py-3.5 rounded-xl font-black text-sm hover:bg-rose-500 transition-colors shadow-lg active:scale-95">
          Sewa Kendaraan Pertama Anda
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bookings.map((trip) => (
        <TripCard key={trip.order_id} trip={trip} onOpenTicket={onOpenTicket} />
      ))}
    </div>
  );
};

export default TripList;