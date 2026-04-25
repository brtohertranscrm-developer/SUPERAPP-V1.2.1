import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-primary text-white rounded-lg flex items-center justify-center font-bold shadow-sm">
              B
            </div>
            <span className="text-xl font-extrabold text-brand-dark tracking-tight">
              Brother<span className="text-brand-primary">Trans</span>
            </span>
          </div>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Brother Trans. Hak Cipta Dilindungi.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center md:justify-end gap-4 text-xs font-bold text-slate-400">
          <Link to="/terms" className="hover:text-slate-900">Syarat & Ketentuan</Link>
          <span className="text-slate-200">•</span>
          <Link to="/privacy" className="hover:text-slate-900">Kebijakan Privasi</Link>
        </div>
      </div>
    </footer>
  );
}
