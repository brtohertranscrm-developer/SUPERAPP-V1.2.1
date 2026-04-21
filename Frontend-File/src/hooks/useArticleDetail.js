import { useState, useEffect } from 'react';

export const useArticleDetail = (id) => {
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Gunakan API URL dari environment jika ada
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  useEffect(() => {
    const fetchArticleDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/api/articles/${id}`);
        const result = await response.json();
        
        if (result.success) {
          setArticle(result.data);
        } else {
          setError("Artikel tidak ditemukan");
        }
      } catch (err) {
        console.error("Gagal mengambil detail artikel:", err);
        setError("Terjadi kesalahan koneksi");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchArticleDetail();
    window.scrollTo(0, 0); // Scroll ke atas saat komponen dimuat
  }, [id, API_URL]);

  return { article, isLoading, error };
};