import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ExternalLink, Plus, Save, Search, Trash2 } from 'lucide-react';
import { apiFetch } from '../../utils/api';

const DEFAULT_PAGE = {
  id: null,
  slug: '',
  city: '',
  service: '',
  title: '',
  meta_description: '',
  h1: '',
  sections: [{ key: 'intro', title: 'Intro', body_html: '' }],
  faqs: [],
  is_published: 0,
};

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

const normalizeSlug = (slug) =>
  String(slug || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

export default function AdminContent() {
  const [pages, setPages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(DEFAULT_PAGE);

  const filteredPages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) =>
      `${p.slug || ''} ${p.title || ''} ${p.h1 || ''}`.toLowerCase().includes(q)
    );
  }, [pages, search]);

  const fetchList = async () => {
    setIsLoadingList(true);
    setError('');
    try {
      const res = await apiFetch('/api/admin/seo-pages');
      setPages(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err?.message || 'Gagal memuat daftar halaman.');
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchDetail = async (id) => {
    if (!id) return;
    setIsLoadingDetail(true);
    setError('');
    try {
      const res = await apiFetch(`/api/admin/seo-pages/${id}`);
      const data = res?.data || null;
      if (!data) throw new Error('Halaman tidak ditemukan.');
      setDraft({
        id: data.id,
        slug: data.slug || '',
        city: data.city || '',
        service: data.service || '',
        title: data.title || '',
        meta_description: data.meta_description || '',
        h1: data.h1 || '',
        sections: Array.isArray(data.sections) ? data.sections : [],
        faqs: Array.isArray(data.faqs) ? data.faqs : [],
        is_published: data.is_published ? 1 : 0,
      });
    } catch (err) {
      setError(err?.message || 'Gagal memuat detail halaman.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchDetail(selectedId);
  }, [selectedId]);

  const handleNew = () => {
    setSelectedId(null);
    setDraft(DEFAULT_PAGE);
    setError('');
  };

  const updateDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const updateSection = (idx, patch) => {
    updateDraft({
      sections: (draft.sections || []).map((s, i) => (i === idx ? { ...(s || {}), ...patch } : s)),
    });
  };

  const addSection = () => {
    const nextIdx = (draft.sections || []).length + 1;
    updateDraft({
      sections: [...(draft.sections || []), { key: `section-${nextIdx}`, title: `Section ${nextIdx}`, body_html: '' }],
    });
  };

  const removeSection = (idx) => {
    updateDraft({
      sections: (draft.sections || []).filter((_, i) => i !== idx),
    });
  };

  const addFaq = () => {
    updateDraft({ faqs: [...(draft.faqs || []), { q: '', a: '' }] });
  };

  const updateFaq = (idx, patch) => {
    updateDraft({
      faqs: (draft.faqs || []).map((f, i) => (i === idx ? { ...(f || {}), ...patch } : f)),
    });
  };

  const removeFaq = (idx) => {
    updateDraft({ faqs: (draft.faqs || []).filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        slug: normalizeSlug(draft.slug),
        city: draft.city || null,
        service: draft.service || null,
        title: draft.title || null,
        meta_description: draft.meta_description || null,
        h1: draft.h1 || null,
        sections: Array.isArray(draft.sections) ? draft.sections : [],
        faqs: Array.isArray(draft.faqs) ? draft.faqs : [],
        is_published: draft.is_published ? 1 : 0,
      };

      if (draft.id) {
        await apiFetch(`/api/admin/seo-pages/${draft.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        await fetchList();
        alert('Halaman berhasil disimpan.');
      } else {
        const res = await apiFetch('/api/admin/seo-pages', { method: 'POST', body: JSON.stringify(payload) });
        const newId = res?.id;
        await fetchList();
        if (newId) setSelectedId(newId);
        alert('Halaman berhasil dibuat.');
      }
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan halaman.');
    } finally {
      setIsSaving(false);
    }
  };

  const previewUrl = draft.slug ? `/${normalizeSlug(draft.slug)}` : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">SEO / Landing Pages</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Edit halaman SEO tanpa deploy. Gunakan Publish untuk menampilkan ke publik.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} /> Halaman Baru
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 font-bold text-sm rounded-2xl p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List */}
        <div className="lg:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari slug / judul..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={fetchList}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs hover:bg-slate-200"
              disabled={isLoadingList}
            >
              Refresh
            </button>
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filteredPages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all ${
                  selectedId === p.id
                    ? 'border-blue-300 bg-blue-50/40'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-slate-900 truncate">{p.slug}</div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    p.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {p.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-bold mt-1 truncate">
                  {p.title || p.h1 || '—'}
                </div>
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">
                  {(p.city || '—')} · {(p.service || '—')}
                </div>
              </button>
            ))}
            {filteredPages.length === 0 && (
              <div className="text-sm text-slate-400 font-bold p-3">Belum ada halaman.</div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          {isLoadingDetail ? (
            <div className="text-slate-400 font-bold">Memuat editor...</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Slug</span>
                  <input
                    value={draft.slug}
                    onChange={(e) => updateDraft({ slug: e.target.value })}
                    placeholder="contoh: jogja/sewa-motor"
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none w-full md:w-[320px]"
                  />
                  <label className="flex items-center gap-2 text-xs font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!draft.is_published}
                      onChange={(e) => updateDraft({ is_published: e.target.checked ? 1 : 0 })}
                    />
                    Published
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs hover:bg-slate-200 flex items-center gap-2"
                    >
                      <ExternalLink size={16} /> Preview
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    City
                  </label>
                  <select
                    value={draft.city || ''}
                    onChange={(e) => updateDraft({ city: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none"
                  >
                    <option value="">(kosong)</option>
                    <option value="jogja">jogja</option>
                    <option value="solo">solo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Service
                  </label>
                  <select
                    value={draft.service || ''}
                    onChange={(e) => updateDraft({ service: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none"
                  >
                    <option value="">(kosong)</option>
                    <option value="city_hub">city_hub</option>
                    <option value="motor">motor</option>
                    <option value="mobil">mobil</option>
                    <option value="loker">loker</option>
                    <option value="location">location</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    H1
                  </label>
                  <input
                    value={draft.h1}
                    onChange={(e) => updateDraft({ h1: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none"
                    placeholder="Judul halaman (H1)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Meta Title
                </label>
                <input
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none"
                  placeholder="Title untuk tab browser & Google"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Meta Description
                </label>
                <textarea
                  value={draft.meta_description}
                  onChange={(e) => updateDraft({ meta_description: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none min-h-[70px]"
                  placeholder="Ringkasan singkat untuk Google (150–170 karakter)"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-slate-900">Sections</h2>
                <button
                  type="button"
                  onClick={addSection}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs hover:bg-slate-200"
                >
                  + Section
                </button>
              </div>

              <div className="space-y-4">
                {(draft.sections || []).map((s, idx) => (
                  <div key={`${idx}-${s.key}`} className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="p-3 bg-slate-50 flex flex-col md:flex-row md:items-center gap-2 justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={s.key || ''}
                          onChange={(e) => updateSection(idx, { key: e.target.value })}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none w-40"
                          placeholder="key"
                        />
                        <input
                          value={s.title || ''}
                          onChange={(e) => updateSection(idx, { title: e.target.value })}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none flex-1 min-w-[220px]"
                          placeholder="Judul section"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSection(idx)}
                        className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-black text-xs hover:bg-rose-100 flex items-center gap-2"
                        title="Hapus section"
                      >
                        <Trash2 size={16} /> Hapus
                      </button>
                    </div>
                    <div className="p-3">
                      <ReactQuill
                        theme="snow"
                        value={s.body_html || ''}
                        onChange={(val) => updateSection(idx, { body_html: val })}
                        modules={quillModules}
                      />
                    </div>
                  </div>
                ))}
                {(draft.sections || []).length === 0 && (
                  <div className="text-sm text-slate-400 font-bold">Belum ada section.</div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <h2 className="text-sm font-black text-slate-900">FAQ</h2>
                <button
                  type="button"
                  onClick={addFaq}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs hover:bg-slate-200"
                >
                  + FAQ
                </button>
              </div>

              <div className="space-y-3">
                {(draft.faqs || []).map((f, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">FAQ {idx + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeFaq(idx)}
                        className="text-rose-600 hover:text-rose-700 font-black text-xs"
                      >
                        Hapus
                      </button>
                    </div>
                    <input
                      value={f.q || ''}
                      onChange={(e) => updateFaq(idx, { q: e.target.value })}
                      className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none"
                      placeholder="Pertanyaan"
                    />
                    <textarea
                      value={f.a || ''}
                      onChange={(e) => updateFaq(idx, { a: e.target.value })}
                      className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none min-h-[70px]"
                      placeholder="Jawaban"
                    />
                  </div>
                ))}
                {(draft.faqs || []).length === 0 && (
                  <div className="text-sm text-slate-400 font-bold">Belum ada FAQ.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

