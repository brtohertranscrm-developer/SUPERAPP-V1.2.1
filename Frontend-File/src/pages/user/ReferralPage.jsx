import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  Copy, CheckCircle2, Share2, Gift, Users, Award,
  ChevronRight, Clock, Star, TrendingUp, ArrowLeft, Loader2
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL?.trim() || "";

const apiFetch = async (path, opts = {}) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  return res.json();
};

const TIERS = [
  { threshold: 5,  label: "Silver Referrer", color: "#94a3b8", bg: "bg-slate-100", text: "text-slate-600", miles: 200 },
  { threshold: 10, label: "Gold Referrer",   color: "#d97706", bg: "bg-amber-100", text: "text-amber-700", miles: 500 },
  { threshold: 25, label: "Diamond Referrer",color: "#7c3aed", bg: "bg-purple-100", text: "text-purple-700", miles: 1500 },
];

const getNextTier = (count) => {
  for (const t of TIERS) {
    if (count < t.threshold) return t;
  }
  return null;
};

const StatusBadge = ({ status }) => {
  const map = {
    registered:    { label: "Terdaftar",        cls: "bg-blue-100 text-blue-700" },
    first_booking: { label: "Booking Pertama",  cls: "bg-green-100 text-green-700" },
  };
  const d = map[status] || { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${d.cls}`}>
      {d.label}
    </span>
  );
};

export default function ReferralPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};

  const [me, setMe]           = useState(null);
  const [history, setHistory] = useState([]);
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("overview");
  const [copied, setCopied]   = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, histRes, rewRes] = await Promise.all([
        apiFetch("/api/referral/me"),
        apiFetch("/api/referral/history"),
        apiFetch("/api/referral/rewards"),
      ]);
      if (meRes.success)   setMe(meRes.data);
      if (histRes.success) setHistory(histRes.data);
      if (rewRes.success)  setRewards(rewRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchAll();
  }, [user, fetchAll, navigate]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!me) return;
    const text = `Hei! Sewa motor & loker di Brother Trans pakai kode referralku: ${me.referral_code}\nDaftar sekarang dan kita sama-sama dapat Miles gratis! ${me.referral_link}`;
    if (navigator.share) {
      navigator.share({ title: "Brother Trans Referral", text, url: me.referral_link });
    } else {
      handleCopy(text);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-brand-primary" size={40} />
      </div>
    );
  }

  const nextTier  = me ? getNextTier(me.stats?.successful_invites || 0) : null;
  const totalInvites = me?.stats?.successful_invites || 0;
  const progress  = nextTier ? Math.min((totalInvites / nextTier.threshold) * 100, 100) : 100;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 animate-fade-in-up">

      {/* ── HERO HEADER ── */}
      <div className="bg-slate-900 pt-16 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/20 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-[80px] -ml-10 -mb-10 pointer-pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </button>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-brand-primary/20 rounded-2xl flex items-center justify-center border border-brand-primary/30 backdrop-blur-md">
              <Gift size={28} className="text-brand-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Program Referral</h1>
              <p className="text-slate-400 text-sm font-medium">Ajak teman, dapat Miles bersama!</p>
            </div>
          </div>

          {/* ── KODE REFERRAL ── */}
          {me && (
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kode Referral Kamu</p>
                <p className="font-mono font-black text-2xl sm:text-3xl text-white tracking-widest">{me.referral_code}</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleCopy(me.referral_code)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${copied ? "bg-green-500 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
                >
                  {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copied ? "Tersalin!" : "Salin Kode"}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/30"
                >
                  <Share2 size={16} /> Bagikan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20">

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Invite",    value: me?.stats?.total_invites      || 0, icon: <Users size={18} />,    color: "text-blue-600",   bg: "bg-blue-50" },
            { label: "Berhasil",         value: totalInvites,                       icon: <CheckCircle2 size={18}/>, color: "text-green-600", bg: "bg-green-50" },
            { label: "Miles Didapat",   value: me?.stats?.total_miles_earned  || 0, icon: <Award size={18} />,    color: "text-amber-600",  bg: "bg-amber-50" },
            { label: "Konversi",         value: `${me?.stats?.conversion_rate || 0}%`, icon: <TrendingUp size={18}/>, color: "text-purple-600", bg: "bg-purple-50" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className={`w-9 h-9 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-xl font-black text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── TIER PROGRESS ── */}
        {nextTier ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8">
            <div className="flex justify-between items-center mb-3">
              <p className="font-black text-slate-900 text-sm">Progress Tier Berikutnya</p>
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${nextTier.bg} ${nextTier.text}`}>
                {nextTier.label} (+{nextTier.miles.toLocaleString("id-ID")} Miles)
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-brand-primary to-rose-400 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-bold text-slate-500">
              {totalInvites} / {nextTier.threshold} invite berhasil
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 shadow-sm mb-8 text-white">
            <div className="flex items-center gap-3">
              <Star size={24} className="text-yellow-300" />
              <div>
                <p className="font-black text-lg">Diamond Referrer 💎</p>
                <p className="text-purple-100 text-sm font-medium">Kamu sudah mencapai tier tertinggi! Luar biasa.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TABS ── */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm mb-6">
          {[
            { key: "overview", label: "Cara Kerja" },
            { key: "history",  label: "Riwayat Invite" },
            { key: "rewards",  label: "Reward Saya" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.key ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: CARA KERJA ── */}
        {tab === "overview" && (
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Bagikan kode referralmu",
                desc: "Salin kode atau link referral dan bagikan ke teman lewat WhatsApp, Instagram, atau media sosial lainnya.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                step: "2",
                title: "Teman mendaftar",
                desc: "Temanmu daftar di Brother Trans menggunakan kode referralmu. Keduanya langsung dapat +25 Miles sebagai sambutan.",
                color: "bg-amber-50 text-amber-600",
              },
              {
                step: "3",
                title: "Teman selesai booking pertama",
                desc: "Saat teman menyelesaikan booking pertama, temanmu dapat +75 Miles tambahan dan kamu dapat +100 Miles!",
                color: "bg-green-50 text-green-600",
              },
              {
                step: "★",
                title: "Bonus tier eksklusif",
                desc: "Capai 5, 10, atau 25 invite berhasil untuk bonus Miles ekstra: Silver (+200), Gold (+500), Diamond (+1.500).",
                color: "bg-purple-50 text-purple-600",
              },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex gap-4">
                <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center font-black text-sm shrink-0`}>{s.step}</div>
                <div>
                  <h3 className="font-black text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}

            {/* Referred By */}
            {me?.referred_by && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-center gap-4">
                <Gift size={24} className="text-indigo-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Kamu Diajak Oleh</p>
                  <p className="font-black text-indigo-900">{me.referred_by.name}</p>
                  <p className="text-xs text-indigo-500 font-medium">Kamu dapat +25 Miles saat daftar dan +75 Miles setelah booking pertama!</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: RIWAYAT ── */}
        {tab === "history" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
                <Users size={40} className="text-slate-300 mx-auto mb-3" />
                <h3 className="font-black text-slate-900 mb-1">Belum Ada Invite</h3>
                <p className="text-slate-500 text-sm font-medium">Bagikan kode referralmu dan mulai ajak teman sekarang!</p>
              </div>
            ) : (
              history.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">
                      {(item.referee_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{item.referee_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock size={11} className="text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-400">
                          {new Date(item.registered_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.status} />
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                      +{item.miles_referrer} Miles
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB: REWARDS ── */}
        {tab === "rewards" && (
          <div className="space-y-4">
            {!rewards || rewards.total_miles_from_referral === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
                <Award size={40} className="text-slate-300 mx-auto mb-3" />
                <h3 className="font-black text-slate-900 mb-1">Belum Ada Reward</h3>
                <p className="text-slate-500 text-sm font-medium">Mulai ajak teman untuk mendapatkan Miles pertamamu!</p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-100 mb-1">Total Miles dari Referral</p>
                  <p className="text-4xl font-black">{rewards.total_miles_from_referral?.toLocaleString("id-ID")}</p>
                  <p className="text-amber-100 text-sm font-medium mt-1">Miles</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Miles dari Invite</p>
                    <p className="text-xl font-black text-slate-900">{rewards.miles_from_invites?.toLocaleString("id-ID")}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bonus Tier</p>
                    <p className="text-xl font-black text-slate-900">{rewards.miles_from_tier_bonuses?.toLocaleString("id-ID")}</p>
                  </div>
                </div>

                {rewards.tier_bonuses_earned?.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <h3 className="font-black text-slate-900 mb-3 text-sm">Tier Bonus yang Didapat</h3>
                    <div className="space-y-2">
                      {rewards.tier_bonuses_earned.map((bonus, i) => {
                        const tier = TIERS.find((t) => t.label === bonus.tier_label) || {};
                        return (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${tier.bg || "bg-slate-50"}`}>
                            <span className={`font-black text-sm ${tier.text || "text-slate-700"}`}>{bonus.tier_label}</span>
                            <span className={`font-black text-sm ${tier.text || "text-slate-700"}`}>+{bonus.bonus} Miles</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── CTA BOTTOM ── */}
        <div className="mt-8 bg-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black text-white mb-1">Tukar Miles-mu!</p>
            <p className="text-slate-400 text-sm font-medium">Miles bisa ditukar dengan diskon sewa motor dan loker.</p>
          </div>
          <button
            onClick={() => navigate("/rewards")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-black text-sm hover:bg-brand-secondary transition-all shadow-lg"
          >
            Lihat Rewards <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
