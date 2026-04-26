import React from 'react';
import { Gift, ChevronRight, MapPin, Compass, Tent, Bike, Trophy } from 'lucide-react';

const TIERS = [
  {
    id:        'backpacker',
    label:     'Backpacker',
    icon:      MapPin,
    minMiles:  0,
    minTrips:  0,
    nextMiles: 150,
    nextTrips: 3,
    gradient:  'from-slate-500 via-slate-400 to-slate-600',
    badge:     'bg-slate-800 text-slate-100',
    bar:       'bg-slate-800',
    text:      'text-slate-100',
    sub:       'text-slate-300',
    multiplier: '1x',
  },
  {
    id:        'explorer',
    label:     'Explorer',
    icon:      Compass,
    minMiles:  150,
    minTrips:  3,
    nextMiles: 500,
    nextTrips: 8,
    gradient:  'from-sky-500 via-cyan-400 to-sky-600',
    badge:     'bg-sky-900 text-sky-100',
    bar:       'bg-sky-900',
    text:      'text-sky-50',
    sub:       'text-sky-200',
    multiplier: '1.1x',
  },
  {
    id:        'adventurer',
    label:     'Adventurer',
    icon:      Tent,
    minMiles:  500,
    minTrips:  8,
    nextMiles: 1500,
    nextTrips: 15,
    gradient:  'from-emerald-500 via-teal-400 to-emerald-600',
    badge:     'bg-emerald-900 text-emerald-100',
    bar:       'bg-emerald-900',
    text:      'text-emerald-50',
    sub:       'text-emerald-200',
    multiplier: '1.2x',
  },
  {
    id:        'road_captain',
    label:     'Road Captain',
    icon:      Bike,
    minMiles:  1500,
    minTrips:  15,
    nextMiles: 4000,
    nextTrips: 30,
    gradient:  'from-violet-500 via-purple-400 to-violet-600',
    badge:     'bg-violet-900 text-violet-100',
    bar:       'bg-violet-900',
    text:      'text-violet-50',
    sub:       'text-violet-200',
    multiplier: '1.3x',
  },
  {
    id:        'legend',
    label:     'Legend',
    icon:      Trophy,
    minMiles:  4000,
    minTrips:  30,
    nextMiles: null,
    nextTrips: null,
    gradient:  'from-amber-400 via-yellow-300 to-amber-500',
    badge:     'bg-amber-900 text-amber-100',
    bar:       'bg-amber-900',
    text:      'text-amber-950',
    sub:       'text-amber-800',
    multiplier: '1.5x',
  },
];

const TIER_ORDER = TIERS.map(t => t.id);

export default function UserStats({ currentMiles, navigate, user }) {
  const rawTier      = user?.user_tier || 'backpacker';
  const seasonStarted = Boolean(user?.season_start_date);
  // NOTE: jika season belum pernah dimulai (season_start_date null), anggap progress pakai total miles agar bar bergerak.
  const seasonMiles  = seasonStarted ? (Number(user?.season_miles_earned) || 0) : (Number(currentMiles) || 0);
  const seasonTrips  = Number(user?.season_trip_count) || 0;

  const tierIdx  = TIER_ORDER.indexOf(rawTier) !== -1 ? TIER_ORDER.indexOf(rawTier) : 0;
  const tier     = TIERS[tierIdx];
  const nextTier = TIERS[tierIdx + 1] || null;
  const Icon     = tier.icon;

  const milesProgress = nextTier
    ? Math.min((seasonMiles - tier.minMiles) / (nextTier.minMiles - tier.minMiles) * 100, 100)
    : 100;
  const tripsProgress = nextTier
    ? Math.min((seasonTrips - tier.minTrips) / (nextTier.minTrips - tier.minTrips) * 100, 100)
    : 100;

  const safeMilesProgress = Number.isFinite(milesProgress) ? Math.max(0, milesProgress) : 0;
  const safeTripsProgress = Number.isFinite(tripsProgress) ? Math.max(0, tripsProgress) : 0;

  const milesLeft = nextTier ? Math.max(0, nextTier.minMiles - seasonMiles) : 0;
  const tripsLeft = nextTier ? Math.max(0, nextTier.minTrips - seasonTrips) : 0;

  return (
    <div className={`bg-gradient-to-br ${tier.gradient} rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-xl transition-transform hover:scale-[1.01]`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full ${tier.text}`}>
            <Icon size={14} /> Brother Miles
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow ${tier.badge}`}>
            {tier.label} · {tier.multiplier} Miles
          </span>
        </div>

        {/* Miles balance */}
        <div className="mb-5">
          <div className={`text-[11px] font-black uppercase tracking-widest mb-1 opacity-70 ${tier.text}`}>Saldo Miles</div>
          <div className={`text-5xl sm:text-6xl font-black tracking-tight drop-shadow ${tier.text}`}>
            {currentMiles.toLocaleString('id-ID')}
          </div>
        </div>

        {/* Progress season */}
        {nextTier ? (
          <div className={`bg-white/15 rounded-2xl p-4 mb-5 space-y-3 border border-white/20`}>
            <p className={`text-[10px] font-black uppercase tracking-widest opacity-70 ${tier.text}`}>
              Progress ke {nextTier.label} — Season Ini
            </p>

            {/* Roadmap tier mini */}
            <div className="pt-1">
              <div className="flex items-center gap-2">
                {TIERS.map((t, i) => {
                  const isActive = i === tierIdx;
                  const isPassed = i < tierIdx;
                  const isNext = i === tierIdx + 1;
                  const dotClass = isActive
                    ? 'bg-white text-slate-900'
                    : isPassed
                      ? 'bg-white/60 text-slate-900'
                      : isNext
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-white/70';
                  const ringClass = isActive ? 'ring-2 ring-white/60' : 'ring-1 ring-white/20';
                  return (
                    <React.Fragment key={t.id}>
                      <div className={`flex items-center gap-1.5`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${dotClass} ${ringClass}`}>
                          {t.multiplier}
                        </div>
                        <div className={`hidden sm:block text-[10px] font-black uppercase tracking-widest ${isActive ? tier.text : tier.sub}`}>
                          {t.label}
                        </div>
                      </div>
                      {i !== TIERS.length - 1 && (
                        <div className="flex-1 h-[2px] rounded-full bg-white/15" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className={`mt-2 text-[10px] font-bold ${tier.sub}`}>
                Naik tier = bonus pengumpulan miles lebih besar ({tier.multiplier} → {nextTier.multiplier}).
              </div>
            </div>

            {/* Miles progress */}
            <div>
              <div className="flex justify-between mb-1">
                <span className={`text-[11px] font-bold ${tier.sub}`}>Miles Terkumpul</span>
                <span className={`text-[11px] font-black ${tier.text}`}>{seasonMiles} / {nextTier.minMiles}</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div className={`${tier.bar} h-full rounded-full transition-all duration-1000`} style={{ width: `${safeMilesProgress}%` }} />
              </div>
              {milesLeft > 0 && <p className={`text-[10px] mt-1 ${tier.sub}`}>{milesLeft} miles lagi</p>}
            </div>

            {/* Trip progress */}
            <div>
              <div className="flex justify-between mb-1">
                <span className={`text-[11px] font-bold ${tier.sub}`}>Perjalanan Season Ini</span>
                <span className={`text-[11px] font-black ${tier.text}`}>{seasonTrips} / {nextTier.minTrips} trip</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div className={`${tier.bar} h-full rounded-full transition-all duration-1000`} style={{ width: `${safeTripsProgress}%` }} />
              </div>
              {tripsLeft > 0 && <p className={`text-[10px] mt-1 ${tier.sub}`}>{tripsLeft} trip lagi</p>}
            </div>
          </div>
        ) : (
          <div className={`bg-white/15 rounded-2xl p-4 mb-5 border border-white/20 text-center`}>
            <Trophy size={20} className={`mx-auto mb-1 ${tier.text}`} />
            <p className={`text-sm font-black ${tier.text}`}>Kamu sudah di level tertinggi!</p>
            <p className={`text-[11px] ${tier.sub} mt-0.5`}>{seasonTrips} trip · {seasonMiles} miles season ini</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => navigate('/rewards')}
          className={`w-full py-4 font-black rounded-2xl text-sm flex justify-center items-center gap-2.5 shadow-xl hover:-translate-y-1 active:scale-95 transition-all bg-white/20 hover:bg-white/30 ${tier.text}`}
        >
          <Gift size={18} /> Tukar Rewards Eksklusif <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
