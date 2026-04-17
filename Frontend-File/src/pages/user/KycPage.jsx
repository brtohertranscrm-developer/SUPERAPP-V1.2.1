import React from 'react';
import { useUserKyc } from '../../hooks/useUserKyc';
import UploadForm from '../../components/user/kyc/UploadForm';
import KycStatus from '../../components/user/kyc/KycStatus';

export default function KycPage() {
  const {
    user, navigate,
    nik, setNik,
    ktpFileName, setKtpFileName,
    selfieFileName, setSelfieFileName,
    handleSubmit
  } = useUserKyc();

  if (!user) return null;

  return (
    <div className={`min-h-[80vh] flex ${user.kycStatus === 'pending' ? 'items-center justify-center' : 'items-start pt-12'} bg-brand-light px-4 pb-12 animate-fade-in-up`}>
      
      {/* TAMPILAN JIKA STATUS KYC SUDAH PENDING / APPROVED */}
      {user.kycStatus === 'pending' ? (
        <KycStatus user={user} navigate={navigate} />
      ) : (
        /* TAMPILAN JIKA BELUM KYC */
        <UploadForm 
          nik={nik} setNik={setNik}
          ktpFileName={ktpFileName} setKtpFileName={setKtpFileName}
          selfieFileName={selfieFileName} setSelfieFileName={setSelfieFileName}
          handleSubmit={handleSubmit}
        />
      )}

    </div>
  );
}