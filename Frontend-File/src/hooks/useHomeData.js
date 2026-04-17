import { useState, useEffect } from 'react';

export const useHomeData = () => {
  const [promotions, setPromotions] = useState([]);
  const [featuredMotors, setFeaturedMotors] = useState([]);
  const [isLoadingMotors, setIsLoadingMotors] = useState(true);

  // Ambil URL dari environment, jika tidak ada fallback ke localhost
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Ambil Promo
  useEffect(() => {
    fetch(`${API_URL}/api/promotions`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          setPromotions(data.data);
        }
      })
      .catch(err => console.error('Gagal memuat promo:', err));
  }, [API_URL]);

  // Ambil Motor Unggulan
  useEffect(() => {
    fetch(`${API_URL}/api/motors`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setFeaturedMotors(data.data.slice(0, 3));
        }
        setIsLoadingMotors(false);
      })
      .catch(err => {
        console.error('Gagal memuat motor:', err);
        setIsLoadingMotors(false);
      });
  }, [API_URL]);

  return { promotions, featuredMotors, isLoadingMotors };
};