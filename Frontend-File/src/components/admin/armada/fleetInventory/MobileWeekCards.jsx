import React from 'react';
import { Bike, ChevronDown, Wrench } from 'lucide-react';
import { CSTATUS, DAY_LABELS } from './fleetInventoryConstants';
import { fmtDateKey } from './fleetInventoryDateUtils';
import { getCellStatus } from './fleetInventoryCellStatus';

export default function MobileWeekCards({
  groupedUnits,
  expandedTypes,
  setExpandedTypes,
  weekDays,
  todayKey,
  cellMap,
  handleCellClick,
  cardStyle,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(groupedUnits).map(([type, typeUnits]) => (
        <div key={type}>
          <div
            onClick={() => setExpandedTypes((e) => ({ ...e, [type]: !e[type] }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: '#f8fafc',
              borderRadius: 10,
              cursor: 'pointer',
              marginBottom: expandedTypes[type] === false ? 0 : 6,
              userSelect: 'none',
            }}
          >
            <Bike size={13} style={{ color: '#64748b' }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                flex: 1,
              }}
            >
              {type}
            </span>
            <ChevronDown
              size={13}
              style={{
                color: '#94a3b8',
                transform: expandedTypes[type] === false ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </div>

          {expandedTypes[type] !== false &&
            typeUnits.map((unit) => (
              <div key={unit.id} style={{ ...cardStyle, marginBottom: 6 }}>
                <div
                  style={{
                    padding: '8px 12px 6px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{unit.name}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{unit.plat}</span>
                </div>
                <div style={{ overflowX: 'auto', padding: '8px 10px', display: 'flex', gap: 5 }}>
                  {weekDays.map((date) => {
                    const dk = fmtDateKey(date);
                    const isToday = dk === todayKey;
                    const cell = cellMap[`${unit.id}_${dk}`];
                    const ckey = getCellStatus(cell);
                    const cst = CSTATUS[ckey];
                    const isEmpty = ckey === 'free';
                    const count = cell?.rentalCount || 0;

                    const bg =
                      ckey === 'mixed'
                        ? 'repeating-linear-gradient(45deg, #d97706, #d97706 6px, #dc2626 6px, #dc2626 12px)'
                        : isEmpty
                          ? isToday
                            ? '#fff5f5'
                            : '#f8fafc'
                          : cst.bg;

                    const border = `1.5px ${isEmpty ? 'dashed' : 'solid'} ${
                      isEmpty ? (isToday ? '#78081C40' : '#e2e8f0') : 'transparent'
                    }`;

                    return (
                      <div
                        key={dk}
                        onClick={() => handleCellClick(unit, date)}
                        style={{
                          minWidth: 48,
                          borderRadius: 8,
                          padding: '5px 3px',
                          cursor: 'pointer',
                          background: bg,
                          border,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: isToday ? '#78081C' : '#94a3b8',
                            textTransform: 'uppercase',
                          }}
                        >
                          {DAY_LABELS[date.getDay()]}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: isToday ? '#78081C' : isEmpty ? '#374151' : cst.text,
                          }}
                        >
                          {date.getDate()}
                        </span>
                        {!isEmpty && count > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 900, color: cst.text }}>
                            {count > 1 ? `${count}×` : '✓'}
                          </span>
                        )}
                        {!isEmpty && cell?.hasBlock && count === 0 && <Wrench size={10} style={{ color: cst.text }} />}
                        {isEmpty && <span style={{ fontSize: 14, color: '#d1d5db' }}>+</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

