import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const ArtikelModal = ({ onClose, onSubmit, initialData }) => {
  const [activeTab, setActiveTab] = useState('konten');
  // State baru untuk mendeteksi proses loading saat upload gambar
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '', category: 'Wisata', image_url: '', 
    content: '', status: 'published', scheduled_at: '',
    slug: '', meta_title: '', meta_desc: '', geo_location: 'Yogyakarta'
  });

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-generate Slug jika user mengetik Judul (dan sedang buat artikel baru)
      if (name === 'title' && !initialData) {
        newData.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }
      return newData;
    });
  };

  const handleContentChange = (value) => {
    setFormData(prev => ({ ...prev, content: value }));
  };

// --- FUNGSI BARU: Upload Gambar ke Backend ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('image', file);
    const API_URL = import.meta.env.VITE_API_URL; // Tambahkan ini

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/upload`, { // Ubah disini
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadData
      });
      
      const result = await response.json();
      if (result.success) {
        // Simpan URL yang dikembalikan server ke dalam state
        setFormData(prev => ({ ...prev, image_url: result.url }));
      } else {
        alert('Gagal mengunggah gambar: ' + (result.message || 'Error server'));
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert('Terjadi kesalahan jaringan saat mengunggah gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ]
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        
        {/* HEADER MODAL */}
        <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-2xl md:rounded-t-xl sticky top-0 z-10">
          <h2 className="text-xl font-bold">{initialData ? 'Edit Artikel' : 'Tulis Artikel'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl font-bold">&times;</button>
        </div>

        {/* TAB NAVIGASI */}
        <div className="flex border-b bg-gray-50">
          <button 
            type="button"
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'konten' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('konten')}
          >
            Isi Konten
          </button>
          <button 
            type="button"
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'seo' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('seo')}
          >
            SEO & Lokasi
          </button>
        </div>
        
        {/* FORM BODY */}
        <form id="artikelForm" onSubmit={handleSubmit} className="overflow-y-auto p-4 md:p-6 flex-1 bg-gray-50/50">
          
          {/* --- TAB 1: KONTEN UTAMA --- */}
          <div className={`flex-col gap-4 ${activeTab === 'konten' ? 'flex' : 'hidden'}`}>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Judul Artikel</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Misal: 5 Tempat Wisata Hits..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Kategori</label>
                <select name="category" value={formData.category} onChange={handleChange} className="mt-1 w-full p-3 border rounded-lg bg-white">
                  <option value="Wisata">Wisata</option>
                  <option value="Tips & Trik">Tips & Trik</option>
                  <option value="Promo">Promo</option>
                  <option value="Berita">Berita</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="mt-1 w-full p-3 border rounded-lg bg-white">
                  <option value="published">Langsung Publish</option>
                  <option value="draft">Simpan Draft</option>
                </select>
              </div>
            </div>

            {/* --- BAGIAN UPLOAD GAMBAR BARU --- */}
            <div>
              <label className="block text-sm font-semibold text-gray-700">Gambar Banner/Thumbnail</label>
              
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled={isUploading}
                className="mt-1 w-full p-2 border rounded-lg bg-white cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
              />
              
              {isUploading && <p className="text-sm text-blue-600 mt-2 font-medium animate-pulse">Sedang mengunggah gambar...</p>}
              
              {formData.image_url && !isUploading && (
                <div className="mt-3 relative w-full h-40 md:h-56 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  <img src={formData.image_url} alt="Preview Banner" className="w-full h-full object-cover" />
                  
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({...prev, image_url: ''}))}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md"
                    title="Hapus Gambar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col flex-1 pb-10">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Isi Artikel</label>
              <div className="bg-white rounded-lg overflow-hidden border">
                <ReactQuill 
                  theme="snow" 
                  value={formData.content} 
                  onChange={handleContentChange} 
                  modules={quillModules}
                  className="h-[300px] mb-10" 
                />
              </div>
            </div>
          </div>

          {/* --- TAB 2: SEO & LOKASI --- */}
          <div className={`flex-col gap-5 ${activeTab === 'seo' ? 'flex' : 'hidden'}`}>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
              Pengaturan ini membantu artikel Anda lebih mudah ditemukan di Google (SEO Local).
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Custom URL Slug</label>
              <div className="flex items-center mt-1">
                <span className="bg-gray-200 text-gray-600 px-3 py-3 border border-r-0 rounded-l-lg text-sm">/artikel/</span>
                <input type="text" name="slug" value={formData.slug} onChange={handleChange} required className="w-full p-3 border rounded-r-lg focus:ring-2 focus:ring-blue-500" placeholder="sewa-motor-jogja" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 flex justify-between">
                <span>Meta Title <span className="text-gray-400 font-normal">(Opsional)</span></span>
                <span className={`text-xs ${formData.meta_title?.length > 60 ? 'text-red-500' : 'text-gray-500'}`}>{formData.meta_title?.length || 0}/60</span>
              </label>
              <input type="text" name="meta_title" value={formData.meta_title} onChange={handleChange} maxLength="60" className="mt-1 w-full p-3 border rounded-lg" placeholder="Judul khusus untuk Google..." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 flex justify-between">
                <span>Meta Description <span className="text-gray-400 font-normal">(Opsional)</span></span>
                <span className={`text-xs ${formData.meta_desc?.length > 160 ? 'text-red-500' : 'text-gray-500'}`}>{formData.meta_desc?.length || 0}/160</span>
              </label>
              <textarea name="meta_desc" value={formData.meta_desc} onChange={handleChange} maxLength="160" rows="3" className="mt-1 w-full p-3 border rounded-lg" placeholder="Deskripsi singkat yang muncul di pencarian Google..."></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Target Lokasi (GEO Tag)</label>
              <select name="geo_location" value={formData.geo_location} onChange={handleChange} className="mt-1 w-full p-3 border rounded-lg bg-white">
                <option value="Yogyakarta">Yogyakarta</option>
                <option value="Solo">Solo</option>
                <option value="Semarang">Semarang</option>
                <option value="Nasional">Seluruh Indonesia</option>
              </select>
            </div>
          </div>
        </form>

        {/* STICKY FOOTER ACTION BAR */}
        <div className="p-4 border-t bg-white flex justify-end gap-3 rounded-b-xl sticky bottom-0 z-10">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-gray-700 font-medium bg-gray-100 rounded-lg hover:bg-gray-200 w-full md:w-auto">
            Batal
          </button>
          <button type="submit" form="artikelForm" className="px-6 py-2.5 text-white font-medium bg-blue-600 rounded-lg hover:bg-blue-700 w-full md:w-auto shadow-md">
            Simpan Artikel
          </button>
        </div>

      </div>
    </div>
  );
};

export default ArtikelModal;