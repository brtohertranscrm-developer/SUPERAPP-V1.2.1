import React, { useState } from 'react';

const tcSteps = [
  {
    title: "Jalur Resmi & Aman 🛡️",
    desc: "Demi keamanan transaksimu, pastikan pemesanan hanya dilakukan melalui aplikasi ini atau WhatsApp resmi Brother Trans. Hindari pihak yang mengatasnamakan kami.",
    icon: "🔒" 
  },
  {
    title: "Siapkan Dokumenmu 📑",
    desc: "Untuk verifikasi, siapkan foto e-KTP (penyewa), SIM (pengendara), dan screenshot media sosial aktifmu saat mengisi form booking.",
    icon: "📸"
  },
  {
    title: "Serah Terima & Jaminan 🤝",
    desc: "Saat unit diantar, lakukan pelunasan, serahkan 3 Identitas Asli / Deposit sebagai jaminan, dan kita akan foto bersama unit sebagai bukti serah terima.",
    icon: "🔑"
  },
  {
    title: "Biaya Antar Jemput 📍",
    desc: "Gratis pengantaran ke Stasiun Solo Balapan! Pengantaran di luar stasiun dikenakan Rp15.000 (radius 3km) + Rp5.000/km berikutnya.",
    icon: "🛵"
  }
];

export default function TCOnboardingModal({ onClose, onClaimSuccess }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleNext = () => {
    if (currentStep < tcSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClaim();
    }
  };

  // PERBAIKAN: Fungsi handleClaim sekarang menembak API Backend sesungguhnya
    const handleClaim = async () => {
      setIsClaiming(true);
      
      try {
        const token = localStorage.getItem('token'); 
        const apiUrl = import.meta.env.VITE_API_URL?.trim() || '';
        
        // PERBAIKAN: Hapus /users agar URL cocok dengan backend -> /api/claim-tc-miles
        const response = await fetch(`${apiUrl}/api/claim-tc-miles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });

        // Tangkap respons sebagai teks dulu untuk mencegah crash HTML
        const textResult = await response.text();
        let result;
        try {
          result = JSON.parse(textResult);
        } catch (e) {
          throw new Error('Server tidak merespons dengan format yang benar (Cek Terminal Backend Anda).');
        }

        if (!response.ok) {
          throw new Error(result.message || 'Gagal klaim poin');
        }

        setIsClaiming(false);
        setIsSuccess(true);
        
        setTimeout(() => {
          onClaimSuccess();
        }, 2500);

      } catch (error) {
        console.error("Error claim miles:", error);
        setIsClaiming(false);
        alert(error.message || 'Terjadi kesalahan saat mengklaim Miles. Silakan coba lagi.');
      }
    };

  const progress = ((currentStep + 1) / tcSteps.length) * 100;

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center animate-bounce">
          <div className="text-7xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Misi Berhasil!</h2>
          <p className="text-gray-600">
            Kamu sekarang adalah <span className="font-bold text-blue-600">Smart Renter</span>. 
            <br/> 50 Miles Poin telah ditambahkan ke dompetmu!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">✕</button>
        <div className="w-full bg-gray-100 h-2">
          <div className="bg-blue-600 h-2 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="p-8 text-center relative">
          <div className="text-6xl mb-6 transition-transform transform hover:scale-110">{tcSteps[currentStep].icon}</div>
          <h3 className="text-2xl font-bold mb-3 text-gray-800">{tcSteps[currentStep].title}</h3>
          <p className="text-gray-600 min-h-[5rem] leading-relaxed">{tcSteps[currentStep].desc}</p>
        </div>
        <div className="p-5 bg-gray-50 border-t flex justify-between items-center">
          <span className="text-sm text-gray-500 font-medium">Langkah {currentStep + 1} / {tcSteps.length}</span>
          <button onClick={handleNext} disabled={isClaiming} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
            {isClaiming ? "Memproses..." : (currentStep === tcSteps.length - 1 ? "Klaim 50 Miles 🎁" : "Saya Mengerti 👍")}
          </button>
        </div>
      </div>
    </div>
  );
}