import React from 'react';

const ArtikelTable = ({ data, onEdit, onDelete }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5L18.5 7H20" />
        </svg>
        <p className="text-gray-500 font-medium">Belum ada data artikel.</p>
        <p className="text-sm text-gray-400 mt-1">Mulai tulis artikel pertama Anda!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* ========================================== */}
      {/* DESKTOP VIEW: Tampil sebagai Tabel Modern */}
      {/* ========================================== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm font-semibold border-b">
              <th className="p-4 w-16 text-center">ID</th>
              <th className="p-4">Judul Artikel</th>
              <th className="p-4">Kategori</th>
              <th className="p-4">Status</th>
              <th className="p-4">Tanggal</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-blue-50/50 border-b transition-colors group">
                <td className="p-4 text-center text-gray-500">#{item.id}</td>
                <td className="p-4 font-semibold text-gray-800 max-w-xs truncate" title={item.title}>
                  {item.title}
                </td>
                <td className="p-4">
                  <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                    {item.category}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${
                    item.status === 'published' 
                      ? 'bg-green-50 text-green-600 border-green-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="p-4 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(item)} className="bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100 px-3 py-1.5 rounded-md transition-colors font-medium">
                    Edit
                  </button>
                  <button onClick={() => onDelete(item.id)} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-medium">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========================================== */}
      {/* MOBILE VIEW: Tampil sebagai Card List Compact */}
      {/* ========================================== */}
      <div className="md:hidden flex flex-col divide-y divide-gray-100">
        {data.map((item) => (
          <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-3">
            
            {/* Kiri: Judul & Informasi */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2 mb-1.5">
                {item.title}
              </h3>
              
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  item.status === 'published' 
                    ? 'bg-green-50 text-green-600 border-green-200' 
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {item.status}
                </span>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold border border-blue-100 text-[10px]">
                  {item.category}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400 whitespace-nowrap">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>

            {/* Kanan: Tombol Aksi Ikon Kecil */}
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => onEdit(item)} 
                className="p-2 bg-white border border-gray-200 shadow-sm text-yellow-500 rounded-lg active:bg-gray-50 transition-colors"
                title="Edit Artikel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button 
                onClick={() => onDelete(item.id)} 
                className="p-2 bg-red-50 border border-red-100 text-red-500 rounded-lg active:bg-red-100 transition-colors"
                title="Hapus Artikel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtikelTable;