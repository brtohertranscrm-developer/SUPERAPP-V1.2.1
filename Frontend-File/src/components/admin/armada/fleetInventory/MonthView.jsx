import React from 'react';
import { getDaysInMonth, fmtDateKey } from './fleetInventoryDateUtils';
import { CSTATUS } from './fleetInventoryConstants';
import { getCellStatus } from './fleetInventoryCellStatus';
import DesktopTable from './DesktopTable';

export default function MonthView({
  isMobile,
  currentYear,
  currentMonth,
  groupedUnits,
  cardStyle,
  headerCellStyle,
  todayKey,
  cellMap,
  handleCellClick,
  renderCell,
}) {
  const days = Array.from({ length: getDaysInMonth(currentYear, currentMonth) }, (_, i) => new Date(currentYear, currentMonth, i + 1));

  if (!isMobile) {
    return <DesktopTable days={days} groupedUnits={groupedUnits} headerCellStyle={headerCellStyle} todayKey={todayKey} renderCell={renderCell} />;
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
        Mode bulan — overview. Tap sel untuk detail.
      </p>
      {Object.entries(groupedUnits).map(([type, typeUnits]) => (
        <div key={type} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8,
              paddingLeft: 2,
            }}
          >
            {type}
          </div>
          <div style={{ ...cardStyle, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...headerCellStyle, textAlign: 'left', paddingLeft: 10, width: 90 }}>Plat</th>
                  {days.map((d) => (
                    <th
                      key={d.getDate()}
                      style={{
                        ...headerCellStyle,
                        padding: '6px 2px',
                        fontSize: 9,
                        color: fmtDateKey(d) === todayKey ? '#78081C' : '#94a3b8',
                      }}
                    >
                      {d.getDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {typeUnits.map((unit) => (
                  <tr key={unit.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td
                      style={{
                        padding: '4px 10px',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        borderRight: '1px solid #e2e8f0',
                      }}
                    >
                      {unit.plat}
                    </td>
                    {days.map((date) => {
                      const dk = fmtDateKey(date);
                      const cell = cellMap[`${unit.id}_${dk}`];
                      const ckey = getCellStatus(cell);
                      const cst = CSTATUS[ckey];
                      const isToday = dk === todayKey;

                      const bg =
                        ckey === 'mixed'
                          ? 'repeating-linear-gradient(45deg, #d97706, #d97706 3px, #dc2626 3px, #dc2626 6px)'
                          : ckey === 'free'
                            ? isToday
                              ? '#fee2e2'
                              : '#f1f5f9'
                            : cst.bg;

                      return (
                        <td key={dk} style={{ padding: '3px 2px', textAlign: 'center' }}>
                          <div
                            onClick={() => handleCellClick(unit, date)}
                            title={cst.label}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 3,
                              margin: '0 auto',
                              background: bg,
                              cursor: 'pointer',
                              border: isToday && ckey === 'free' ? '1px dashed #78081C60' : 'none',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '0.7';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

