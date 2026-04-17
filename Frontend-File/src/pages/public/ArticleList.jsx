import React from 'react';
import { useArticles } from '../../hooks/useArticles';
import ArticleGrid from '../../components/public/article/ArticleGrid';

export default function ArticleList() {
  const { articles, isLoading } = useArticles();

  return (
    <div className="min-h-screen bg-white pb-20">
      
      {/* Header Estetik */}
      <div className="bg-slate-900 pt-24 pb-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Brother Journal</h1>
        <p className="text-slate-400 max-w-xl mx-auto font-medium">
          Temukan inspirasi perjalanan, tips berkendara, dan destinasi tersembunyi di sekitar Jogja & Solo.
        </p>
      </div>

      {/* Area Daftar Artikel */}
      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-10">
        <ArticleGrid articles={articles} isLoading={isLoading} />
      </div>

    </div>
  );
}