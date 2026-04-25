import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeName } from '../../components/user/checkout/motor/checkoutMotorUtils';

const API_URL = import.meta.env.VITE_API_URL?.trim() || '';

export const useMotorAddonsSelection = () => {
  const [motorAddons, setMotorAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [isAddonsLoading, setIsAddonsLoading] = useState(true);
  const [addonsError, setAddonsError] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetch(`${API_URL}/api/motor-addons`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!isMounted) return;
        if (ok && j?.success && Array.isArray(j.data)) {
          const list = j.data;
          setMotorAddons(list);

          const find = (predicate) => {
            const exact = list.find((a) => predicate(normalizeName(a?.name)));
            return exact ? Number(exact.id) : null;
          };
          const jasHujanId = find((n) => n.includes('jas hujan'));
          const helmId = find((n) => n.includes('helm') && !n.includes('anak'));

          if (helmId || jasHujanId) {
            setSelectedAddons((prev) => {
              const next = { ...(prev || {}) };
              if (helmId && (next[helmId] === undefined || next[helmId] === null))
                next[helmId] = 2;
              if (
                jasHujanId &&
                (next[jasHujanId] === undefined || next[jasHujanId] === null)
              )
                next[jasHujanId] = 2;
              return next;
            });
          }
        } else {
          setMotorAddons([]);
          setAddonsError(j?.error || 'Gagal memuat add-on.');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setMotorAddons([]);
        setAddonsError('Gagal memuat add-on.');
      })
      .finally(() => {
        if (isMounted) setIsAddonsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const addonItems = useMemo(() => {
    const items = [];
    for (const a of motorAddons || []) {
      const qty = Number(selectedAddons?.[a.id]) || 0;
      if (qty <= 0) continue;
      items.push({ id: Number(a.id), qty });
    }
    return items;
  }, [motorAddons, selectedAddons]);

  const gearAddons = useMemo(() => {
    const list = Array.isArray(motorAddons) ? motorAddons : [];
    const find = (predicate) => {
      const exact = list.find((a) => predicate(normalizeName(a?.name)));
      return exact ? Number(exact.id) : null;
    };

    const helmAnakId = find(
      (n) => n.includes('helm anak') || (n.includes('helm') && n.includes('anak'))
    );
    const jasHujanId = find((n) => n.includes('jas hujan'));
    const helmId = find((n) => n.includes('helm') && !n.includes('anak'));

    return { helmId, jasHujanId, helmAnakId };
  }, [motorAddons]);

  // Default operasional 2 helm + 2 jas hujan diinisialisasi saat fetch (agar tidak setState sync di effect)

  const addonTotal = useMemo(() => {
    const byId = new Map((motorAddons || []).map((a) => [Number(a.id), a]));
    let sum = 0;
    for (const it of addonItems) {
      const row = byId.get(Number(it.id));
      if (!row) continue;
      const qty = Number(it.qty) || 0;
      const unit = Number(row.price) || 0;
      sum += Math.max(0, qty) * Math.max(0, unit);
    }
    return sum;
  }, [motorAddons, addonItems]);

  const otherAddons = useMemo(() => {
    const hide = new Set(
      [gearAddons?.helmId, gearAddons?.jasHujanId, gearAddons?.helmAnakId].filter(
        Boolean
      )
    );
    return (motorAddons || []).filter((a) => !hide.has(Number(a.id)));
  }, [motorAddons, gearAddons]);

  const setAddonQty = useCallback(
    (addon, nextQty) => {
      if (!addon?.id) return;
      const id = Number(addon.id);
      const allowQty = Number(addon.allow_quantity) === 1;
      const maxQty = allowQty ? Math.max(1, Number(addon.max_qty) || 1) : 1;

      let qty = Math.max(0, Number(nextQty) || 0);
      if (!allowQty && qty > 0) qty = 1;
      if (allowQty && qty > 0) qty = Math.min(maxQty, qty);

      setSelectedAddons((prev) => {
        const next = { ...(prev || {}) };

        const isGearLikeAddon = (a) => {
          const n = normalizeName(a?.name);
          return n.includes('helm') || n.includes('jas hujan');
        };

        if (addon.addon_type === 'package' && qty > 0 && !isGearLikeAddon(addon)) {
          for (const a of motorAddons || []) {
            if (a.addon_type === 'package' && !isGearLikeAddon(a)) {
              delete next[Number(a.id)];
            }
          }
        }

        if (qty <= 0) delete next[id];
        else next[id] = qty;
        return next;
      });
    },
    [motorAddons]
  );

  const setAddonQtyById = useCallback(
    (addonId, nextQty) => {
      const id = Number(addonId);
      if (!id) return;
      const addon = (motorAddons || []).find((a) => Number(a.id) === id);
      if (!addon) return;
      setAddonQty(addon, nextQty);
    },
    [motorAddons, setAddonQty]
  );

  return {
    motorAddons,
    isAddonsLoading,
    addonsError,
    gearAddons,
    otherAddons,
    selectedAddons,
    addonItems,
    addonTotal,
    setAddonQty,
    setAddonQtyById,
  };
};
