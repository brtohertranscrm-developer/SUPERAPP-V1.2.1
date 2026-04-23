import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { resolveMediaUrl } from '../../../utils/media';

const ArticleCard = ({ article }) => {
  const navigate = useNavigate();

  // Fungsi pintar & BUG-FREE untuk mengambil Summary
  const getSummary = (content) => {
    if (!content) return '';
    const metaMatch = content.match(/data-summary="([^"]*)"/);
    if (metaMatch && metaMatch[1]) return metaMatch[1];
    
    // PERBAIKAN: Ganti tag HTML dengan SPASI (agar paragraf tidak menempel jadi satu kata panjang)
    // dan bersihkan kode &nbsp; bawaan text editor.
    let cleanText = content
      .replace(/<[^>]+>/g, ' ') 
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ') // Rapikan spasi ganda
      .trim();

    return cleanText.length > 150 ? cleanText.substring(0, 150) + '...' : cleanText;
  };

  return (
    <div 
      onClick={() => navigate(`/artikel/${article.id}`)}
      className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full"
    >
      <div className="h-56 overflow-hidden relative shrink-0">
        {article.image_url ? (
          <img src={resolveMediaUrl(article.image_url)} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <span className="text-slate-300 font-bold text-sm">No Image</span>
          </div>
        )}
        <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
          {article.category || 'Umum'}
        </span>
      </div>
      
      <div className="p-8 flex flex-col flex-grow">
        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase mb-3">
          <Calendar size={12} /> {new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <h3 className="text-xl font-black text-slate-900 leading-tight mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">
          {article.title}
        </h3>
        {/* PERBAIKAN: Tambahkan break-words dan whitespace-normal */}
        <p className="text-slate-500 text-sm line-clamp-3 mb-6 leading-relaxed flex-grow break-words whitespace-normal">
          {getSummary(article.content)}
        </p>
        <div className="flex items-center text-blue-600 font-black text-xs uppercase tracking-widest mt-auto">
          Baca Selengkapnya <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;
