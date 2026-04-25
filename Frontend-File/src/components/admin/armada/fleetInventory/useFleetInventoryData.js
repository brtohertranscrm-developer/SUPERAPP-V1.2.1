import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../../utils/api';
import { fmtDateKey, parseDt, toHM } from './fleetInventoryDateUtils';

export const useFleetInventoryData = () => {
  const [cellMap, setCellMap] = useState({});
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const rawBookingsRef = useRef([]);
  const rawBlocksRef = useRef([]);

  const buildCellMap = useCallback((bookings, blocks) => {
    const map = {};

    const addToMap = (key, item) => {
      if (!map[key]) map[key] = { rentals: [], blocks: [], rentalCount: 0, hasBlock: false };
      if (item.itemType === 'rental') {
        map[key].rentals.push(item);
        map[key].rentalCount += 1;
      } else {
        map[key].blocks.push(item);
        map[key].hasBlock = true;
      }
    };

    const skipStatuses = ['cancelled', 'completed', 'selesai'];
    for (const b of bookings) {
      if (!b.unit_id || !b.start_date || !b.end_date) continue;
      if (skipStatuses.includes(String(b.status || '').toLowerCase())) continue;

      const startDt = parseDt(b.start_date);
      const endDt = parseDt(b.end_date);
      if (!startDt || !endDt) continue;

      const startDayKey = fmtDateKey(startDt);
      const endDayKey = fmtDateKey(endDt);
      const cur = new Date(startDt);
      cur.setHours(0, 0, 0, 0);

      while (fmtDateKey(cur) <= endDayKey) {
        const dk = fmtDateKey(cur);
        const isStart = dk === startDayKey;
        const isEnd = dk === endDayKey;
        const startHM = isStart ? toHM(startDt) : '00:00';
        const endHM = isEnd ? toHM(endDt) : '24:00';
        addToMap(`${b.unit_id}_${dk}`, {
          itemType: 'rental',
          type: 'booking',
          orderId: b.order_id,
          name: b.user_name || 'Penyewa',
          phone: b.user_phone || '',
          notes: '',
          startHM,
          endHM,
          status: b.status,
        });
        cur.setDate(cur.getDate() + 1);
      }
    }

    for (const bl of blocks) {
      if (!bl.unit_id || !bl.start_at || !bl.end_at) continue;
      const startDt = parseDt(bl.start_at);
      const endDt = parseDt(bl.end_at);
      if (!startDt || !endDt) continue;

      const startDayKey = fmtDateKey(startDt);
      const endDayKey = fmtDateKey(endDt);
      const cur = new Date(startDt);
      cur.setHours(0, 0, 0, 0);

      while (fmtDateKey(cur) <= endDayKey) {
        const dk = fmtDateKey(cur);
        const isStart = dk === startDayKey;
        const isEnd = dk === endDayKey;
        const startHM = isStart ? toHM(startDt) : '00:00';
        const endHM = isEnd ? toHM(endDt) : '24:00';

        if (bl.block_type === 'rental_manual') {
          addToMap(`${bl.unit_id}_${dk}`, {
            itemType: 'rental',
            type: 'manual',
            blockId: bl.id,
            name: bl.customer_name || 'Manual',
            phone: bl.customer_phone || '',
            notes: bl.notes || '',
            startHM,
            endHM,
          });
        } else if (bl.block_type !== 'buffer') {
          addToMap(`${bl.unit_id}_${dk}`, {
            itemType: 'block',
            blockId: bl.id,
            reason: bl.reason || 'Diblokir',
            block_type: bl.block_type,
            startHM,
            endHM,
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    setCellMap(map);
  }, []);

  const fetchUnits = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/motor-units-all');
      if (data?.success && Array.isArray(data.data)) {
        setUnits(
          data.data.map((u) => ({
            id: u.id,
            type: u.motor_category || u.motor_name || 'Lainnya',
            name: u.motor_name || 'Motor',
            plat: u.plate_number,
          }))
        );
        setLoadError('');
        return;
      }
      setUnits([]);
      setLoadError(data?.error || 'Gagal memuat unit.');
    } catch (e) {
      setUnits([]);
      setLoadError(e?.message || 'Gagal memuat unit.');
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [bRes, blRes] = await Promise.all([
        apiFetch('/api/admin/bookings?item_type=motor'),
        apiFetch('/api/admin/units/blocks'),
      ]);
      const bookings = Array.isArray(bRes?.data) ? bRes.data : [];
      const blocks = Array.isArray(blRes?.data) ? blRes.data : [];
      rawBookingsRef.current = bookings;
      rawBlocksRef.current = blocks;
      buildCellMap(bookings, blocks);
    } catch (e) {
      rawBookingsRef.current = [];
      rawBlocksRef.current = [];
      buildCellMap([], []);
      if (e?.status !== 401) console.warn('fetchAll error:', e?.message);
      setLoadError(e?.message || 'Gagal memuat booking/blokir.');
    }
  }, [buildCellMap]);

  const refreshAll = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchUnits();
      await fetchAll();
    } finally {
      setIsLoading(false);
    }
  }, [fetchUnits, fetchAll]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  return {
    units,
    cellMap,
    isLoading,
    loadError,
    fetchUnits,
    refreshAll,
    reloadAll,
  };
};
