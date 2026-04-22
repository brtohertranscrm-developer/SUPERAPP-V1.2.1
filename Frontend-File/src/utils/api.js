const API_URL_RAW = import.meta.env.VITE_API_URL?.trim() || '';
const API_URL = API_URL_RAW.endsWith('/') ? API_URL_RAW.slice(0, -1) : API_URL_RAW;

export const apiFetch = async (endpoint, options = {}) => {
  // Ambil token dari localStorage
  let token = localStorage.getItem('token');
  let adminToken = localStorage.getItem('admin_token');

  // 🔥 PERBAIKAN: Bersihkan token jika bentuknya string 'undefined' atau 'null'
  if (token === 'undefined' || token === 'null') token = null;
  if (adminToken === 'undefined' || adminToken === 'null') adminToken = null;

  // Untuk endpoint admin, prioritaskan admin_token agar tidak ketuker token user yang stale/expired.
  const isAdminEndpoint =
    typeof endpoint === 'string' && (endpoint.startsWith('/api/admin') || endpoint.startsWith('api/admin'));
  const activeToken = isAdminEndpoint ? (adminToken || token) : (token || adminToken);
  
  const headers = {
    'Content-Type': 'application/json',
    ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    
    if (!response.ok || !data?.success) {
      // Jika token expired/invalid, bersihkan sesi agar user tidak stuck di halaman admin.
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('user');

        // Redirect yang aman untuk dev/prod
        if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
          window.location.assign('/login');
        }
      }

      const err = new Error(data?.error || data?.message || 'Terjadi kesalahan pada server');
      err.status = response.status;
      err.payload = data;
      throw err;
    }
    
    return data;
  } catch (error) {
    console.error(`API Fetch Error (${endpoint}):`, error);
    throw error; 
  }
};
