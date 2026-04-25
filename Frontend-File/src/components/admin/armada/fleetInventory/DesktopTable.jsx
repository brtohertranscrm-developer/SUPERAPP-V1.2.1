import React from 'react';
import { DAY_LABELS } from './fleetInventoryConstants';
import { fmtDateKey } from './fleetInventoryDateUtils';

export default function DesktopTable({ days, groupedUnits, headerCellStyle, todayKey, renderCell }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 160 }} />
          {days.map((_, i) => (
            <col key={i} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
            <th style={{ ...headerCellStyle, textAlign: 'left', paddingLeft: 14 }}>Unit / Plat</th>
            {days.map((date) => {
              const isToday = fmtDateKey(date) === todayKey;
              return (
                <th
                  key={fmtDateKey(date)}
                  style={{
                    ...headerCellStyle,
                    color: isToday ? '#78081C' : '#64748b',
                    fontWeight: isToday ? 800 : 700,
                    background: isToday ? '#fff5f5' : 'transparent',
                  }}
                >
                  <div>{DAY_LABELS[date.getDay()]}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isToday ? '#78081C' : '#1e293b' }}>
                    {date.getDate()}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedUnits).map(([type, typeUnits]) => (
            <React.Fragment key={type}>
              <tr>
                <td
                  colSpan={days.length + 1}
                  style={{
                    padding: '5px 14px',
                    background: '#f1f5f9',
                    fontSize: 9,
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    borderBottom: '1px solid #e2e8f0',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  {type}{' '}
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>({typeUnits.length})</span>
                </td>
              </tr>
              {typeUnits.map((unit, rowIndex) => (
                <tr
                  key={unit.id}
                  style={{
                    borderBottom:
                      rowIndex === typeUnits.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fafbfc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '';
                  }}
                >
                  <td
                    style={{
                      padding: '4px 8px 4px 14px',
                      borderRight: '1.5px solid #e2e8f0',
                      verticalAlign: 'middle',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{unit.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{unit.plat}</div>
                  </td>
                  {days.map((date) => renderCell(unit, date, fmtDateKey(date) === todayKey))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

