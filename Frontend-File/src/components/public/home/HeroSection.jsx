import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { CityContext } from '../../../context/CityContext';
import { DEFAULT_PICKUP_TIME, DEFAULT_RETURN_TIME } from '../../../utils/motorRentalPricing';

const HeroSection = () => {
  const navigate = useNavigate();
  const { selectedCity, setSelectedCity } = useContext(CityContext);

  const today = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState(DEFAULT_PICKUP_TIME);
  const [endTime, setEndTime] = useState(DEFAULT_RETURN_TIME);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate('/search-page', {
      state: {
        startDate,
        endDate,
        startTime,
        endTime,
        pickupLocation: selectedCity || 'Yogyakarta',
        selectedCity: selectedCity || 'Yogyakarta',
      }
    });
  };

  return (
    <div className="relative pt-32 pb-32 px-4 overflow-hidden bg-slate-950">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2070&auto=format&fit=crop"
          alt="Riding"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10 text-center animate-fade-in-up">
        <span className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-6 inline-block shadow-lg">
          #1 Rental Motor di Jogja & Solo
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
          Super App Perjalanan <br className="hidden md:block" /> Bersama Brother Trans.
        </h1>
        <p className="text-slate-300 font-medium mb-10 max-w-2xl mx-auto text-sm sm:text-base">
          Solusi total liburan Anda. Sewa motor premium untuk eksplorasi dan amankan barang bawaan Anda di Smart Loker kami.
        </p>

        <form onSubmit={handleSearch} className="bg-white p-4 sm:p-5 rounded-3xl shadow-2xl max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-6 gap-4 items-end relative z-20">
          <div className="md:col-span-1 text-left">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">
              Kota Tujuan
            </label>
            <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-rose-500 focus-within:border-rose-500">
              <MapPin size={18} className="text-rose-500 shrink-0" />
              <select
                value={selectedCity || 'Yogyakarta'}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-slate-900 cursor-pointer text-sm appearance-none"
              >
                <option value="Yogyakarta">Yogyakarta</option>
                <option value="Solo">Solo</option>
              </select>
            </div>
          </div>
          <div className="text-left">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Tanggal Ambil</label>
            <input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer" />
          </div>
          <div className="text-left">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Jam Ambil</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer" />
          </div>
          <div className="text-left">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Tanggal Kembali</label>
            <input type="date" value={endDate} min={startDate || today} onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer" />
          </div>
          <div className="text-left">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Jam Kembali</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer" />
          </div>
          <div>
            <button type="submit" className="w-full py-3.5 bg-slate-900 text-white font-black rounded-2xl hover:bg-rose-500 transition-all flex justify-center items-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 text-sm">
              <Search size={18} /> CARI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HeroSection;
