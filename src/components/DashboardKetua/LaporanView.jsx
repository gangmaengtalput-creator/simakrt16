import React, { useState, useMemo, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

const supabase = getSupabaseClient();
// --- Konstanta Label Array ---
const arrEtnis = ['Aceh','Batak','Nias','Jawa','Banten','Cirebon','Betawi','Sunda','Bali','Ambon','Flores','Papua','Samawa','Melayu/Palembang','Minangkabau','Afrika','Australia','China','Amerika','Eropa','Arab','Lainnya'];
const arrFisik = ['Tuna Rungu','Tuna Wicara','Tuna Netra','Lumpuh','Sumbing','Cacat Kulit','Cacat Fisik Lainnya'];
const arrMental = ['Idiot','Gila','Stress','Autis'];
const arrIbadah = ['Jumlah Masjid','Langgar / Surau / Mushola','Gereja Kristen Protestan','Gereja Katholik','Wihara','Pura','Kelenteng'];
const arrOlahraga = ['Lapangan Sepak Bola','Lapangan Bulu Tangkis','Meja Pingpong','Lapangan Tenis','Lapangan Voli','Lapangan Golf','Lapangan Basket','Pusat Kebugaran','Gelanggang Remaja','Lapangan Futsal','Lain-lain'];
const arrKes1 = ['Rumah Sakit Umum','Puskesmas','Puskesmas Pembantu','Poliklinik / Balai Pengobatan','Apotik','Posyandu','Toko Obat','Balai Pengobatan Swasta','Gudang Menyimpan Obat','Rumah Praktek Dokter','Rumah Bersalin','Balai KIA','Rumah Sakit Mata','Dan lain-lain'];
const arrKes2 = ['Dokter Umum','Dokter Gigi','Dokter Spesialis','Paramedis','Dukun Bersalin terlatih','Bidan','Perawat','Dukun alternatif','Dokter Praktek','Laboratorium kesehatan'];
const arrPend = ['Gedung Kampus PTN','Gedung kampus PTS','Gedung SMA / sederajat','Gedung SMP / sederajat','Gedung SD / sederajat','Gedung TK','Tempat Bermain Anak','Lembaga Pendidikan Agama','Perpustakaan Keliling','Perpustakaan Kelurahan','Taman Bacaan','Taman Pendidikan Al-Quran'];
const arrEnergi = ['Listrik PLN','Diesel Umum','Genset Pribadi','Lampu Minyak Tanah / Jarak / Kelapa','Gas Alam','Elpiji','..............................'];
const arrHiburan = ['Jumlah Tempat Wisata','Hotel Bintang 5','Hotel Bintang 4','Hotel Bintang 3','Hotel Bintang 2','Hotel Bintang 1','Hotel Melati','Diskotik','Bilyard','Karaoke','Museum','Restoran','Bioskop','Mall/Plaza/Pusat Kebugaran'];
const arrBersih = ['Tempat Pembuangan Sementara (TPS)','Tempat Pembuangan Akhir (TPA)','Alat Penghancur Sampah','Jumlah Gerobak Sampah','Jumlah Tong Sampah','Satgas Kebersihan','Anggota Satgas Kebersihan','Jumlah Pemulung','Tempat Pengelolaan Sampah','Pengelolaan Sampah Lingkungan','Pengelola Sampah Lainnya'];

// ==========================================
// KOMPONEN UI HELPER (Dipindah ke luar agar tidak hilang fokus saat mengetik)
// ==========================================
const EditNum = ({ val, onChange }) => (
  <input type="number" value={val === 0 ? '' : val} onChange={e=>onChange(e.target.value)} className="w-full text-center bg-yellow-100 outline-none print:bg-transparent print:appearance-none focus:ring-1 focus:ring-blue-500 font-medium" />
);

const EditText = ({ val, onChange }) => (
  <input type="text" value={val||''} onChange={e=>onChange(e.target.value)} className="w-full text-center bg-yellow-100 outline-none print:bg-transparent focus:ring-1 focus:ring-blue-500 px-1 font-medium" />
);

const Table4 = ({ num, title, headers, rows, showTotal = true }) => (
  <div className="mb-4 print:mb-1">
    <div className="flex font-bold uppercase mb-1 print:text-[8pt]"><div className="w-8">{num}</div><div>{title}</div></div>
    <table className="w-full border-collapse border border-black text-[9pt] print:text-[8pt]">
      <thead>
        <tr className="font-bold text-center bg-gray-100">
          <th className="border border-black p-1 text-left pl-2">{headers[0]}</th>
          <th className="border border-black p-1 w-32">{headers[1]}</th>
          <th className="border border-black p-1 w-32">{headers[2]}</th>
          <th className="border border-black p-1 w-24">JUMLAH</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.isSub ? "bg-white" : "hover:bg-gray-50"}>
            <td className={`border border-black p-1 pl-2 ${r.isSub ? 'text-gray-600 pl-6' : ''}`}>{r.label}</td>
            <td className="border border-black p-1 text-center">{r.l}</td>
            <td className="border border-black p-1 text-center">{r.p}</td>
            <td className="border border-black p-1 text-center font-bold bg-gray-50">{r.j}</td>
          </tr>
        ))}
        {showTotal && (
          <tr className="font-bold bg-gray-100">
            <td className="border border-black p-1 pl-2 text-right pr-2">Jumlah Total</td>
            <td className="border border-black p-1 text-center">{rows.reduce((a,c)=>a+(Number(c.lVal !== undefined ? c.lVal : c.l)||0),0)}</td>
            <td className="border border-black p-1 text-center">{rows.reduce((a,c)=>a+(Number(c.pVal !== undefined ? c.pVal : c.p)||0),0)}</td>
            <td className="border border-black p-1 text-center">{rows.reduce((a,c)=>a+(Number(c.jVal !== undefined ? c.jVal : c.j)||0),0)}</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const Table2 = ({ num, title, headers, rows }) => (
  <div className="mb-4 print:mb-1">
    <div className="flex font-bold uppercase mb-1 print:text-[8pt]"><div className="w-8">{num}</div><div>{title}</div></div>
    <table className="w-full border-collapse border border-black text-[9pt] print:text-[8pt]">
      <thead>
        <tr className="font-bold text-center bg-gray-100">
          <th className="border border-black p-1 w-10">NO</th>
          <th className="border border-black p-1 text-left pl-2">{headers[0]}</th>
          <th className="border border-black p-1 w-48">{headers[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="border border-black p-1 text-center">{i+1}</td>
            <td className="border border-black p-1 pl-2">{r.label}</td>
            <td className="border border-black p-1 text-center">{r.val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// PROPS DIPERBAIKI: Mengembalikan 'dataWarga' yang terhapus
export default function LaporanView({ setActiveView, dataWarga }) {
  const [subView, setSubView] = useState('menu'); 
  const tahunSekarang = new Date().getFullYear().toString();
  const [periodeDataDasar, setPeriodeDataDasar] = useState(`JANUARI - MARET ${tahunSekarang}`);
  
  // ==========================================
  // STATE MANUAL & AUTOSAVE LOKAL
  // ==========================================
  const [manual, setManual] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('rt_triwulan_data') : null;
    if (saved) { try { const parsed = JSON.parse(saved); parsed.tahun = tahunSekarang; return parsed; } catch(e){} }
    return {
      bulan: 'JANUARI - MARET', tahun: tahunSekarang, nama_rt: 'GUNTUR BAYU JANTORO',
      batasUtara: 'RT 15', batasSelatan: 'RT 17', batasTimur: 'RT 17', batasBarat: 'RT 15',
      mutasiLahir: 0, mutasiMati: 0, mutasiDatang: 0,
      cacatFisik: Array(7).fill({l:0, p:0}), cacatMental: Array(4).fill({l:0, p:0}),
      kewarganegaraanWNA: {l:0, p:0}, kewarganegaraanDwi: {l:0, p:0},
      ibadah: Array(7).fill(0), olahraga: Array(11).fill(0), kesehatanPrasarana: Array(14).fill(0), kesehatanSarana: Array(10).fill(0),
      pendidikanSewa: Array(12).fill(0), pendidikanMilik: Array(12).fill(0), energi: Array(7).fill(0), hiburan: Array(14).fill(0), kebersihan: Array(11).fill('')
    };
  });

  useEffect(() => { localStorage.setItem('rt_triwulan_data', JSON.stringify(manual)); }, [manual]);

  const updateManual = (key, val) => setManual(p => ({...p, [key]: val}));
  const updateArrObj = (key, idx, prop, val) => setManual(p => { const arr = [...p[key]]; arr[idx] = {...arr[idx], [prop]: Number(val)||0}; return {...p, [key]: arr}; });
  const updateArr = (key, idx, val) => setManual(p => { const arr = [...p[key]]; arr[idx] = val; return {...p, [key]: arr}; });
  const updateObjProp = (key, prop, val) => setManual(p => ({...p, [key]: {...p[key], [prop]: Number(val)||0}}));

  const getTanggalLaporanTriwulan = (periodeBulan, tahun) => {
    const y = parseInt(tahun) || new Date().getFullYear();
    let tglAkhir = new Date(y, 2, 31);
    if(periodeBulan === 'APRIL - JUNI') tglAkhir = new Date(y, 5, 30);
    if(periodeBulan === 'JULI - SEPTEMBER') tglAkhir = new Date(y, 8, 30);
    if(periodeBulan === 'OKTOBER - DESEMBER') tglAkhir = new Date(y, 11, 31);
    return tglAkhir.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase().replace(',', ' /');
  };
  const tanggalLaporanOtomatis = getTanggalLaporanTriwulan(manual.bulan, manual.tahun);

  // ==========================================
  // DATA WARGA & PERHITUNGAN OTOMATIS
  // ==========================================
  const [dataWargaLokal, setDataWargaLokal] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fallback: Jika Parent mengirim dataWarga, pakai. Jika tidak, fetch manual.
  useEffect(() => { 
    if (!dataWarga || dataWarga.length === 0) fetchWargaLokal(); 
  }, [dataWarga]);

  const fetchWargaLokal = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('master_warga').select('*');
    if (data) setDataWargaLokal(data);
    setIsLoading(false);
  };

  const finalDataWarga = (dataWarga && dataWarga.length > 0) ? dataWarga : dataWargaLokal;

  const dataDasarSorted = useMemo(() => {
    const bobot = { 'KEPALA KELUARGA': 1, 'ISTRI': 2, 'ANAK': 3 };
    return [...finalDataWarga].filter(w => w.status_warga?.toLowerCase() === 'aktif').sort((a, b) => {
      const kkA = a.no_kk ? String(a.no_kk) : ''; const kkB = b.no_kk ? String(b.no_kk) : '';
      if (kkA !== kkB) return kkA.localeCompare(kkB);
      return (bobot[a.status_kk?.toUpperCase()] || 99) - (bobot[b.status_kk?.toUpperCase()] || 99);
    });
  }, [finalDataWarga]);

  const stats = useMemo(() => {
    const aktif = finalDataWarga.filter(w => w.status_warga?.toLowerCase() === 'aktif');
    const isLaki = w => String(w.jenis_kelamin).toUpperCase().startsWith('L');
    const isPr = w => String(w.jenis_kelamin).toUpperCase().startsWith('P');
    
    const hitungUmur = (dob) => {
      if (!dob) return -1; const today = new Date(); const birth = new Date(dob);
      let age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
      return age;
    };

    const fmtLPJ = (arr) => ({ l: arr.filter(isLaki).length, p: arr.filter(isPr).length, j: arr.length });
    const cUmur = (min, max) => fmtLPJ(aktif.filter(w => hitungUmur(w.tgl_lahir) >= min && hitungUmur(w.tgl_lahir) <= max));
    const cEdu = (kunci) => fmtLPJ(aktif.filter(w => String(w.pendidikan).toUpperCase().includes(kunci)));
    const cPek = (kunci) => fmtLPJ(aktif.filter(w => String(w.pekerjaan).toUpperCase().includes(kunci)));
    const cAgama = (kunci) => fmtLPJ(aktif.filter(w => String(w.agama).toUpperCase().includes(kunci)));

    // TENAGA KERJA
    const tk_0_6 = cUmur(0, 6);
    const tk_7_18 = cUmur(7, 18);
    const tk_7_18_sekolah = fmtLPJ(aktif.filter(w => hitungUmur(w.tgl_lahir) >= 7 && hitungUmur(w.tgl_lahir) <= 18 && String(w.pekerjaan).toUpperCase().includes('PELAJAR')));
    const p19_56 = aktif.filter(w => hitungUmur(w.tgl_lahir) >= 19 && hitungUmur(w.tgl_lahir) <= 56);
    const tk_19_56 = fmtLPJ(p19_56);
    const tk_19_56_kerja = fmtLPJ(p19_56.filter(w => !String(w.pekerjaan).toUpperCase().match(/(BELUM|TIDAK BEKERJA|PELAJAR|MAHASISWA|MENGURUS RUMAH)/)));
    const tk_19_56_belum = fmtLPJ(p19_56.filter(w => String(w.pekerjaan).toUpperCase().match(/(BELUM|TIDAK BEKERJA|PELAJAR|MAHASISWA|MENGURUS RUMAH)/)));
    const tk_57_plus = cUmur(57, 999);

    // KUALITAS ANGKATAN KERJA
    const ak_pt = fmtLPJ(p19_56.filter(w => String(w.pendidikan).toUpperCase().match(/(D1|D2|D3|D4|S1|S2|S3|DIPLOMA|SARJANA|AKADEMI|UNIVERSITAS)/)));
    const ak_sma = fmtLPJ(p19_56.filter(w => String(w.pendidikan).toUpperCase().match(/(SMA|SMK|SLTA|ALIYAH|STM|SMEA)/) && !String(w.pendidikan).toUpperCase().match(/(D1|D2|D3|D4|S1|S2|S3|DIPLOMA|SARJANA|AKADEMI|UNIVERSITAS)/)));
    const ak_smp = fmtLPJ(p19_56.filter(w => String(w.pendidikan).toUpperCase().match(/(SMP|SLTP|MTS)/) && !String(w.pendidikan).toUpperCase().match(/(SMA|SMK|SLTA|ALIYAH|STM|SMEA|D1|D2|D3|D4|S1|S2|S3|DIPLOMA|SARJANA|AKADEMI|UNIVERSITAS)/)));
    const ak_sd = fmtLPJ(p19_56.filter(w => String(w.pendidikan).toUpperCase().match(/(SD|MI|SEKOLAH DASAR)/) && !String(w.pendidikan).toUpperCase().match(/(SMP|SLTP|MTS|SMA|SMK|SLTA|ALIYAH|STM|SMEA|D1|D2|D3|D4|S1|S2|S3|DIPLOMA|SARJANA|AKADEMI|UNIVERSITAS|TIDAK|BELUM)/)));
    const ak_tidak = fmtLPJ(p19_56.filter(w => {
       const p = String(w.pendidikan).toUpperCase();
       if(p.match(/(TIDAK|BELUM)/)) return true;
       if(!p.match(/(SD|MI|SEKOLAH DASAR|SMP|SLTP|MTS|SMA|SMK|SLTA|ALIYAH|STM|SMEA|D1|D2|D3|D4|S1|S2|S3|DIPLOMA|SARJANA|AKADEMI|UNIVERSITAS)/)) return true;
       return false;
    }));

    // ETNIS (OTOMATIS)
    const etnisStats = arrEtnis.map(() => ({ l: 0, p: 0, j: 0 }));
    aktif.forEach(w => {
      if (!w.etnis) return;
      let idx = arrEtnis.findIndex(e => e.toLowerCase() === w.etnis.toLowerCase());
      if (idx === -1) idx = arrEtnis.length - 1; 

      const LakiLaki = String(w.jenis_kelamin).toUpperCase().startsWith('L');
      if (LakiLaki) etnisStats[idx].l++; else etnisStats[idx].p++;
      etnisStats[idx].j++;
    });

    return {
      totL: aktif.filter(isLaki).length, totP: aktif.filter(isPr).length, totJ: aktif.length,
      kk: new Set(aktif.map(w => w.no_kk).filter(Boolean)).size,
      pindah: finalDataWarga.filter(w => w.status_warga?.toLowerCase() === 'pindah' || w.status_warga?.toLowerCase() === 'mantan').length,
      umur: { u0_5: cUmur(0,5), u6_10: cUmur(6,10), u11_17: cUmur(11,17), u18_60: cUmur(18,60), u60p: cUmur(61,999) },
      etnis: etnisStats,
      pendidikan: { 
        sd: cEdu('SD'), smp: { l: cEdu('SMP').l + cEdu('SLTP').l, p: cEdu('SMP').p + cEdu('SLTP').p, j: cEdu('SMP').j + cEdu('SLTP').j }, 
        sma: { l: cEdu('SMA').l + cEdu('SMK').l + cEdu('SLTA').l, p: cEdu('SMA').p + cEdu('SMK').p + cEdu('SLTA').p, j: cEdu('SMA').j + cEdu('SMK').j + cEdu('SLTA').j }, 
        d: { l: cEdu('D1').l + cEdu('D2').l + cEdu('D3').l + cEdu('DIPLOMA').l, p: cEdu('D1').p + cEdu('D2').p + cEdu('D3').p + cEdu('DIPLOMA').p, j: cEdu('D1').j + cEdu('D2').j + cEdu('D3').j + cEdu('DIPLOMA').j }, 
        s1: { l: cEdu('S1').l + cEdu('SARJANA').l, p: cEdu('S1').p + cEdu('SARJANA').p, j: cEdu('S1').j + cEdu('SARJANA').j }, 
        s23: { l: cEdu('S2').l + cEdu('S3').l, p: cEdu('S2').p + cEdu('S3').p, j: cEdu('S2').j + cEdu('S3').j } 
      },
      pekerjaan: {
        pns: { l: cPek('PNS').l+cPek('PEGAWAI NEGERI').l, p: cPek('PNS').p+cPek('PEGAWAI NEGERI').p, j: cPek('PNS').j+cPek('PEGAWAI NEGERI').j },
        tni: { l: cPek('TNI').l+cPek('POLRI').l, p: cPek('TNI').p+cPek('POLRI').p, j: cPek('TNI').j+cPek('POLRI').j },
        swasta: cPek('SWASTA'), buruh: cPek('BURUH'), tani: cPek('TANI'), dagang: cPek('DAGANG'), irt: cPek('MENGURUS RUMAH'),
        belum: { l: cPek('BELUM').l+cPek('PELAJAR').l+cPek('MAHASISWA').l, p: cPek('BELUM').p+cPek('PELAJAR').p+cPek('MAHASISWA').p, j: cPek('BELUM').j+cPek('PELAJAR').j+cPek('MAHASISWA').j }
      },
      agama: { islam: cAgama('ISLAM'), kristen: cAgama('KRISTEN'), katolik: cAgama('KATOLIK'), hindu: cAgama('HINDU'), budha: cAgama('BUDHA'), khonghucu: cAgama('KHONGHUCU') },
      tk: { u0_6: tk_0_6, u7_18: tk_7_18, u7_18_sekolah: tk_7_18_sekolah, u19_56: tk_19_56, u19_56_kerja: tk_19_56_kerja, u19_56_belum: tk_19_56_belum, u57_plus: tk_57_plus },
      ak: { tidak_sd: ak_tidak, sd: ak_sd, smp: ak_smp, sma: ak_sma, pt: ak_pt }
    };
  }, [finalDataWarga]);

  // ==========================================
  // EXPORT KE EXCEL (CSV GENERATOR)
  // ==========================================
  const exportDataDasarExcel = () => {
    let csv = "NO,NOMOR KARTU KELUARGA,NIK,NAMA,JENIS KELAMIN,TEMPAT LAHIR,TGL/BLN/TH LAHIR,AGAMA,ALAMAT,PENDIDIKAN,PEKERJAAN,STATUS HUBUNGAN DALAM KELUARGA\n";
    dataDasarSorted.forEach((w, i) => {
      const jk = String(w.jenis_kelamin).toUpperCase().startsWith('L') ? 'LAKI-LAKI' : 'PEREMPUAN';
      const tgl = w.tgl_lahir ? new Date(w.tgl_lahir).toLocaleDateString('id-ID') : '-';
      const alamat = `"${String(w.alamat).replace(/"/g, '""')}"`;
      csv += `${i+1},'${w.no_kk},'${w.nik},"${w.nama}",${jk},"${w.tempat_lahir}",${tgl},${w.agama},${alamat},${w.pendidikan},"${w.pekerjaan}",${w.status_kk}\n`;
    });
    triggerDownload(csv, `Data_Dasar_Keluarga_RT16_${periodeDataDasar}.csv`);
  };

  const exportTriwulanExcel = () => {
    const row = (arr) => arr.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    let csv = "";
    csv += row(['','','','','','','','','','','']);
    csv += row(['HARI / TANGGAL LAPORAN','','',':', tanggalLaporanOtomatis]);
    csv += row(['BULAN','','',':', manual.bulan]);
    csv += row(['TAHUN','','',':', manual.tahun]);
    csv += row(['NAMA KETUA RT','','',':', manual.nama_rt]);
    csv += row(['JABATAN','','',':', 'KETUA RT 16']);
    csv += row(['ALAMAT','','',':', 'JL KAPTEN ROBANI KADIR LRG MAENG NO 06 RT 016 RW 004']);
    csv += row(['KELURAHAN','','',':', 'TALANG PUTRI']);
    csv += row(['KECAMATAN','','',':', 'PLAJU']);
    csv += row([]);
    
    csv += row(['I.','BATAS WILAYAH RT']);
    csv += row(['','a','UTARA',':', manual.batasUtara]);
    csv += row(['','b','SELATAN',':', manual.batasSelatan]);
    csv += row(['','c','TIMUR',':', manual.batasTimur]);
    csv += row(['','d','BARAT',':', manual.batasBarat]);
    
    csv += row(['II.','DATA PENDUDUK']);
    csv += row(['','a','JUMLAH PENDUDUK',':', stats.totJ, 'ORANG']);
    csv += row(['','b','JUMLAH PENDUDUK LAKI-LAKI',':', stats.totL, 'ORANG']);
    csv += row(['','c','JUMLAH PENDUDUK PEREMPUAN',':', stats.totP, 'ORANG']);
    csv += row(['','d','JUMLAH KEPALA KELUARGA',':', stats.kk, 'KK']);
    csv += row(['','e','JUMLAH KELAHIRAN BULAN INI',':', manual.mutasiLahir, 'ORANG']);
    csv += row(['','f','JUMLAH KEMATIAN BULAN INI',':', manual.mutasiMati, 'ORANG']);
    csv += row(['','g','JUMLAH PENDUDUK DATANG BULAN INI',':', manual.mutasiDatang, 'ORANG']);
    csv += row(['','h','JUMLAH PENDUDUK PINDAH BULAN INI',':', stats.pindah, 'ORANG']);
    
    csv += row(['III.','DATA KELOMPOK UMUR']);
    csv += row(['','a','USIA 0 - 5 TAHUN',':', stats.umur.u0_5.j, 'ORANG']);
    csv += row(['','b','USIA 6 - 10 TAHUN',':', stats.umur.u6_10.j, 'ORANG']);
    csv += row(['','c','USIA 11 - 17 TAHUN',':', stats.umur.u11_17.j, 'ORANG']);
    csv += row(['','d','USIA 18 - 60 TAHUN',':', stats.umur.u18_60.j, 'ORANG']);
    csv += row(['','e','USIA 60 TAHUN KE ATAS',':', stats.umur.u60p.j, 'ORANG']);
    csv += row(['','JUMLAH','','', stats.totJ, 'ORANG']);
    
    csv += row(['IV.','DATA PENDIDIKAN DAN PEKERJAAN']);
    csv += row(['TINGKAT PENDIDIKAN','','','','LAKI-LAKI (ORANG)','PEREMPUAN (ORANG)','JUMLAH']);
    csv += row(['1','Usia 3 - 6 tahun yang belum masuk TK','','', 0, 0, 0]);
    csv += row(['2','Usia 3 - 6 tahun yang sedang TK / Playgrup','','', 0, 0, 0]);
    csv += row(['3','Usia 7 - 18 tahun yang tidak pernah sekolah','','', 0, 0, 0]);
    csv += row(['4','Usia 7 - 18 tahun yang sedang sekolah','','', 0, 0, 0]);
    csv += row(['5','Usia 18 - 56 tahun tidak pernah sekolah','','', 0, 0, 0]);
    csv += row(['6','Usia 18 - 56 tahun tidak tamat SD','','', 0, 0, 0]);
    csv += row(['7','Usia 18 - 56 tahun tidak tamat SLTP','','', 0, 0, 0]);
    csv += row(['8','Usia 18 - 56 tahun tidak tamat SLTA','','', 0, 0, 0]);
    csv += row(['9','Tamat SD / sederajat','','', stats.pendidikan.sd.l, stats.pendidikan.sd.p, stats.pendidikan.sd.j]);
    csv += row(['10','Tamat SMP / sederajat','','', stats.pendidikan.smp.l, stats.pendidikan.smp.p, stats.pendidikan.smp.j]);
    csv += row(['11','Tamat SMA / sederajat','','', stats.pendidikan.sma.l, stats.pendidikan.sma.p, stats.pendidikan.sma.j]);
    csv += row(['12','Tamat D-1 / sederajat','','', 0, 0, 0]);
    csv += row(['13','Tamat D-2 / sederajat','','', 0, 0, 0]);
    csv += row(['14','Tamat D-3 / sederajat','','', stats.pendidikan.d.l, stats.pendidikan.d.p, stats.pendidikan.d.j]);
    csv += row(['15','Tamat S-1 / sederajat','','', stats.pendidikan.s1.l, stats.pendidikan.s1.p, stats.pendidikan.s1.j]);
    csv += row(['16','Tamat S-2 / sederajat','','', stats.pendidikan.s23.l, stats.pendidikan.s23.p, stats.pendidikan.s23.j]);
    csv += row(['17','Tamat S-3 / sederajat','','', 0, 0, 0]);
    csv += row(['18','Tamat SLB A','','', 0, 0, 0]);
    csv += row(['19','Tamat SLB B','','', 0, 0, 0]);
    csv += row(['20','Tamat SLB C','','', 0, 0, 0]);
    csv += row(['','Jumlah Total Penduduk','','', stats.totL, stats.totP, stats.totJ]);
    csv += row([]);
    
    csv += row(['JENIS PEKERJAAN','','','','LAKI-LAKI (ORANG)','PEREMPUAN (ORANG)','JUMLAH']);
    csv += row(['1','Petani','','', stats.pekerjaan.tani.l, stats.pekerjaan.tani.p, stats.pekerjaan.tani.j]);
    csv += row(['2','Buruh Tani','','', 0, 0, 0]);
    csv += row(['3','Buruh Migran Perempuan','','', 0, 0, 0]);
    csv += row(['4','Buruh Migran Laki-laki','','', 0, 0, 0]);
    csv += row(['5','Pegawai Negeri Sipil','','', stats.pekerjaan.pns.l, stats.pekerjaan.pns.p, stats.pekerjaan.pns.j]);
    csv += row(['6','Pengrajin Industri Rumah Tangga','','', 0, 0, 0]);
    csv += row(['7','Pedagang Keliling','','', stats.pekerjaan.dagang.l, stats.pekerjaan.dagang.p, stats.pekerjaan.dagang.j]);
    csv += row(['8','Peternak','','', 0, 0, 0]);
    csv += row(['9','Dokter Swasta','','', 0, 0, 0]);
    csv += row(['10','Bidan Swasta','','', 0, 0, 0]);
    csv += row(['11','Pensiunan TNI / POLRI','','', stats.pekerjaan.tni.l, stats.pekerjaan.tni.p, stats.pekerjaan.tni.j]);
    csv += row(['12','Ibu Rumah Tangga','','', stats.pekerjaan.irt.l, stats.pekerjaan.irt.p, stats.pekerjaan.irt.j]);
    csv += row(['13','Wiraswasta / Lainnya','','', stats.pekerjaan.swasta.l, stats.pekerjaan.swasta.p, stats.pekerjaan.swasta.j]);
    csv += row(['','Jumlah Total Penduduk','','', stats.totL, stats.totP, stats.totJ]);
    csv += row([]);

    csv += row(['V.','AGAMA / ALIRAN KEPERCAYAAN']);
    csv += row(['AGAMA','','','','LAKI-LAKI (ORANG)','PEREMPUAN (ORANG)','JUMLAH']);
    csv += row(['1','Islam','','', stats.agama.islam.l, stats.agama.islam.p, stats.agama.islam.j]);
    csv += row(['2','Kristen','','', stats.agama.kristen.l, stats.agama.kristen.p, stats.agama.kristen.j]);
    csv += row(['3','Katholik','','', stats.agama.katolik.l, stats.agama.katolik.p, stats.agama.katolik.j]);
    csv += row(['4','Hindu','','', stats.agama.hindu.l, stats.agama.hindu.p, stats.agama.hindu.j]);
    csv += row(['5','Budha','','', stats.agama.budha.l, stats.agama.budha.p, stats.agama.budha.j]);
    csv += row(['6','Khonghucu','','', stats.agama.khonghucu.l, stats.agama.khonghucu.p, stats.agama.khonghucu.j]);
    csv += row(['7','Aliran Kepercayaan','','', 0, 0, 0]);
    csv += row(['','Jumlah Total','','', stats.totL, stats.totP, stats.totJ]);
    csv += row([]);

    csv += row(['VI.','KEWARGANEGARAAN']);
    csv += row(['KEWARGANEGARAAN','','','','LAKI-LAKI (ORANG)','PEREMPUAN (ORANG)','JUMLAH']);
    csv += row(['1','Warga Negara Indonesia','','', stats.totL, stats.totP, stats.totJ]);
    csv += row(['2','Warga Negara Asing','','', manual.kewarganegaraanWNA.l, manual.kewarganegaraanWNA.p, manual.kewarganegaraanWNA.l+manual.kewarganegaraanWNA.p]);
    csv += row(['3','Dwi Kewarganegaraan','','', manual.kewarganegaraanDwi.l, manual.kewarganegaraanDwi.p, manual.kewarganegaraanDwi.l+manual.kewarganegaraanDwi.p]);
    csv += row(['','Jumlah Total','','', stats.totL, stats.totP, stats.totJ]);
    csv += row([]);

    csv += row(['VII.','ETNIS']);
    csv += row(['ETNIS','','','','LAKI-LAKI (ORANG)','PEREMPUAN (ORANG)','JUMLAH']);
    arrEtnis.forEach((nama, i) => {
      csv += row([i+1, nama, '', '', stats.etnis[i].l, stats.etnis[i].p, stats.etnis[i].j]);
    });
    csv += row([]);

    csv += row(['VIII.','CACAT MENTAL DAN FISIK']);
    csv += row(['JENIS CACAT FISIK','','','','LAKI-LAKI (ORANG)','PEREMPUAN (ORANG)','JUMLAH']);
    arrFisik.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.cacatFisik[i].l, manual.cacatFisik[i].p, manual.cacatFisik[i].l+manual.cacatFisik[i].p]); });
    csv += row([]);
    csv += row(['JENIS CACAT MENTAL','','','','LAKI-LAKI (ORANG)','PEREMPUAN (ORANG)','JUMLAH']);
    arrMental.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.cacatMental[i].l, manual.cacatMental[i].p, manual.cacatMental[i].l+manual.cacatMental[i].p]); });
    csv += row([]);

    csv += row(['IX.','TENAGA KERJA']);
    csv += row(['TENAGA KERJA','','','','LAKI-LAKI (ORANG)','PEREMPUAN (ORANG)','JUMLAH']);
    csv += row(['1','Penduduk Usia 0 - 6 Tahun','','', stats.tk.u0_6.l, stats.tk.u0_6.p, stats.tk.u0_6.j]);
    csv += row(['2','Penduduk Usia 7 - 18 tahun','','', stats.tk.u7_18.l, stats.tk.u7_18.p, stats.tk.u7_18.j]);
    csv += row(['3','Penduduk Usia 19 - 56 tahun (a+b)','','', stats.tk.u19_56.l, stats.tk.u19_56.p, stats.tk.u19_56.j]);
    csv += row(['','a. Usia 19 - 56 tahun yang bekerja','','', stats.tk.u19_56_kerja.l, stats.tk.u19_56_kerja.p, stats.tk.u19_56_kerja.j]);
    csv += row(['','b. Usia 19 - 56 thn belum / tidak bekerja','','', stats.tk.u19_56_belum.l, stats.tk.u19_56_belum.p, stats.tk.u19_56_belum.j]);
    csv += row(['4','Penduduk usia 56 tahun keatas','','', stats.tk.u57_plus.l, stats.tk.u57_plus.p, stats.tk.u57_plus.j]);
    csv += row(['','JUMLAH TOTAL PENDUDUK','','', stats.totL, stats.totP, stats.totJ]);
    csv += row([]);

    csv += row(['X.','KUALITAS ANGKATAN KERJA']);
    csv += row(['ANGKATAN KERJA','','','','LAKI-LAKI (ORANG)','PEREMPUAN (ORANG)','JUMLAH']);
    csv += row(['1','Penduduk usia 19-56 tahun tidak tamat SD','','', stats.ak.tidak_sd.l, stats.ak.tidak_sd.p, stats.ak.tidak_sd.j]);
    csv += row(['2','Penduduk usia 19-56 tahun tamat SD','','', stats.ak.sd.l, stats.ak.sd.p, stats.ak.sd.j]);
    csv += row(['3','Penduduk usia 19-56 tahun tamat SLTP','','', stats.ak.smp.l, stats.ak.smp.p, stats.ak.smp.j]);
    csv += row(['4','Penduduk usia 19-56 tahun tamat SLTA','','', stats.ak.sma.l, stats.ak.sma.p, stats.ak.sma.j]);
    csv += row(['5','Penduduk usia 19-56 thn tamat Perguruan Tinggi','','', stats.ak.pt.l, stats.ak.pt.p, stats.ak.pt.j]);
    csv += row(['','JUMLAH ANGKATAN KERJA USIA 19-56','','', stats.tk.u19_56.l, stats.tk.u19_56.p, stats.tk.u19_56.j]);
    csv += row([]);

    csv += row(['XI.','PRASARANA PERIBADATAN']);
    csv += row(['JENIS PRASARANA','','','','JUMLAH (BUAH)']);
    arrIbadah.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.ibadah[i]]); });
    csv += row([]);

    csv += row(['XII.','PRASARANA OLAHRAGA']);
    csv += row(['JENIS PRASARANA','','','','JUMLAH (BUAH)']);
    arrOlahraga.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.olahraga[i]]); });
    csv += row([]);

    csv += row(['XIII.','PRASARANA DAN SARANA KESEHATAN']);
    csv += row(['JENIS PRASARANA KESEHATAN','','','','JUMLAH (UNIT)']);
    arrKes1.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.kesehatanPrasarana[i]]); });
    csv += row(['JENIS SARANA KESEHATAN','','','','JUMLAH (ORANG)']);
    arrKes2.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.kesehatanSarana[i]]); });
    csv += row([]);

    csv += row(['XIV.','PRASARANA PENDIDIKAN']);
    csv += row(['JENIS','','','','SEWA (BUAH)','MILIK SENDIRI (BUAH)']);
    arrPend.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.pendidikanSewa[i], manual.pendidikanMilik[i]]); });
    csv += row([]);

    csv += row(['XV.','PRASARANA ENERGI DAN PENERANGAN']);
    arrEnergi.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.energi[i], 'keluarga']); });
    csv += row([]);

    csv += row(['XVI.','PRASARANA HIBURAN DAN WISATA']);
    csv += row(['JENIS','','','','JUMLAH (BUAH)']);
    arrHiburan.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.hiburan[i]]); });
    csv += row([]);

    csv += row(['XVII.','PRASARANA DAN SARANA KEBERSIHAN']);
    arrBersih.forEach((nama, i) => { csv += row([i+1, nama, '', '', manual.kebersihan[i]]); });
    csv += row([]);

    csv += row(['','','','','','Palembang, ' + tanggalLaporanOtomatis.split(' / ')[1]]);
    csv += row(['','','','','','Ketua RT 16 RW 04']);
    csv += row([]);
    csv += row([]);
    csv += row(['','','','','', manual.nama_rt]);

    triggerDownload(csv, `Laporan_Triwulan_RT16_${manual.bulan}_${manual.tahun}.csv`);
  };

  const triggerDownload = (csvData, filename) => {
    const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto relative">
      <button onClick={() => subView === 'menu' ? setActiveView('menu') : setSubView('menu')} className="mb-4 print:hidden text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-4 py-2 rounded-lg">&larr; {subView === 'menu' ? 'Kembali ke Menu Utama' : 'Kembali'}</button>

      {/* ========================================== */}
      {/* MENU UTAMA                                 */}
      {/* ========================================== */}
      {subView === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => setSubView('data_dasar')} className="bg-white p-8 rounded-2xl shadow-sm border-l-4 border-blue-600 hover:shadow-md text-left">
            <h3 className="font-bold text-xl text-blue-800 mb-2">Data Dasar Keluarga</h3>
            <p className="text-sm text-gray-500">Tabel data individu (1 Lembar Fit Landscape).</p>
          </button>
          <button onClick={() => setSubView('triwulan')} className="bg-white p-8 rounded-2xl shadow-sm border-l-4 border-emerald-600 hover:shadow-md text-left">
            <h3 className="font-bold text-xl text-emerald-800 mb-2">Laporan Triwulan RT</h3>
            <p className="text-sm text-gray-500">Format Resmi Kelurahan Bab I - XVII (Portrait).</p>
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* LAPORAN DATA DASAR KELUARGA (FIT LANDSCAPE)*/}
      {/* ========================================== */}
      {subView === 'data_dasar' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row justify-between gap-4 print:hidden">
            <select value={periodeDataDasar} onChange={e=>setPeriodeDataDasar(e.target.value)} className="border p-2 rounded text-sm font-bold w-full sm:w-64 bg-gray-50 outline-none focus:ring-blue-500">
              <option value={`JANUARI - MARET ${tahunSekarang}`}>JANUARI - MARET {tahunSekarang}</option>
              <option value={`APRIL - JUNI ${tahunSekarang}`}>APRIL - JUNI {tahunSekarang}</option>
              <option value={`JULI - SEPTEMBER ${tahunSekarang}`}>JULI - SEPTEMBER {tahunSekarang}</option>
              <option value={`OKTOBER - DESEMBER ${tahunSekarang}`}>OKTOBER - DESEMBER {tahunSekarang}</option>
            </select>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button onClick={exportDataDasarExcel} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 w-full sm:w-auto text-center">📊 Export ke Excel</button>
              <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 w-full sm:w-auto text-center">🖨️ Cetak PDF</button>
            </div>
          </div>
          
          <div className="bg-white p-4 sm:p-8 shadow-sm border print:p-0 print:border-none print:shadow-none print-container">
             
             {/* ---- MODIFIKASI DIMULAI DI SINI: Pembungkus tabel scrollable ---- */}
             <div className="w-full overflow-x-auto pb-4">
                <div className="min-w-[1000px] print:min-w-full">
                  
                  <div className="mb-6 break-inside-avoid">
                    <h1 className="text-xl font-black underline tracking-wider text-center mb-6 uppercase">LAPORAN DATA DASAR KELUARGA</h1>
                    <div className="flex items-center justify-start gap-8 ml-2">
                      <img src="/logo-palembang.png" alt="Logo Palembang" className="w-24 h-24 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Lambang_Kota_Palembang.png/430px-Lambang_Kota_Palembang.png"; }} />
                      <div className="grid grid-cols-[90px_10px_1fr] gap-y-1 text-left uppercase font-bold text-[9pt] print:text-[10pt]">
                        <span>Kecamatan</span><span>:</span><span>Plaju</span>
                        <span>Kelurahan</span><span>:</span><span>Talangputri</span>
                        <span>RT / RW</span><span>:</span><span>016 / 004</span>
                        <span>Periode</span><span>:</span><span>{periodeDataDasar}</span>
                      </div>
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-black print-table-dasar text-[8.5pt] print:text-[7pt]">
                    <thead>
                      <tr className="bg-gray-100 uppercase font-bold text-center">
                        <th className="border border-black p-1 w-[3%]">No</th>
                        <th className="border border-black p-1 w-[12%]">No. KK</th>
                        <th className="border border-black p-1 w-[12%]">NIK</th>
                        <th className="border border-black p-1 w-[16%]">Nama Lengkap</th>
                        <th className="border border-black p-1 w-[3%]">L/P</th>
                        <th className="border border-black p-1 w-[9%]">Tempat Lhr</th>
                        <th className="border border-black p-1 w-[7%]">Tgl Lahir</th>
                        <th className="border border-black p-1 w-[6%]">Agama</th>
                        <th className="border border-black p-1 w-[12%]">Alamat</th>
                        <th className="border border-black p-1 w-[7%]">Pendidikan</th>
                        <th className="border border-black p-1 w-[7%]">Pekerjaan</th>
                        <th className="border border-black p-1 w-[6%]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataDasarSorted.map((w, i) => (
                        <tr key={w.nik || i}>
                          <td className="border border-black p-1 text-center">{i + 1}</td>
                          <td className="border border-black p-1 font-mono text-center leading-tight">{w.no_kk || '-'}</td>
                          <td className="border border-black p-1 font-mono text-center leading-tight">{w.nik || '-'}</td>
                          <td className="border border-black p-1 uppercase font-medium leading-tight">{w.nama || '-'}</td>
                          <td className="border border-black p-1 text-center">{String(w.jenis_kelamin).charAt(0)}</td>
                          <td className="border border-black p-1 uppercase text-center leading-tight">{w.tempat_lahir || '-'}</td>
                          <td className="border border-black p-1 text-center leading-tight">{w.tgl_lahir ? new Date(w.tgl_lahir).toLocaleDateString('id-ID') : '-'}</td>
                          <td className="border border-black p-1 uppercase text-center leading-tight">{w.agama || '-'}</td>
                          <td className="border border-black p-1 uppercase leading-tight print:text-[5.5pt]">{w.alamat || '-'}</td>
                          <td className="border border-black p-1 uppercase text-center leading-tight">{w.pendidikan || '-'}</td>
                          <td className="border border-black p-1 uppercase text-center leading-tight">{w.pekerjaan || '-'}</td>
                          <td className="border border-black p-1 uppercase font-bold text-center leading-tight">{w.status_kk || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="break-inside-avoid mt-8 flex justify-end w-full">
                    <div className="text-center w-64 uppercase font-bold print:text-[8pt] relative">
                      <p>Palembang, {tanggalLaporanOtomatis.split(' / ')[1] || new Date().toLocaleDateString('id-ID')}</p>
                      <p className="mb-6">Ketua RT.16 RW.04</p>
                      {/* TTD DATADASAR: Gambar TTD menggores teks */}
                      <div className="relative inline-block w-full">
                        <img src="/ttd-guntur.png" alt="Tanda Tangan" className="absolute left-1/2 -top-16 transform -translate-x-1/2 w-50 h-auto z-10 pointer-events-none opacity-90 mix-blend-multiply" />
                        <p className="relative z-0 underline underline-offset-2 mt-8">GUNTUR BAYU JANTORO</p>
                      </div>
                    </div>
                  </div>

                </div>
             </div>
             {/* ---- MODIFIKASI BERAKHIR DI SINI ---- */}

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* LAPORAN TRIWULAN (FORMAT EXCEL PORTRAIT)   */}
      {/* ========================================== */}
      {subView === 'triwulan' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
             <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <select value={manual.bulan} onChange={e=>updateManual('bulan', e.target.value)} className="border p-2 rounded text-xs font-bold w-full sm:w-48 bg-gray-50 outline-none focus:ring-emerald-500 cursor-pointer">
                  <option value="JANUARI - MARET">JANUARI - MARET</option>
                  <option value="APRIL - JUNI">APRIL - JUNI</option>
                  <option value="JULI - SEPTEMBER">JULI - SEPTEMBER</option>
                  <option value="OKTOBER - DESEMBER">OKTOBER - DESEMBER</option>
                </select>
                <div className="border p-2 rounded text-xs font-bold w-full sm:w-24 bg-gray-200 text-gray-500 cursor-not-allowed flex items-center justify-center">{manual.tahun}</div>
             </div>
             <div className="flex flex-col sm:flex-row gap-2 items-center w-full md:w-auto">
                <button onClick={exportTriwulanExcel} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 w-full sm:w-auto text-center">📊 Export ke Excel</button>
                <button onClick={() => window.print()} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-emerald-700 w-full sm:w-auto text-center">🖨️ Cetak PDF</button>
             </div>
          </div>

          <div className="bg-white p-10 shadow-sm border print:p-0 print:shadow-none print:border-none">
            {isLoading ? <p className="text-center py-10 font-bold">Memuat...</p> : (
              <div className="w-full text-[10pt] print:text-[8pt] leading-tight text-black font-sans print-container">
                
                {/* --- HALAMAN 1 --- */}
                <div className="print-page">
                  {/* KOP TRIWULAN DIPERBAIKI: Logo kiri, Text center & ukuran font disamakan */}
                  <div className="flex items-center mb-4 pb-2 border-b-2 border-black break-inside-avoid">
                    <img src="/logo-palembang.png" alt="Logo" className="w-20 h-20 object-contain flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Lambang_Kota_Palembang.png/430px-Lambang_Kota_Palembang.png"; }} />
                    <div className="flex-1 text-center uppercase tracking-wide pr-20">
                      <h1 className="text-2xl font-black leading-tight print:text-[16pt]">PEMERINTAH KOTA PALEMBANG</h1>
                      <h1 className="text-2xl font-black leading-tight print:text-[16pt]">LAPORAN TRIWULAN KETUA RT</h1>
                    </div>
                  </div>

                  <div className="mb-4 uppercase font-bold text-[10pt] print:text-[8pt] break-inside-avoid">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr><td className="w-64 pb-1">HARI / TANGGAL LAPORAN</td><td className="w-4 pb-1">:</td><td className="pb-1 text-blue-800 print:text-black">{tanggalLaporanOtomatis}</td></tr>
                        <tr><td className="pb-1">BULAN</td><td className="pb-1">:</td><td className="pb-1">{manual.bulan}</td></tr>
                        <tr><td className="pb-1">TAHUN</td><td className="pb-1">:</td><td className="pb-1">{manual.tahun}</td></tr>
                        <tr><td className="pb-1">NAMA KETUA RT</td><td className="pb-1">:</td><td className="pb-1">{manual.nama_rt}</td></tr>
                        <tr><td className="pb-1">JABATAN</td><td className="pb-1">:</td><td className="pb-1">KETUA RT 16</td></tr>
                        <tr><td className="pb-1">ALAMAT</td><td className="pb-1">:</td><td className="pb-1">JL KAPTEN ROBANI KADIR LRG MAENG NO 06 RT 016 RW 004</td></tr>
                        <tr><td className="pb-1">KELURAHAN</td><td className="pb-1">:</td><td className="pb-1">TALANG PUTRI</td></tr>
                        <tr><td className="pb-1">KECAMATAN</td><td className="pb-1">:</td><td className="pb-1">PLAJU</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mb-4 break-inside-avoid">
                    <div className="flex font-bold uppercase mb-1 print:text-[8pt]"><div className="w-8">I.</div><div>BATAS WILAYAH RT</div></div>
                    <table className="w-full pl-8 mb-4 border-collapse print:text-[8pt]"><tbody>
                      <tr><td className="w-8">a</td><td className="w-32">UTARA</td><td className="w-2">:</td><td className="w-32 font-bold"><EditText val={manual.batasUtara} onChange={v=>updateManual('batasUtara',v)} /></td><td></td></tr>
                      <tr><td>b</td><td>SELATAN</td><td>:</td><td className="font-bold"><EditText val={manual.batasSelatan} onChange={v=>updateManual('batasSelatan',v)} /></td><td></td></tr>
                      <tr><td>c</td><td>TIMUR</td><td>:</td><td className="font-bold"><EditText val={manual.batasTimur} onChange={v=>updateManual('batasTimur',v)} /></td><td></td></tr>
                      <tr><td>d</td><td>BARAT</td><td>:</td><td className="font-bold"><EditText val={manual.batasBarat} onChange={v=>updateManual('batasBarat',v)} /></td><td></td></tr>
                    </tbody></table>
                  </div>

                  <div className="mb-4 break-inside-avoid">
                    <div className="flex font-bold uppercase mb-1 print:text-[8pt]"><div className="w-8">II.</div><div>DATA PENDUDUK</div></div>
                    <table className="w-full pl-8 mb-4 border-collapse print:text-[8pt]"><tbody>
                      <tr><td className="w-8 pb-1">a</td><td className="w-64">JUMLAH PENDUDUK</td><td className="w-2">:</td><td className="w-20 text-center font-bold bg-gray-100">{stats.totJ}</td><td>ORANG</td></tr>
                      <tr><td className="pb-1">b</td><td>JUMLAH PENDUDUK LAKI-LAKI</td><td>:</td><td className="text-center font-bold bg-gray-100">{stats.totL}</td><td>ORANG</td></tr>
                      <tr><td className="pb-1">c</td><td>JUMLAH PENDUDUK PEREMPUAN</td><td>:</td><td className="text-center font-bold bg-gray-100">{stats.totP}</td><td>ORANG</td></tr>
                      <tr><td className="pb-1">d</td><td>JUMLAH KEPALA KELUARGA</td><td>:</td><td className="text-center font-bold bg-gray-100">{stats.kk}</td><td>KK</td></tr>
                      <tr><td className="pb-1">e</td><td>JUMLAH KELAHIRAN BULAN INI</td><td>:</td><td><EditNum val={manual.mutasiLahir} onChange={v=>updateManual('mutasiLahir',v)} /></td><td>ORANG</td></tr>
                      <tr><td className="pb-1">f</td><td>JUMLAH KEMATIAN BULAN INI</td><td>:</td><td><EditNum val={manual.mutasiMati} onChange={v=>updateManual('mutasiMati',v)} /></td><td>ORANG</td></tr>
                      <tr><td className="pb-1">g</td><td>JUMLAH PENDUDUK DATANG BULAN INI</td><td>:</td><td><EditNum val={manual.mutasiDatang} onChange={v=>updateManual('mutasiDatang',v)} /></td><td>ORANG</td></tr>
                      <tr><td className="pb-1">h</td><td>JUMLAH PENDUDUK PINDAH BULAN INI</td><td>:</td><td className="text-center font-bold bg-gray-100">{stats.pindah}</td><td>ORANG</td></tr>
                    </tbody></table>
                  </div>

                  <div className="mb-4 break-inside-avoid">
                    <div className="flex font-bold uppercase mb-1 print:text-[8pt]"><div className="w-8">III.</div><div>DATA KELOMPOK UMUR</div></div>
                    <table className="w-full pl-8 mb-4 border-collapse print:text-[8pt]"><tbody>
                      <tr><td className="w-8 pb-1">a</td><td className="w-64">USIA 0 - 5 TAHUN</td><td className="w-2">:</td><td className="w-20 text-center bg-gray-50">{stats.umur.u0_5.j}</td><td>ORANG</td></tr>
                      <tr><td className="pb-1">b</td><td>USIA 6 - 10 TAHUN</td><td>:</td><td className="text-center bg-gray-50">{stats.umur.u6_10.j}</td><td>ORANG</td></tr>
                      <tr><td className="pb-1">c</td><td>USIA 11 - 17 TAHUN</td><td>:</td><td className="text-center bg-gray-50">{stats.umur.u11_17.j}</td><td>ORANG</td></tr>
                      <tr><td className="pb-1">d</td><td>USIA 18 - 60 TAHUN</td><td>:</td><td className="text-center bg-gray-50">{stats.umur.u18_60.j}</td><td>ORANG</td></tr>
                      <tr><td className="pb-1">e</td><td>USIA 60 TAHUN KE ATAS</td><td>:</td><td className="text-center bg-gray-50">{stats.umur.u60p.j}</td><td>ORANG</td></tr>
                      <tr className="font-bold border-t border-black"><td colSpan={2} className="pt-1">JUMLAH</td><td className="pt-1">:</td><td className="text-center pt-1">{stats.totJ}</td><td className="pt-1">ORANG</td></tr>
                    </tbody></table>
                  </div>

                  <Table4 num="IV." title="DATA PENDIDIKAN DAN PEKERJAAN" headers={['TINGKAT PENDIDIKAN', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={[
                    { label: '1. Usia 3 - 6 tahun yang belum masuk TK', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '2. Usia 3 - 6 tahun yang sedang TK / Playgrup', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '3. Usia 7 - 18 tahun yang tidak pernah sekolah', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '4. Usia 7 - 18 tahun yang sedang sekolah', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '5. Usia 18 - 56 tahun tidak pernah sekolah', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '6. Usia 18 - 56 tahun tidak tamat SD', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '7. Usia 18 - 56 tahun tidak tamat SLTP', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '8. Usia 18 - 56 tahun tidak tamat SLTA', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '9. Tamat SD / sederajat', l: stats.pendidikan.sd.l, p: stats.pendidikan.sd.p, j: stats.pendidikan.sd.j, lVal: stats.pendidikan.sd.l, pVal: stats.pendidikan.sd.p, jVal: stats.pendidikan.sd.j },
                    { label: '10. Tamat SMP / sederajat', l: stats.pendidikan.smp.l, p: stats.pendidikan.smp.p, j: stats.pendidikan.smp.j, lVal: stats.pendidikan.smp.l, pVal: stats.pendidikan.smp.p, jVal: stats.pendidikan.smp.j },
                    { label: '11. Tamat SMA / sederajat', l: stats.pendidikan.sma.l, p: stats.pendidikan.sma.p, j: stats.pendidikan.sma.j, lVal: stats.pendidikan.sma.l, pVal: stats.pendidikan.sma.p, jVal: stats.pendidikan.sma.j },
                    { label: '12. Tamat D-1 / sederajat', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '13. Tamat D-2 / sederajat', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '14. Tamat D-3 / sederajat', l: stats.pendidikan.d.l, p: stats.pendidikan.d.p, j: stats.pendidikan.d.j, lVal: stats.pendidikan.d.l, pVal: stats.pendidikan.d.p, jVal: stats.pendidikan.d.j },
                    { label: '15. Tamat S-1 / sederajat', l: stats.pendidikan.s1.l, p: stats.pendidikan.s1.p, j: stats.pendidikan.s1.j, lVal: stats.pendidikan.s1.l, pVal: stats.pendidikan.s1.p, jVal: stats.pendidikan.s1.j }
                  ]} showTotal={false} />
                </div>

                {/* =========== BREAK 1: SETELAH S-1 =========== */}
                <div style={{ pageBreakAfter: 'always' }} className="print:block hidden"></div>
                {/* --- HALAMAN 2 --- */}

                <div className="print-page pt-4 print:pt-0">
                  <Table4 num="" title="" headers={['TINGKAT PENDIDIKAN', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={[
                    { label: '16. Tamat S-2 / sederajat', l: stats.pendidikan.s23.l, p: stats.pendidikan.s23.p, j: stats.pendidikan.s23.j, lVal: stats.pendidikan.s23.l, pVal: stats.pendidikan.s23.p, jVal: stats.pendidikan.s23.j },
                    { label: '17. Tamat S-3 / sederajat', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '18. Tamat SLB A', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '19. Tamat SLB B', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '20. Tamat SLB C', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: 'Jumlah Total Penduduk', l: stats.totL, p: stats.totP, j: stats.totJ, lVal: 0, pVal: 0, jVal: 0, bold: true }
                  ]} showTotal={false} />

                  <Table4 num="" title="" headers={['JENIS PEKERJAAN', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={[
                    { label: '1. Petani', l: stats.pekerjaan.tani.l, p: stats.pekerjaan.tani.p, j: stats.pekerjaan.tani.j, lVal: stats.pekerjaan.tani.l, pVal: stats.pekerjaan.tani.p, jVal: stats.pekerjaan.tani.j },
                    { label: '2. Buruh Tani', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '3. Buruh Migran Perempuan', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '4. Buruh Migran Laki-laki', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '5. Pegawai Negeri Sipil', l: stats.pekerjaan.pns.l, p: stats.pekerjaan.pns.p, j: stats.pekerjaan.pns.j, lVal: stats.pekerjaan.pns.l, pVal: stats.pekerjaan.pns.p, jVal: stats.pekerjaan.pns.j },
                    { label: '6. Pengrajin Industri Rumah Tangga', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '7. Pedagang Keliling', l: stats.pekerjaan.dagang.l, p: stats.pekerjaan.dagang.p, j: stats.pekerjaan.dagang.j, lVal: stats.pekerjaan.dagang.l, pVal: stats.pekerjaan.dagang.p, jVal: stats.pekerjaan.dagang.j },
                    { label: '8. Peternak', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '9. Dokter Swasta', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '10. Bidan Swasta', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 },
                    { label: '11. Pensiunan TNI / POLRI', l: stats.pekerjaan.tni.l, p: stats.pekerjaan.tni.p, j: stats.pekerjaan.tni.j, lVal: stats.pekerjaan.tni.l, pVal: stats.pekerjaan.tni.p, jVal: stats.pekerjaan.tni.j },
                    { label: '12. Ibu Rumah Tangga', l: stats.pekerjaan.irt.l, p: stats.pekerjaan.irt.p, j: stats.pekerjaan.irt.j, lVal: stats.pekerjaan.irt.l, pVal: stats.pekerjaan.irt.p, jVal: stats.pekerjaan.irt.j },
                    { label: '13. Wiraswasta / Lainnya', l: stats.pekerjaan.swasta.l, p: stats.pekerjaan.swasta.p, j: stats.pekerjaan.swasta.j, lVal: stats.pekerjaan.swasta.l, pVal: stats.pekerjaan.swasta.p, jVal: stats.pekerjaan.swasta.j },
                    { label: 'Jumlah Total Penduduk', l: stats.totL, p: stats.totP, j: stats.totJ, lVal: 0, pVal: 0, jVal: 0, bold: true }
                  ]} showTotal={false} />

                  <Table4 num="V." title="AGAMA / ALIRAN KEPERCAYAAN" headers={['AGAMA', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={[
                    { label: '1. Islam', l: stats.agama.islam.l, p: stats.agama.islam.p, j: stats.agama.islam.j, lVal: stats.agama.islam.l, pVal: stats.agama.islam.p, jVal: stats.agama.islam.j },
                    { label: '2. Kristen', l: stats.agama.kristen.l, p: stats.agama.kristen.p, j: stats.agama.kristen.j, lVal: stats.agama.kristen.l, pVal: stats.agama.kristen.p, jVal: stats.agama.kristen.j },
                    { label: '3. Katholik', l: stats.agama.katolik.l, p: stats.agama.katolik.p, j: stats.agama.katolik.j, lVal: stats.agama.katolik.l, pVal: stats.agama.katolik.p, jVal: stats.agama.katolik.j },
                    { label: '4. Hindu', l: stats.agama.hindu.l, p: stats.agama.hindu.p, j: stats.agama.hindu.j, lVal: stats.agama.hindu.l, pVal: stats.agama.hindu.p, jVal: stats.agama.hindu.j },
                    { label: '5. Budha', l: stats.agama.budha.l, p: stats.agama.budha.p, j: stats.agama.budha.j, lVal: stats.agama.budha.l, pVal: stats.agama.budha.p, jVal: stats.agama.budha.j },
                    { label: '6. Khonghucu', l: stats.agama.khonghucu.l, p: stats.agama.khonghucu.p, j: stats.agama.khonghucu.j, lVal: stats.agama.khonghucu.l, pVal: stats.agama.khonghucu.p, jVal: stats.agama.khonghucu.j },
                    { label: '7. Aliran Kepercayaan', l: 0, p: 0, j: 0, lVal: 0, pVal: 0, jVal: 0 }
                  ]} showTotal={true} />

                  {/* BUG WNA DI SINI TELAH DIPERBAIKI (updateObjProp dipanggil di onChange) */}
                  <Table4 num="VI." title="KEWARGANEGARAAN" headers={['KEWARGANEGARAAN', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={[
                    { label: '1. Warga Negara Indonesia', l: stats.totL, p: stats.totP, j: stats.totJ, lVal: stats.totL, pVal: stats.totP, jVal: stats.totJ },
                    { label: '2. Warga Negara Asing', l: <EditNum val={manual.kewarganegaraanWNA.l} onChange={v=>updateObjProp('kewarganegaraanWNA', 'l', v)} />, p: <EditNum val={manual.kewarganegaraanWNA.p} onChange={v=>updateObjProp('kewarganegaraanWNA', 'p', v)} />, j: manual.kewarganegaraanWNA.l+manual.kewarganegaraanWNA.p, lVal: manual.kewarganegaraanWNA.l, pVal: manual.kewarganegaraanWNA.p },
                    { label: '3. Dwi Kewarganegaraan', l: <EditNum val={manual.kewarganegaraanDwi.l} onChange={v=>updateObjProp('kewarganegaraanDwi', 'l', v)} />, p: <EditNum val={manual.kewarganegaraanDwi.p} onChange={v=>updateObjProp('kewarganegaraanDwi', 'p', v)} />, j: manual.kewarganegaraanDwi.l+manual.kewarganegaraanDwi.p, lVal: manual.kewarganegaraanDwi.l, pVal: manual.kewarganegaraanDwi.p }
                  ]} showTotal={true} />
                </div>

                {/* =========== BREAK 2: SETELAH TOTAL KEWARGANEGARAAN =========== */}
                <div style={{ pageBreakAfter: 'always' }} className="print:block hidden"></div>
                {/* --- HALAMAN 3 --- */}

                <div className="print-page pt-4 print:pt-0">
                  <Table4 num="VII." title="ETNIS" headers={['ETNIS', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={arrEtnis.map((nama, idx) => ({
                    label: `${idx + 1}. ${nama}`,
                    l: stats.etnis[idx].l,
                    p: stats.etnis[idx].p,
                    j: stats.etnis[idx].j,
                    lVal: stats.etnis[idx].l, pVal: stats.etnis[idx].p, jVal: stats.etnis[idx].j
                  }))} showTotal={true} />

                  <Table4 num="VIII." title="CACAT MENTAL DAN FISIK" headers={['JENIS CACAT FISIK', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={arrFisik.map((nama, idx) => ({
                    label: `${idx + 1}. ${nama}`, l: <EditNum val={manual.cacatFisik[idx].l} onChange={v=>updateArrObj('cacatFisik', idx, 'l', v)} />, p: <EditNum val={manual.cacatFisik[idx].p} onChange={v=>updateArrObj('cacatFisik', idx, 'p', v)} />, j: manual.cacatFisik[idx].l + manual.cacatFisik[idx].p, lVal: manual.cacatFisik[idx].l, pVal: manual.cacatFisik[idx].p
                  }))} showTotal={true} />
                  
                  <Table4 num="" title="" headers={['JENIS CACAT MENTAL', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={arrMental.map((nama, idx) => ({
                    label: `${idx + 1}. ${nama}`, l: <EditNum val={manual.cacatMental[idx].l} onChange={v=>updateArrObj('cacatMental', idx, 'l', v)} />, p: <EditNum val={manual.cacatMental[idx].p} onChange={v=>updateArrObj('cacatMental', idx, 'p', v)} />, j: manual.cacatMental[idx].l + manual.cacatMental[idx].p, lVal: manual.cacatMental[idx].l, pVal: manual.cacatMental[idx].p
                  }))} showTotal={true} />
                </div>

                {/* =========== BREAK 3: SETELAH CACAT MENTAL =========== */}
                <div style={{ pageBreakAfter: 'always' }} className="print:block hidden"></div>
                {/* --- HALAMAN 4 --- */}

                <div className="print-page pt-4 print:pt-0">
                  <Table4 num="IX." title="TENAGA KERJA" headers={['TENAGA KERJA', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={[
                    { label: '1. Penduduk Usia 0 - 6 Tahun', l: stats.tk.u0_6.l, p: stats.tk.u0_6.p, j: stats.tk.u0_6.j, lVal: stats.tk.u0_6.l, pVal: stats.tk.u0_6.p, jVal: stats.tk.u0_6.j },
                    { label: '2. Penduduk Usia 7 - 18 tahun', l: stats.tk.u7_18.l, p: stats.tk.u7_18.p, j: stats.tk.u7_18.j, lVal: stats.tk.u7_18.l, pVal: stats.tk.u7_18.p, jVal: stats.tk.u7_18.j },
                    { label: '3. Penduduk Usia 19 - 56 tahun (a+b)', l: stats.tk.u19_56.l, p: stats.tk.u19_56.p, j: stats.tk.u19_56.j, lVal: stats.tk.u19_56.l, pVal: stats.tk.u19_56.p, jVal: stats.tk.u19_56.j },
                    { label: '   a. Usia 19 - 56 tahun yang bekerja', l: stats.tk.u19_56_kerja.l, p: stats.tk.u19_56_kerja.p, j: stats.tk.u19_56_kerja.j, lVal: 0, pVal: 0, jVal: 0, isSub: true },
                    { label: '   b. Usia 19 - 56 thn belum / tidak bekerja', l: stats.tk.u19_56_belum.l, p: stats.tk.u19_56_belum.p, j: stats.tk.u19_56_belum.j, lVal: 0, pVal: 0, jVal: 0, isSub: true },
                    { label: '4. Penduduk usia 56 tahun keatas', l: stats.tk.u57_plus.l, p: stats.tk.u57_plus.p, j: stats.tk.u57_plus.j, lVal: stats.tk.u57_plus.l, pVal: stats.tk.u57_plus.p, jVal: stats.tk.u57_plus.j }
                  ]} showTotal={true} />

                  <Table4 num="X." title="KUALITAS ANGKATAN KERJA" headers={['ANGKATAN KERJA', 'LAKI-LAKI (ORANG)', 'PEREMPUAN (ORANG)']} rows={[
                    { label: '1. Penduduk usia 19-56 tahun tidak tamat SD', l: stats.ak.tidak_sd.l, p: stats.ak.tidak_sd.p, j: stats.ak.tidak_sd.j, lVal: stats.ak.tidak_sd.l, pVal: stats.ak.tidak_sd.p, jVal: stats.ak.tidak_sd.j },
                    { label: '2. Penduduk usia 19-56 tahun tamat SD', l: stats.ak.sd.l, p: stats.ak.sd.p, j: stats.ak.sd.j, lVal: stats.ak.sd.l, pVal: stats.ak.sd.p, jVal: stats.ak.sd.j },
                    { label: '3. Penduduk usia 19-56 tahun tamat SLTP', l: stats.ak.smp.l, p: stats.ak.smp.p, j: stats.ak.smp.j, lVal: stats.ak.smp.l, pVal: stats.ak.smp.p, jVal: stats.ak.smp.j },
                    { label: '4. Penduduk usia 19-56 tahun tamat SLTA', l: stats.ak.sma.l, p: stats.ak.sma.p, j: stats.ak.sma.j, lVal: stats.ak.sma.l, pVal: stats.ak.sma.p, jVal: stats.ak.sma.j },
                    { label: '5. Penduduk usia 19-56 thn tamat Perguruan Tinggi', l: stats.ak.pt.l, p: stats.ak.pt.p, j: stats.ak.pt.j, lVal: stats.ak.pt.l, pVal: stats.ak.pt.p, jVal: stats.ak.pt.j }
                  ]} showTotal={true} />

                  <Table2 num="XI." title="PRASARANA PERIBADATAN" headers={['JENIS PRASARANA', 'JUMLAH (BUAH)']} rows={arrIbadah.map((nama, idx) => ({
                    label: nama, val: <EditNum val={manual.ibadah[idx]} onChange={v=>updateArr('ibadah', idx, v)} />
                  }))} />

                  <Table2 num="XII." title="PRASARANA OLAHRAGA" headers={['JENIS PRASARANA', 'JUMLAH (BUAH)']} rows={arrOlahraga.map((nama, idx) => ({
                    label: nama, val: <EditNum val={manual.olahraga[idx]} onChange={v=>updateArr('olahraga', idx, v)} />
                  }))} />
                </div>

                {/* =========== BREAK 4: SETELAH PRASARANA OLAHRAGA =========== */}
                <div style={{ pageBreakAfter: 'always' }} className="print:block hidden"></div>
                {/* --- HALAMAN 5 --- */}

                <div className="print-page pt-4 print:pt-0">
                  <Table2 num="XIII." title="PRASARANA DAN SARANA KESEHATAN" headers={['JENIS PRASARANA KESEHATAN', 'JUMLAH (UNIT)']} rows={arrKes1.map((nama, idx) => ({
                    label: nama, val: <EditNum val={manual.kesehatanPrasarana[idx]} onChange={v=>updateArr('kesehatanPrasarana', idx, v)} />
                  }))} />
                  <Table2 num="" title="" headers={['JENIS SARANA KESEHATAN', 'JUMLAH (ORANG)']} rows={arrKes2.map((nama, idx) => ({
                    label: nama, val: <EditNum val={manual.kesehatanSarana[idx]} onChange={v=>updateArr('kesehatanSarana', idx, v)} />
                  }))} />

                  <Table4 num="XIV." title="PRASARANA PENDIDIKAN" headers={['JENIS', 'SEWA (BUAH)', 'MILIK SENDIRI (BUAH)']} rows={arrPend.map((nama, idx) => ({
                    label: `${idx+1}. ${nama}`,
                    l: <EditNum val={manual.pendidikanSewa[idx]} onChange={v=>updateArr('pendidikanSewa', idx, v)} />,
                    p: <EditNum val={manual.pendidikanMilik[idx]} onChange={v=>updateArr('pendidikanMilik', idx, v)} />,
                    j: Number(manual.pendidikanSewa[idx] || 0) + Number(manual.pendidikanMilik[idx] || 0),
                    lVal: manual.pendidikanSewa[idx], pVal: manual.pendidikanMilik[idx]
                  }))} showTotal={false} />
                </div>

                {/* =========== BREAK 5: SETELAH PRASARANA PENDIDIKAN =========== */}
                <div style={{ pageBreakAfter: 'always' }} className="print:block hidden"></div>
                {/* --- HALAMAN 6 --- */}

                <div className="print-page pt-4 print:pt-0">
                  <Table2 num="XV." title="PRASARANA ENERGI DAN PENERANGAN" headers={['JENIS', 'JUMLAH (KELUARGA)']} rows={arrEnergi.map((nama, idx) => ({
                    label: `${idx+1}. ${nama}`, val: <EditNum val={manual.energi[idx]} onChange={v=>updateArr('energi', idx, v)} />
                  }))} />

                  <Table2 num="XVI." title="PRASARANA HIBURAN DAN WISATA" headers={['JENIS', 'JUMLAH (BUAH)']} rows={arrHiburan.map((nama, idx) => ({
                    label: `${idx+1}. ${nama}`, val: <EditNum val={manual.hiburan[idx]} onChange={v=>updateArr('hiburan', idx, v)} />
                  }))} />

                  <Table2 num="XVII." title="PRASARANA DAN SARANA KEBERSIHAN" headers={['JENIS', 'JUMLAH / STATUS']} rows={arrBersih.map((nama, idx) => ({
                    label: `${idx+1}. ${nama}`, val: <EditText val={manual.kebersihan[idx]} onChange={v=>updateArr('kebersihan', idx, v)} />
                  }))} />

                  {/* TANDA TANGAN TRIWULAN (Gambar TTD menggores nama) */}
                  <div className="mt-8 print:mt-2 flex justify-end w-full break-inside-avoid">
                    <div className="text-center w-64 uppercase font-bold text-[10pt] print:text-[9pt] pt-2">
                      <p>Palembang, {tanggalLaporanOtomatis.split(' / ')[1]}</p>
                      <p className="mb-6 print:mb-4">Ketua RT.16 RW.04</p>
                      <div className="relative inline-block w-full">
                        <img src="/ttd-guntur.png" alt="Tanda Tangan" className="absolute left-1/2 -top-14 transform -translate-x-1/2 w-50 h-auto z-10 pointer-events-none opacity-90 mix-blend-multiply" />
                        <p className="relative z-0 underline underline-offset-4 decoration-2 mt-8">{manual.nama_rt}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* CSS KHUSUS (MENGATUR MARGIN & ORIENTASI PDF) */}
      {/* ========================================== */}
      <style dangerouslySetInnerHTML={{__html: `
        body { background: white !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        
        @media print {
          @page { 
            size: ${subView === 'data_dasar' ? 'A4 landscape' : 'A4 portrait'} !important; 
            margin: ${subView === 'data_dasar' ? '10mm' : '10mm 15mm 10mm 15mm'}; 
          }
          .max-w-7xl { max-width: 100% !important; margin: 0 !important; }
          .print-container { width: 100%; display: block; }
          
          /* Kunci untuk mencegah tabel memisahkan judul ke halaman lain */
          table { page-break-inside: auto !important; }
          tr { page-break-inside: avoid !important; page-break-after: auto !important; }
          .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
          
          /* Hilangkan tampilan input agar seperti teks biasa saat dicetak */
          input { border: none !important; background: transparent !important; outline: none !important; margin: 0; padding: 0; }
        }
      `}} />
    </div>
  );
}