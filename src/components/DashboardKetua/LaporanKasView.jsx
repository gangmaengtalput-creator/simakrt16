import React, { useState, useMemo } from 'react';

export default function LaporanKasView({ 
  setActiveView, 
  listRiwayatIuran, 
  listRiwayatPengeluaran 
}) {
  const namaBulanSekarang = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
  const tahunSekarang = new Date().getFullYear();
  
  const DAFTAR_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const [filterBulan, setFilterBulan] = useState(namaBulanSekarang);
  const [filterTahun, setFilterTahun] = useState(tahunSekarang);

  // ==========================================
  // LOGIKA PENGHITUNGAN BUKU KAS
  // ==========================================
  const laporanBulanIni = useMemo(() => {
    const bulanIndex = DAFTAR_BULAN.indexOf(filterBulan);
    // Batas awal bulan yang dipilih
    const awalBulanIni = new Date(filterTahun, bulanIndex, 1).getTime();
    // Batas akhir bulan yang dipilih
    const awalBulanDepan = new Date(filterTahun, bulanIndex + 1, 1).getTime();

    let saldoAwalPemasukan = 0;
    let saldoAwalPengeluaran = 0;
    const transaksiBulanIni = [];

    // 1. PROSES DATA IURAN (PEMASUKAN)
    listRiwayatIuran.forEach(item => {
      // Menggunakan kolom tanggal_bayar sesuai tabel database
      const tglTransaksi = new Date(item.tanggal_bayar).getTime();
      const nominal = Number(item.jumlah) || 0;

      // Hanya hitung jika nominal uang ada isinya (bukan pengecualian lunas)
      if (nominal > 0) {
        if (tglTransaksi < awalBulanIni) {
          // Jika terjadi sebelum bulan ini, masuk ke Saldo Awal
          saldoAwalPemasukan += nominal;
        } else if (tglTransaksi >= awalBulanIni && tglTransaksi < awalBulanDepan) {
          // Jika terjadi di bulan ini, masuk ke daftar transaksi tabel
          transaksiBulanIni.push({
            id: `in-${item.id}`,
            tanggal: new Date(tglTransaksi),
            tipe: 'Masuk',
            keterangan: `Iuran Kas - ${item.nama_warga} (${item.keterangan || 'Pembayaran'})`,
            pemasukan: nominal,
            pengeluaran: 0
          });
        }
      }
    });

    // 2. PROSES DATA PENGELUARAN
    listRiwayatPengeluaran.forEach(item => {
      // Menggunakan kolom tanggal sesuai tabel database
      const tglTransaksi = new Date(item.tanggal).getTime();
      const nominal = Number(item.nominal) || 0;

      if (tglTransaksi < awalBulanIni) {
        saldoAwalPengeluaran += nominal;
      } else if (tglTransaksi >= awalBulanIni && tglTransaksi < awalBulanDepan) {
        transaksiBulanIni.push({
          id: `out-${item.id}`,
          tanggal: new Date(tglTransaksi),
          tipe: 'Keluar',
          keterangan: `${item.kategori} - ${item.penerima} (${item.keterangan || '-'})`,
          pemasukan: 0,
          pengeluaran: nominal
        });
      }
    });

    // 3. HITUNG SALDO AWAL (Bulan Sebelumnya)
    const saldoAwal = saldoAwalPemasukan - saldoAwalPengeluaran;

    // 4. URUTKAN TRANSAKSI BULAN INI (Terlama ke Terbaru)
    transaksiBulanIni.sort((a, b) => a.tanggal - b.tanggal);

    // 5. HITUNG TOTAL BULAN INI & SALDO AKHIR
    const totalMasukBulanIni = transaksiBulanIni.reduce((sum, item) => sum + item.pemasukan, 0);
    const totalKeluarBulanIni = transaksiBulanIni.reduce((sum, item) => sum + item.pengeluaran, 0);
    const saldoAkhir = saldoAwal + totalMasukBulanIni - totalKeluarBulanIni;

    return {
      saldoAwal,
      transaksi: transaksiBulanIni,
      totalMasukBulanIni,
      totalKeluarBulanIni,
      saldoAkhir
    };
  }, [listRiwayatIuran, listRiwayatPengeluaran, filterBulan, filterTahun]);

  // Warga yang sudah bayar iuran dimuka (>1 bulan) dan bulan laporan termasuk dalam periode tersebut
  const pembayaranDimukaBulanIni = useMemo(() => {
    const bulanIndex = DAFTAR_BULAN.indexOf(filterBulan);
    const awalBulanIni = new Date(filterTahun, bulanIndex, 1).getTime();
    const awalBulanDepan = new Date(filterTahun, bulanIndex + 1, 1).getTime();

    const toPeriodIndex = (bulan, tahun) =>
      DAFTAR_BULAN.indexOf(bulan) + Number(tahun) * 12;

    const groups = new Map();

    listRiwayatIuran.forEach((item) => {
      if (!item.keterangan?.includes('Pembayaran Dimuka') || Number(item.jumlah) <= 0) return;

      const key = `${item.nik_warga}_${item.tanggal_bayar}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    const result = [];

    groups.forEach((records) => {
      if (records.length <= 1) return;

      const mencakupBulanIni = records.some(
        (r) => r.bulan_iuran === filterBulan && Number(r.tahun_iuran) === Number(filterTahun)
      );
      if (!mencakupBulanIni) return;

      const sorted = [...records].sort(
        (a, b) => toPeriodIndex(a.bulan_iuran, a.tahun_iuran) - toPeriodIndex(b.bulan_iuran, b.tahun_iuran)
      );

      const tanggalBayar = new Date(sorted[0].tanggal_bayar);
      const tglBayar = tanggalBayar.getTime();

      // Hanya tampilkan jika uang dipungut di bulan lain (tidak mempengaruhi saldo bulan ini)
      if (tglBayar >= awalBulanIni && tglBayar < awalBulanDepan) return;

      const pertama = sorted[0];
      const terakhir = sorted[sorted.length - 1];

      result.push({
        id: `${pertama.nik_warga}_${pertama.tanggal_bayar}`,
        nama: pertama.nama_warga,
        tanggalBayar,
        bulanMulai: pertama.bulan_iuran,
        tahunMulai: pertama.tahun_iuran,
        bulanAkhir: terakhir.bulan_iuran,
        tahunAkhir: terakhir.tahun_iuran,
        jumlahBulan: sorted.length,
      });
    });

    return result.sort((a, b) => a.tanggalBayar - b.tanggalBayar);
  }, [listRiwayatIuran, filterBulan, filterTahun]);

  const formatPeriodeIuran = (bulanMulai, tahunMulai, bulanAkhir, tahunAkhir) => {
    if (bulanMulai === bulanAkhir && Number(tahunMulai) === Number(tahunAkhir)) {
      return `${bulanMulai} ${tahunMulai}`;
    }
    if (Number(tahunMulai) === Number(tahunAkhir)) {
      return `${bulanMulai} – ${bulanAkhir} ${tahunMulai}`;
    }
    return `${bulanMulai} ${tahunMulai} – ${bulanAkhir} ${tahunAkhir}`;
  };

  // Fungsi Cetak Laporan
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* HEADER & ACTION BUTTONS */}
      <div className="flex justify-between items-center print:hidden">
        <button onClick={() => setActiveView('menu')} className="text-sm text-amber-700 font-bold hover:underline bg-amber-50 hover:bg-amber-100 transition-colors px-5 py-2.5 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Kembali ke Menu
        </button>
        
        <button onClick={handlePrintPDF} className="text-sm text-blue-700 font-bold hover:underline bg-blue-50 hover:bg-blue-100 transition-colors px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Cetak PDF
        </button>
      </div>

      {/* HEADER CETAK PDF (Hanya muncul saat print) */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-gray-800 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-wider">Laporan Buku Kas Umum RT</h1>
        <p className="text-lg font-medium mt-1">Periode: {filterBulan} {filterTahun}</p>
      </div>

      {/* INFO PEMBAYARAN IURAN DIMUKA (hanya informasi, tidak mempengaruhi saldo bulan ini) */}
      {pembayaranDimukaBulanIni.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden print:border-gray-400 print:bg-transparent print:rounded-none print:mb-6">
          <div className="px-5 py-4 border-b border-blue-200 print:border-gray-400 bg-blue-100/60 print:bg-gray-100">
            <h3 className="text-sm font-black text-blue-900 print:text-black uppercase tracking-wide">
              Warga Sudah Bayar Iuran Dimuka (Lebih dari 1 Bulan)
            </h3>
            <p className="text-xs text-blue-700 print:text-gray-700 mt-1 font-medium">
              Daftar berikut hanya informasi kepatuhan iuran bulan {filterBulan} {filterTahun}. Pemasukan sudah tercatat di bulan pembayaran dan tidak dihitung ulang pada saldo bulan ini.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-blue-800 print:text-black border-b border-blue-200 print:border-gray-400">
                  <th className="py-2.5 px-4 font-bold w-10">No</th>
                  <th className="py-2.5 px-4 font-bold">Nama Warga</th>
                  <th className="py-2.5 px-4 font-bold">Tanggal Bayar</th>
                  <th className="py-2.5 px-4 font-bold">Periode Iuran</th>
                  <th className="py-2.5 px-4 font-bold text-center">Jumlah Bulan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100 print:divide-gray-300">
                {pembayaranDimukaBulanIni.map((item, index) => (
                  <tr key={item.id} className="text-gray-800 print:text-black">
                    <td className="py-2.5 px-4 font-medium text-gray-500 print:text-black">{index + 1}</td>
                    <td className="py-2.5 px-4 font-bold">{item.nama}</td>
                    <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                      {item.tanggalBayar.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      {formatPeriodeIuran(item.bulanMulai, item.tahunMulai, item.bulanAkhir, item.tahunAkhir)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-center text-blue-800 print:text-black">
                      {item.jumlahBulan} bulan
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KOTAK FILTER & SUMMARY */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 print:shadow-none print:border-none print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-100 pb-5 mb-5 print:hidden">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Buku Kas Umum
          </h2>
          
          <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="bg-transparent border-none py-1.5 pl-3 pr-8 text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer outline-none">
              {DAFTAR_BULAN.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <span className="text-gray-300 py-1.5">|</span>
            <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))} className="bg-transparent border-none py-1.5 pl-3 pr-8 text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer outline-none">
               {[tahunSekarang + 1, tahunSekarang, tahunSekarang - 1].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-2">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 print:border-gray-400 print:bg-transparent">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 print:text-black">Saldo Bulan Lalu</p>
            <p className="text-lg font-black text-gray-700 print:text-black">Rp {laporanBulanIni.saldoAwal.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-200 print:border-gray-400 print:bg-transparent">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1 print:text-black">Masuk Bulan Ini</p>
            <p className="text-lg font-black text-green-700 print:text-black">+ Rp {laporanBulanIni.totalMasukBulanIni.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-200 print:border-gray-400 print:bg-transparent">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1 print:text-black">Keluar Bulan Ini</p>
            <p className="text-lg font-black text-red-700 print:text-black">- Rp {laporanBulanIni.totalKeluarBulanIni.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-amber-100 p-4 rounded-xl border border-amber-300 print:border-gray-800 print:bg-transparent">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1 print:text-black">Saldo Akhir</p>
            <p className="text-xl font-black text-amber-900 print:text-black">Rp {laporanBulanIni.saldoAkhir.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* TABEL LEDGER (BUKU KAS) */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-100 text-gray-500 text-[11px] uppercase tracking-wider border-b-2 border-gray-300 print:bg-gray-200 print:text-black print:border-black">
                <th className="py-3 px-4 font-bold w-32">Tanggal</th>
                <th className="py-3 px-4 font-bold">Keterangan</th>
                <th className="py-3 px-4 font-bold text-right text-green-600 print:text-black">Pemasukan</th>
                <th className="py-3 px-4 font-bold text-right text-red-600 print:text-black">Pengeluaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-gray-400 text-sm">
              
              {/* BARIS SALDO AWAL */}
              <tr className="bg-amber-50/50 print:bg-transparent border-b border-gray-200 print:border-gray-400">
                <td className="py-3 px-4 font-medium text-gray-500 print:text-black">01 {filterBulan}</td>
                <td className="py-3 px-4 font-bold text-gray-800 italic print:text-black">Saldo Kas Bulan Sebelumnya</td>
                <td className="py-3 px-4 font-bold text-right text-amber-700 print:text-black" colSpan="2">
                  Rp {laporanBulanIni.saldoAwal.toLocaleString('id-ID')}
                </td>
              </tr>

              {/* LOOPING DATA TRANSAKSI BULAN INI */}
              {laporanBulanIni.transaksi.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap print:text-black font-medium text-xs">
                    {item.tanggal.toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}
                  </td>
                  <td className="py-3 px-4 text-gray-800 font-medium print:text-black">
                    <div className="flex items-center gap-2">
                      {item.tipe === 'Masuk' ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 print:hidden"></span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 print:hidden"></span>
                      )}
                      <span>{item.keterangan}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-green-600 font-bold print:text-black">
                    {item.pemasukan > 0 ? `Rp ${item.pemasukan.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right text-red-600 font-bold print:text-black">
                    {item.pengeluaran > 0 ? `Rp ${item.pengeluaran.toLocaleString('id-ID')}` : '-'}
                  </td>
                </tr>
              ))}

              {laporanBulanIni.transaksi.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-gray-400 font-medium italic">
                    Belum ada arus kas (masuk/keluar) di periode {filterBulan} {filterTahun}.
                  </td>
                </tr>
              )}
            </tbody>
            
            {/* FOOTER TOTAL */}
            <tfoot className="bg-gray-100 border-t-2 border-gray-300 print:border-black print:bg-gray-200">
              <tr>
                <td colSpan="2" className="py-4 px-4 font-black text-right text-gray-800 print:text-black uppercase text-[11px] tracking-wider">
                  TOTAL MUTASI BULAN INI:
                </td>
                <td className="py-4 px-4 text-right font-black text-green-700 print:text-black whitespace-nowrap">
                  Rp {laporanBulanIni.totalMasukBulanIni.toLocaleString('id-ID')}
                </td>
                <td className="py-4 px-4 text-right font-black text-red-700 print:text-black whitespace-nowrap">
                  Rp {laporanBulanIni.totalKeluarBulanIni.toLocaleString('id-ID')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
    </div>
  );
}