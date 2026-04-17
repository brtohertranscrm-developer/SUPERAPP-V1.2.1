import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useArticleDetail } from '../../hooks/useArticleDetail';
import ArticleHeader from '../../components/public/article/ArticleHeader';
import ArticleCTA from '../../components/public/article/ArticleCTA';

export default function ArticleDetail() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { article, isLoading, error } = useArticleDetail(id);

  // ==========================================
  // RENDER: LOADING STATE
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-rose-500 mb-4" size={48} />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Memuat Cerita Perjalanan...</p>
      </div>
    );
  }

  // ==========================================
  // RENDER: ERROR STATE
  // ==========================================
  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
          <h2 className="text-2xl font-black text-slate-900 mb-2">Waduh! Jalur Buntu.</h2>
          <p className="text-slate-500 mb-8 font-medium">Artikel yang Anda cari tidak tersedia atau sudah dipindahkan.</p>
          <button onClick={() => navigate('/artikel')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm transition-transform active:scale-95">
            Kembali ke Blog
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN CONTENT
  // ==========================================
  return (
    // PERBAIKAN 1: Tambahkan overflow-hidden di container utama agar tidak bisa digeser ke kanan/kiri
    <div className="bg-white min-h-screen pb-20 overflow-hidden w-full">
      
      {/* 1. Header & Meta */}
      <ArticleHeader article={article} />

      {/* 2. Content Container */}
      <div className="max-w-4xl mx-auto px-8 sm:px-8 -mt-28 relative z-20">
        
      {/* Konten Artikel (Render HTML dari Quill) */}
        <div 
          className="prose prose-lg md:prose-xl prose-slate max-w-none 
            prose-headings:font-black prose-headings:text-slate-900 prose-headings:tracking-tight
            prose-p:text-slate-600 prose-p:leading-relaxed prose-p:font-medium
            prose-strong:text-slate-900 prose-strong:font-black
            prose-img:rounded-[2.5rem] prose-img:shadow-2xl prose-img:border prose-img:border-slate-100
            prose-blockquote:border-l-4 prose-blockquote:border-rose-500 prose-blockquote:bg-rose-50/50 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-3xl prose-blockquote:italic prose-blockquote:text-slate-700
            mb-20 pt-24 break-words" 
          dangerouslySetInnerHTML={{ __html: article.content }} 
        />

        {/* 3. Call to Action */}
        <ArticleCTA />

      </div>
    </div>
  );
}