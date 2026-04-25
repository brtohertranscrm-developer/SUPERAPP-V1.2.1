import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseLatLngFromText } from '../../utils/geo';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

export const useDeliveryQuote = ({ pickupLocation, bookingData }) => {
  const [handoverMethod, setHandoverMethod] = useState('self'); // self | delivery
  const [deliveryTarget, setDeliveryTarget] = useState('station'); // station | address
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [mapsInput, setMapsInput] = useState('');
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [isDeliveryLoading, setIsDeliveryLoading] = useState(false);

  useEffect(() => {
    const city = bookingData?.pickupLocation || pickupLocation || '';
    if (!city) return;
    fetch(`${API_URL}/api/delivery/stations?city=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && Array.isArray(j.data)) {
          setStations(j.data);
          const free = j.data.find((s) => s.is_free);
          if (free?.id) setStationId(free.id);
        }
      })
      .catch(() => {});
  }, [bookingData?.pickupLocation, pickupLocation]);

  const selectedStation = useMemo(() => {
    const id = String(stationId || '');
    return (stations || []).find((s) => String(s.id) === id) || null;
  }, [stations, stationId]);

  const parsedLatLng = useMemo(() => parseLatLngFromText(mapsInput), [mapsInput]);

  const requestDeliveryQuote = useCallback(
    async (target) => {
      setIsDeliveryLoading(true);
      setDeliveryError('');
      try {
        const res = await fetch(`${API_URL}/api/delivery/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: pickupLocation, target }),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || 'Gagal menghitung biaya pengantaran.');
        }
        setDeliveryQuote(json.data);
        return json.data;
      } catch (e) {
        setDeliveryQuote(null);
        setDeliveryError(e.message || 'Gagal menghitung biaya pengantaran.');
        return null;
      } finally {
        setIsDeliveryLoading(false);
      }
    },
    [pickupLocation]
  );

  useEffect(() => {
    if (handoverMethod !== 'delivery') return;
    if (deliveryTarget !== 'address') return;
    if (!parsedLatLng) return;

    const t = setTimeout(() => {
      requestDeliveryQuote({
        type: 'address',
        lat: parsedLatLng.lat,
        lng: parsedLatLng.lng,
        address: deliveryAddress || null,
      });
    }, 700);

    return () => clearTimeout(t);
  }, [
    handoverMethod,
    deliveryTarget,
    parsedLatLng,
    deliveryAddress,
    requestDeliveryQuote,
  ]);

  useEffect(() => {
    if (handoverMethod !== 'delivery') {
      setDeliveryQuote(null);
      setDeliveryError('');
      return;
    }
    if (deliveryTarget === 'station' && stationId) {
      requestDeliveryQuote({ type: 'station', station_id: stationId });
    } else {
      setDeliveryQuote(null);
    }
  }, [handoverMethod, deliveryTarget, stationId, requestDeliveryQuote]);

  const deliveryFee =
    handoverMethod === 'delivery' ? Number(deliveryQuote?.fee) || 0 : 0;

  return {
    handoverMethod,
    setHandoverMethod,
    deliveryTarget,
    setDeliveryTarget,
    stations,
    stationId,
    setStationId,
    selectedStation,
    deliveryAddress,
    setDeliveryAddress,
    mapsInput,
    setMapsInput,
    parsedLatLng,
    deliveryQuote,
    deliveryError,
    setDeliveryError,
    isDeliveryLoading,
    requestDeliveryQuote,
    deliveryFee,
  };
};
