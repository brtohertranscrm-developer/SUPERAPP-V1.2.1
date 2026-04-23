import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Share2 } from 'lucide-react';
import { resolveMediaUrl } from '../../../utils/media';

const ArticleHeader = ({ article }) => {
  const navigate = useNavigate();

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link artikel berhasil disalin!");
  };

  return (
    <>
      {/* HEADER IMAGE SECTION */}
      <div className="relative h-[50vh] md:h-[65vh] w-full overflow-hidden">
        <img 
          src={resolveMediaUrl(article.image_url) || 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?q=80&w=1200'} 
          alt={article.title} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-black/40"></div>
        
        {/* Tombol Kembali Floating */}
        <div className="absolute top-8 left-0 w-full z-30">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <button 
              onClick={() => navigate('/artikel')}
              className="inline-flex items-center gap-2 text-slate-900 bg-white/90 backdrop-blur-xl px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-rose-500 hover:text-white transition-all group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Blog
            </button>
          </div>
        </div>
      </div>

      {/* PERBAIKAN: Padding Kiri-Kanan 2rem (px-8) dan Margin Top -7rem (-mt-28) */}
      <div className="max-w-4xl mx-auto px-8 relative z-20 -mt-28 md:-mt-32">
        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-50 mb-10 md:mb-16">
          
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-rose-100">
              {article.category}
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <Clock size={14} /> 5 Menit Baca
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-xs">BT</div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-900">Admin Brother Trans</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleShare}
              className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
              title="Salin Link"
            >
              <Share2 size={20} />
            </button>
          </div>
          
        </div>
      </div>
    </>
  );
};

export default ArticleHeader;
