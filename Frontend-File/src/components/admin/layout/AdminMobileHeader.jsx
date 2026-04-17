import React from 'react';
import { Menu, X } from 'lucide-react';

const AdminMobileHeader = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  return (
    <div className="md:hidden bg-brand-dark text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
      <div className="font-black text-xl tracking-tighter">
        BROTHER<span className="text-brand-primary">ADMIN</span>
      </div>
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  );
};

export default AdminMobileHeader;