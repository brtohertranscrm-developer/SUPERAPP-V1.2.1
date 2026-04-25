import { useCallback, useState } from 'react';
import { API_BASE_URL } from '../../utils/api';

export const useGmapsReviewStatus = ({ user }) => {
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [reviewStatus, setReviewStatus] = useState(null); // null | 'pending' | 'rejected' | 'approved'
  const [rejectReason, setRejectReason] = useState('');

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/gmaps/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data?.success) return;
      const lr = data.data?.latest_review;
      if (data.data?.has_reviewed) {
        setReviewStatus('approved');
        setRejectReason('');
      } else if (lr) {
        setReviewStatus(lr.status);
        if (lr.status === 'rejected') setRejectReason(lr.reject_reason || '');
      }
    } catch {
      // ignore
    }
  }, [user]);

  const maybeAutoShowPopup = useCallback(() => {
    if (!user) return () => {};
    if (reviewStatus === 'approved' || reviewStatus === 'pending') return () => {};
    if (sessionStorage.getItem('review_popup_shown')) return () => {};
    if ((user?.miles || 0) <= 0) return () => {};

    const timer = setTimeout(() => {
      setShowReviewPopup(true);
      sessionStorage.setItem('review_popup_shown', '1');
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, reviewStatus]);

  const onSubmitSuccess = useCallback(() => {
    setReviewStatus('pending');
    setShowReviewPopup(false);
  }, []);

  return {
    showReviewPopup,
    setShowReviewPopup,
    reviewStatus,
    rejectReason,
    setReviewStatus,
    fetchStatus,
    maybeAutoShowPopup,
    onSubmitSuccess,
  };
};

