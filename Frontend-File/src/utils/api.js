const API_URL_RAW = import.meta.env.VITE_API_URL?.trim() || '';
const API_URL = API_URL_RAW.endsWith('/') ? API_URL_RAW.slice(0, -1) : API_URL_RAW;

export const apiFetch = async (endpoint, options = {}) => {
  // Ambil token dari localStorage
  let token = localStorage.getItem('token');
  let adminToken = localStorage.getItem('admin_token');

  // 🔥 PERBAIKAN: Bersihkan token jika bentuknya string 'undefined' atau 'null'
  if (token === 'undefined' || token === 'null') token = null;
  if (adminToken === 'undefined' || adminToken === 'null') adminToken = null;

  const activeToken = token || adminToken;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}),
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
    throw error; 
  }
};
