import { useState, useEffect } from 'react';

export const useArticles = () => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

  useEffect(() => {
    fetch(`${API_URL}/api/articles`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setArticles(data.data);
        } else {
          console.error("Error dari backend:", data.error);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Gagal melakukan fetch:", err);
        setIsLoading(false);
      });
  }, [API_URL]);

  return { articles, isLoading };
};