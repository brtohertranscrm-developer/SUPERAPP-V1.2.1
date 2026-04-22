import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';

// ==========================================
// HOOK: useMotorAddons — Admin manage motor add-ons & paket
// ==========================================
const MOTOR_ADDONS_UNAVAILABLE_MESSAGE =
  'Fitur add-on motor belum aktif di backend yang sedang berjalan.';

const MOTOR_ADDONS_ENDPOINT_CACHE_KEY = 'motor_addons_endpoint_unavailable';

const readUnavailableCache = () => {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(MOTOR_ADDONS_ENDPOINT_CACHE_KEY) === '1';
};

const writeUnavailableCache = (value) => {
  if (typeof window === 'undefined') return;
  if (value) {
    window.sessionStorage.setItem(MOTOR_ADDONS_ENDPOINT_CACHE_KEY, '1');
  } else {
    window.sessionStorage.removeItem(MOTOR_ADDONS_ENDPOINT_CACHE_KEY);
  }
};

let isMotorAddonsEndpointUnavailable = readUnavailableCache();

export const useMotorAddons = () => {
  const [addons, setAddons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unavailableMessage, setUnavailableMessage] = useState(
    isMotorAddonsEndpointUnavailable ? MOTOR_ADDONS_UNAVAILABLE_MESSAGE : ''
  );
  const hasFetchedRef = useRef(false);

  const fetchAddons = useCallback(async () => {
    if (isMotorAddonsEndpointUnavailable) {
      setUnavailableMessage(MOTOR_ADDONS_UNAVAILABLE_MESSAGE);
      setAddons([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiFetch('/api/admin/motor-addons');
      setAddons(Array.isArray(data?.data) ? data.data : []);
      isMotorAddonsEndpointUnavailable = false;
      writeUnavailableCache(false);
      setUnavailableMessage('');
    } catch (err) {
      if (err?.status === 404) {
        isMotorAddonsEndpointUnavailable = true;
        writeUnavailableCache(true);
        setUnavailableMessage(MOTOR_ADDONS_UNAVAILABLE_MESSAGE);
      } else {
        console.error('Gagal fetch motor addons:', err.message);
        setUnavailableMessage('');
      }
      setAddons([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAddon = async (payload) => {
    if (isMotorAddonsEndpointUnavailable) {
      alert(MOTOR_ADDONS_UNAVAILABLE_MESSAGE);
      return false;
    }
    try {
      await apiFetch('/api/admin/motor-addons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      fetchAddons();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menambahkan add-on.');
      return false;
    }
  };

  const editAddon = async (id, payload) => {
    if (isMotorAddonsEndpointUnavailable) {
      alert(MOTOR_ADDONS_UNAVAILABLE_MESSAGE);
      return false;
    }
    try {
      await apiFetch(`/api/admin/motor-addons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      fetchAddons();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal memperbarui add-on.');
      return false;
    }
  };

  const deleteAddon = async (id) => {
    if (isMotorAddonsEndpointUnavailable) {
      alert(MOTOR_ADDONS_UNAVAILABLE_MESSAGE);
      return false;
    }
    if (!window.confirm('Yakin ingin menghapus add-on ini?')) return false;
    try {
      await apiFetch(`/api/admin/motor-addons/${id}`, { method: 'DELETE' });
      fetchAddons();
      return true;
    } catch (err) {
      alert(err.message || 'Gagal menghapus add-on.');
      return false;
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchAddons();
  }, [fetchAddons]);

  return {
    addons,
    isLoading,
    fetchAddons,
    addAddon,
    editAddon,
    deleteAddon,
    unavailableMessage,
  };
};
