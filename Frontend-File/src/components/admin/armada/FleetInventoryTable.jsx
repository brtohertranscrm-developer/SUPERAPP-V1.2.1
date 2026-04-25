import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  Loader2,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import CellDetailModal from './fleetInventory/CellDetailModal';
import DesktopTable from './fleetInventory/DesktopTable';
import FleetInventoryHeader from './fleetInventory/FleetInventoryHeader';
import MobileWeekCards from './fleetInventory/MobileWeekCards';
import MonthView from './fleetInventory/MonthView';
import { CSTATUS, DAY_LABELS, MONTH_NAMES } from './fleetInventory/fleetInventoryConstants';
import { getCellStatus } from './fleetInventory/fleetInventoryCellStatus';
import { fmtDateKey, getWeekDays, getWeekStart } from './fleetInventory/fleetInventoryDateUtils';
import { useFleetInventoryData } from './fleetInventory/useFleetInventoryData';

export default function FleetInventoryTable() {
  const { user } = useContext(AuthContext) || {};
  const canManage = user?.role === 'superadmin' || user?.role === 'admin';

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => fmtDateKey(today), [today]);

  const { units, cellMap, isLoading, loadError, refreshAll, reloadAll } = useFleetInventoryData();

  const [viewMode, setViewMode] = useState('week');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(() =>
    getWeekStart(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [filterType, setFilterType] = useState('Semua');
  const [expandedTypes, setExpandedTypes] = useState({});
  const [modalCell, setModalCell] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };
  const goToToday = () => {
    setWeekStart(getWeekStart(today.getFullYear(), today.getMonth(), today.getDate()));
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const types = useMemo(() => [...new Set(units.map((u) => u.type))], [units]);
  const filteredUnits = useMemo(
    () => (filterType === 'Semua' ? units : units.filter((u) => u.type === filterType)),
    [filterType, units]
  );
  const groupedUnits = useMemo(() => {
    const g = {};
    filteredUnits.forEach((u) => {
      if (!g[u.type]) g[u.type] = [];
      g[u.type].push(u);
    });
    return g;
  }, [filteredUnits]);

  const todayBooked = useMemo(
    () =>
      units.filter((u) => {
        const c = cellMap[`${u.id}_${todayKey}`];
        return c && c.rentalCount > 0;
      }).length,
    [units, cellMap, todayKey]
  );
  const todayMaint = useMemo(
    () =>
      units.filter((u) => {
        const c = cellMap[`${u.id}_${todayKey}`];
        return c && c.hasBlock;
      }).length,
    [units, cellMap, todayKey]
  );
  const todayFree = units.length - todayBooked;

  const weekOcc = useMemo(() => {
    let booked = 0;
    let total = 0;
    weekDays.forEach((d) => {
      units.forEach((u) => {
        total += 1;
        const c = cellMap[`${u.id}_${fmtDateKey(d)}`];
        if (c && c.rentalCount > 0) booked += 1;
      });
    });
    return total > 0 ? Math.round((booked / total) * 100) : 0;
  }, [weekDays, cellMap, units]);

  const handleCellClick = useCallback(
    (unit, date) => {
      const dk = fmtDateKey(date);
      setModalCell({
        unitId: unit.id,
        unitName: unit.name,
        plat: unit.plat,
        dateKey: dk,
        dateStr: `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
        dayLabel: DAY_LABELS[date.getDay()],
      });
    },
    []
  );

  const renderCell = (unit, date, isToday) => {
    const dk = fmtDateKey(date);
    const key = `${unit.id}_${dk}`;
    const cell = cellMap[key];
    const ckey = getCellStatus(cell);
    const cst = CSTATUS[ckey];
    const isEmpty = ckey === 'free';
    const count = cell?.rentalCount || 0;

    const bgStyle =
      ckey === 'mixed'
        ? { background: 'repeating-linear-gradient(45deg, #d97706, #d97706 6px, #dc2626 6px, #dc2626 12px)' }
        : { background: isEmpty ? (isToday ? 'rgba(120,8,28,0.04)' : 'transparent') : cst.bg };

    return (
      <td key={dk} style={{ padding: '3px 4px', verticalAlign: 'middle' }}>
        <div
          onClick={() => handleCellClick(unit, date)}
          title={isEmpty ? 'Kosong – klik untuk tambah' : `${count} tamu${cell?.hasBlock ? ' + servis' : ''}`}
          style={{
            minHeight: isMobile ? 44 : 56,
            borderRadius: 7,
            padding: isMobile ? '4px 5px' : '5px 7px',
            cursor: 'pointer',
            border: isEmpty ? `1.5px dashed ${isToday ? '#78081C50' : '#e2e8f0'}` : '1.5px solid transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            transition: 'opacity 0.15s, transform 0.1s',
            ...bgStyle,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
            e.currentTarget.style.transform = 'scale(1.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {!isEmpty && (
            <>
              {count > 0 && (
                <span style={{ fontSize: count > 1 ? 16 : 13, fontWeight: 900, color: cst.text, lineHeight: 1 }}>
                  {count > 1 ? `${count}×` : '✓'}
                </span>
              )}
              {cell?.hasBlock && count === 0 && <Wrench size={13} style={{ color: cst.text, opacity: 0.9 }} />}
              {cell?.hasBlock && count > 0 && <Wrench size={9} style={{ color: '#fff', opacity: 0.8 }} />}
            </>
          )}
          {isEmpty && <span style={{ fontSize: 18, opacity: 0.15, color: isToday ? '#78081C' : '#94a3b8' }}>+</span>}
        </div>
      </td>
    );
  };

  const cardStyle = { background: '#fff', borderRadius: 16, border: '1px solid #e8eaf0', overflow: 'hidden' };
  const headerCellStyle = {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748b',
    textAlign: 'center',
    padding: isMobile ? '6px 3px' : '8px 4px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  };

  const weekEnd = weekDays[6];
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()}–${weekEnd.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        maxWidth: 1200,
        margin: '0 auto',
        padding: isMobile ? '16px 12px' : '24px 20px',
      }}
    >
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 0', color: '#64748b' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Memuat data armada...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!isLoading && loadError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} style={{ color: '#dc2626' }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Gagal memuat data</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ef4444' }}>{loadError}</p>
          </div>
          <button
            onClick={reloadAll}
            style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={12} /> Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          <FleetInventoryHeader
            canManage={canManage}
            isMobile={isMobile}
            todayBooked={todayBooked}
            todayFree={todayFree}
            todayMaint={todayMaint}
            totalUnits={units.length}
            weekOcc={weekOcc}
            refreshAll={refreshAll}
            viewMode={viewMode}
            setViewMode={setViewMode}
            prevWeek={prevWeek}
            nextWeek={nextWeek}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            weekLabel={weekLabel}
            monthLabel={`${MONTH_NAMES[currentMonth]} ${currentYear}`}
            goToToday={goToToday}
            types={types}
            filterType={filterType}
            setFilterType={setFilterType}
            cstatus={CSTATUS}
          />

          <div style={{ ...cardStyle }}>
            {units.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Bike size={32} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Belum ada unit motor terdaftar.</p>
              </div>
            ) : viewMode === 'week' ? (
              isMobile ? (
                <div style={{ padding: '10px 8px' }}>
                  <MobileWeekCards
                    groupedUnits={groupedUnits}
                    expandedTypes={expandedTypes}
                    setExpandedTypes={setExpandedTypes}
                    weekDays={weekDays}
                    todayKey={todayKey}
                    cellMap={cellMap}
                    handleCellClick={handleCellClick}
                    cardStyle={cardStyle}
                  />
                </div>
              ) : (
                <DesktopTable days={weekDays} groupedUnits={groupedUnits} headerCellStyle={headerCellStyle} todayKey={todayKey} renderCell={renderCell} />
              )
            ) : (
              <MonthView
                isMobile={isMobile}
                currentYear={currentYear}
                currentMonth={currentMonth}
                groupedUnits={groupedUnits}
                cardStyle={cardStyle}
                headerCellStyle={headerCellStyle}
                todayKey={todayKey}
                cellMap={cellMap}
                handleCellClick={handleCellClick}
                renderCell={renderCell}
              />
            )}
          </div>

          <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 8, fontWeight: 600 }}>
            Klik sel untuk lihat atau tambah booking · Hijau = 1 tamu · Oranye = 2+ tamu · Merah = maintenance
          </p>
        </>
      )}

      {modalCell && (
        (() => {
          const key = `${modalCell.unitId}_${modalCell.dateKey}`;
          const cellData = cellMap[key] || { rentals: [], blocks: [], rentalCount: 0, hasBlock: false };
          const cell = { ...modalCell, cellData };
          return (
        <CellDetailModal
          cell={cell}
          onClose={() => setModalCell(null)}
          onRefresh={async () => {
            await refreshAll();
          }}
          canManage={canManage}
        />
          );
        })()
      )}
    </div>
  );
}
