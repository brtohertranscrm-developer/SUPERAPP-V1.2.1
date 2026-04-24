import React, { useState } from 'react';
import { AlertCircle, UserCheck, Loader2 } from 'lucide-react';

function getCountLabel(name, adminTaskCounts) {
  if (!name || !adminTaskCounts?.[name]) return '';
  const c = adminTaskCounts[name];
  const parts = [];
  if (c.antar) parts.push(`${c.antar} antar`);
  if (c.ambil) parts.push(`${c.ambil} ambil`);
  return parts.length ? ` (${parts.join(' · ')})` : '';
}

export default function QuickAssignDropdown({
  taskId,
  currentAssignee,
  teamOn,
  adminTaskCounts,
  onAssign,
}) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (e) => {
    const name = e.target.value;
    if (name === (currentAssignee || '')) return;
    setSaving(true);
    try {
      await onAssign(taskId, name || null);
    } finally {
      setSaving(false);
    }
  };

  const hasAssignee = !!currentAssignee;

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      {saving ? (
        <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />
      ) : hasAssignee ? (
        <UserCheck size={14} className="text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle size={14} className="text-amber-500 shrink-0" />
      )}

      <select
        value={currentAssignee || ''}
        onChange={handleChange}
        disabled={saving}
        className={`text-sm font-bold rounded-xl border px-3 py-1.5 outline-none cursor-pointer transition max-w-full truncate ${
          hasAssignee
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-400'
            : 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400'
        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={hasAssignee ? `PIC: ${currentAssignee}` : 'Belum ada PIC — pilih admin'}
      >
        <option value="">— Belum ditugaskan —</option>
        {(teamOn || []).map((m) => (
          <option key={m.id} value={m.name}>
            {m.name}{getCountLabel(m.name, adminTaskCounts)}
          </option>
        ))}
      </select>
    </div>
  );
}
