import React from 'react';
import { Package, Calendar } from 'lucide-react';

const LockerHero = ({ startDate, endDate }) => {
  return (
    <div className="bg-blue-600 text-white pt-16 pb-24 px-4 relative overflow-hidden text-center">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl -mr-20 -mt-20"></div>
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
          <Package size={32} className="text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Smart Loker Brother Trans</h1>
        <p className="text-blue-100 text-sm sm:text-base">
          Titipkan barang bawaan Anda dengan aman dan nikmati perjalanan tanpa beban.
        </p>
        
        {startDate && endDate && (
          <div className="inline-flex items-center gap-2 mt-6 bg-white/10 border border-white/20 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm">
            <Calendar size={16} className="text-blue-200"/> 
            Pencarian: {startDate} s/d {endDate}
          </div>
        )}
      </div>
    </div>
  );
};

export default LockerHero;