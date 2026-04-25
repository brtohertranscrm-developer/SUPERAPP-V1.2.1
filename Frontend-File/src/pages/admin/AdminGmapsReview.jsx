import React from 'react';
import { Star } from 'lucide-react';
import GmapsReviewTable from '../../components/admin/users/GmapsReviewTable';

export default function AdminGmapsReview() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-50 rounded-2xl flex items-center justify-center">
          <Star size={20} className="text-yellow-500" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Review Google Maps</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Verifikasi screenshot review Google Maps dari pelanggan</p>
        </div>
      </div>

      <GmapsReviewTable />
    </div>
  );
}
