const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Terjadi kesalahan pada server');
    }
    
    return data;
  } catch (error) {
    console.error(`API Fetch Error (${endpoint}):`, error);
    // Lemparkan error agar bisa ditangkap oleh blok try-catch di Hook/Komponen
    throw error; 
  }
};