import React from 'react';
import { Loader2, FileQuestion } from 'lucide-react';
import ArticleCard from './ArticleCard';

const ArticleGrid = ({ articles, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={40}/>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-white p-16 rounded-[2.5rem] border border-slate-100 shadow-lg text-center flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <FileQuestion className="text-slate-300" size={48} />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">Belum Ada Artikel</h3>
        <p className="text-slate-500 max-w-md">Cerita perjalanan dan tips menarik sedang dalam proses penulisan. Cek kembali nanti ya!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {articles.map((article) => (
        // PERBAIKAN: Tambahkan min-w-0 agar Card tidak menjebol batas kolom Grid
        <div key={article.id} className="min-w-0 h-full w-full">
          <ArticleCard article={article} />
        </div>
      ))}
    </div>
  );
};

export default ArticleGrid;