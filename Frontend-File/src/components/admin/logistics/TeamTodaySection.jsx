import React from 'react';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import TeamStatusBadge from './TeamStatusBadge';
import { TEAM_LOCATIONS } from './logisticsUtils';

export default function TeamTodaySection({
  selectedDate,
  teamCounts,
  teamLoc,
  onTeamLocChange,
  onRefresh,
  isLoading,
  teamData,
}) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-gray-700" />
          <div>
            <div className="font-black text-gray-900">Tim Hari Ini</div>
            <div className="text-[11px] text-gray-500 font-bold">
              {selectedDate}
              {teamCounts ? ` • Total ${teamCounts.total} (ON ${teamCounts.on}, OFF ${teamCounts.off}, CUTI ${teamCounts.leave}, SAKIT ${teamCounts.sick})` : ''}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={teamLoc}
            onChange={(e) => onTeamLocChange?.(e.target.value)}
            className="bg-white border border-gray-200 rounded-2xl px-4 py-2 font-black text-sm text-gray-800 outline-none"
            title="Filter lokasi"
          >
            {TEAM_LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            onClick={onRefresh}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50"
            title="Refresh tim"
            disabled={isLoading}
            type="button"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /> Refresh Tim
          </button>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 font-bold">
            <Loader2 className="animate-spin" size={16} /> Memuat tim...
          </div>
        ) : (teamData || []).length === 0 ? (
          <div className="text-sm text-gray-500 font-medium">
            Belum ada data tim (atau akun ini belum punya akses manning).
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(teamData || []).map((m) => (
              <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-3xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-gray-900 truncate" title={m.name}>{m.name}</div>
                  <div className="text-xs text-gray-500 font-bold mt-1 truncate" title={`${m.base_location || ''} • ${m.role_tag || ''}`}>
                    {m.base_location || '—'} • {m.role_tag || 'delivery'}
                  </div>
                  {m.note ? (
                    <div className="text-xs text-gray-500 font-medium mt-2 line-clamp-2">
                      Catatan: {m.note}
                    </div>
                  ) : null}
                </div>
                <TeamStatusBadge status={m.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

