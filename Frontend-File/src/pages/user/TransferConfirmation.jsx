import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Backward-compatible alias.
// Older flows used `/transfer-confirmation`; now we use `/payment/:orderId`
// so motor + loker share the same payment UX.
export default function TransferConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fromState = location.state || null;
    const fromSession = (() => {
      try {
        const raw = sessionStorage.getItem('last_transfer_confirmation');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    const payload = fromState || fromSession || null;
    const orderId = payload?.order_id || payload?.orderId || '';

    if (!orderId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const orderData = {
      order_id: orderId,
      item_type: payload?.item_type || payload?.itemType || null,
      item_name: payload?.item_name || payload?.itemName || 'Pesanan',
      total_price: payload?.total_price ?? payload?.totalPrice ?? 0,
      payment_method: payload?.payment_method || payload?.paymentMethod || 'transfer',
    };

    navigate(`/payment/${orderId}`, { state: { orderData }, replace: true });
  }, [location.state, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-3">
        <Loader2 size={18} className="animate-spin text-rose-500" />
        <p className="text-sm font-black text-slate-700">Mengalihkan ke halaman pembayaran...</p>
      </div>
    </div>
  );
}

