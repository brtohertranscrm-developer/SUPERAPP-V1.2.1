import { useState, useEffect } from 'react';

export const useHomeData = () => {
  const [promotions, setPromotions] = useState([]);
  const [featuredMotors, setFeaturedMotors] = useState([]);
  const [partners, setPartners] = useState([]);
  const [isLoadingMotors, setIsLoadingMotors] = useState(true);

  // Ambil URL dari environment, jika tidak ada fallback ke localhost
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

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

  // Ambil Partners (Homepage)
  useEffect(() => {
    fetch(`${API_URL}/api/partners?limit=12`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setPartners(data.data);
        }
      })
      .catch(err => console.error('Gagal memuat partner:', err));
  }, [API_URL]);

  return { promotions, featuredMotors, partners, isLoadingMotors };
};
