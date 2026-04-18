// File: src/app/api/notify-register/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { headers } from 'next/headers';
import he from 'he';

// ==========================================
// 🛡️ LAPIS KONTROL: RATE LIMITER
// ==========================================
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Menit
const MAX_REQUEST = 5; // Dilonggarkan menjadi 5 untuk mempermudah testing
const requestStore = new Map();

function isRateLimited(identifier) {
  const now = Date.now();
  if (!requestStore.has(identifier)) requestStore.set(identifier, []);
  const timestamps = requestStore.get(identifier);
  const filtered = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (filtered.length >= MAX_REQUEST) return true;
  
  filtered.push(now);
  requestStore.set(identifier, filtered);
  return false;
}

export async function POST(request) {
  try {
    console.log("\n=== 📨 API NOTIFY REGISTER DIPANGGIL ===");

    // ==========================================
    // 🛡️ LAPIS 1: ORIGIN CHECKER
    // ==========================================
    const headersList = await headers();
    const origin = headersList.get('origin') || '';
    const host = headersList.get('host') || '';
    
    // Deteksi IP lebih cerdas (Mencegah masalah "unknown" di localhost)
    let ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';
    ip = ip.split(',')[0].trim(); 

    console.log(`📍 Info Klien -> Origin: ${origin || 'Kosong'}, Host: ${host}, IP: ${ip}`);

    // Tambahkan 127.0.0.1 ke daftar aman
    const isAllowedOrigin = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('gangmaeng.my.id') || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('gangmaeng.my.id');
    
    if (!isAllowedOrigin) {
      console.error("🚨 BLOKIR LAPIS 1: Origin tidak dikenali!");
      return NextResponse.json({ error: 'Forbidden: Invalid Origin' }, { status: 403 });
    }

    // ==========================================
    // 🛡️ LAPIS 2: RATE LIMITER
    // ==========================================
    if (isRateLimited(ip)) {
      console.error(`🚨 BLOKIR LAPIS 2: Terlalu banyak request (Spam) dari IP: ${ip}`);
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    // ==========================================
    // 🛡️ LAPIS 3 & 4: VALIDASI & SANITASI
    // ==========================================
    const body = await request.json();
    const { nama, nik, no_hp, email } = body;

    if (!nama || !nik || !no_hp || !email) {
      console.error("🚨 BLOKIR LAPIS 3: Data form tidak lengkap.");
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    console.log(`👤 Memproses email notifikasi untuk warga baru: ${nama} (${email})`);

    const safeNama = he.encode(nama);
    const safeNik = he.encode(nik);
    const safeHp = he.encode(no_hp);
    const safeEmail = he.encode(email);

    // ==========================================
    // 📨 PROSES PEMBUATAN EMAIL
    // ==========================================
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #2563eb; padding: 25px; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 22px; letter-spacing: 0.5px;">🆕 Pendaftaran Akun Baru</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #374151; margin-top: 0;">Halo Ketua RT,</p>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
            Sistem menginformasikan bahwa ada warga yang baru saja berhasil melakukan registrasi akun di aplikasi SIMAK RT 16. Berikut rincian data pendaftar:
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 25px 0;">
            <table style="width: 100%; font-size: 14px; color: #111827; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; width: 140px; color: #64748b;">Nama Sesuai KK</td><td style="padding: 8px 0;">: <b>${safeNama}</b></td></tr>
              <tr><td style="padding: 8px 0; width: 140px; color: #64748b;">NIK</td><td style="padding: 8px 0;">: ${safeNik}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">No WhatsApp/HP</td><td style="padding: 8px 0;">: ${safeHp}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Email Pendaftar</td><td style="padding: 8px 0;">: <a href="mailto:${safeEmail}" style="color: #2563eb;">${safeEmail}</a></td></tr>
            </table>
          </div>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Sistem telah memberikan akses mandiri ke warga bersangkutan sesuai dengan NIK-nya.</p>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 35px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            Pesan otomatis ini dikirimkan dari Sistem Informasi Layanan Warga (SIMAK RT 16).
          </p>
        </div>
      </div>
    `;

    // ==========================================
    // 🛡️ LAPIS 5: PENGIRIMAN BREVO
    // ==========================================
    console.log("⚙️ Menghubungkan ke server Brevo...");
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, 
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"SIMAK RT 16" <admin@gangmaeng.my.id>',
      to: 'gunturbayujantoro@gmail.com',
      subject: '🆕 [SIMAK RT] Warga Baru Mendaftar',
      html: htmlEmail,
    });

    console.log("✅ EMAIL NOTIFIKASI REGISTRASI BERHASIL DIKIRIM!");
    return NextResponse.json({ message: 'Notifikasi terkirim' });

  } catch (err) {
    console.error('❌ FATAL ERROR API Notify Register:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}