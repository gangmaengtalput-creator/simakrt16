import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import he from 'he';

// ===== RATE LIMIT (Anti-Spam) =====
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 menit
const MAX_REQUEST = 5;
const requestStore = new Map();

function isRateLimited(userId) {
  const now = Date.now();
  if (!requestStore.has(userId)) {
    requestStore.set(userId, []);
  }
  const timestamps = requestStore.get(userId);
  const filtered = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (filtered.length >= MAX_REQUEST) {
    return true;
  }
  filtered.push(now);
  requestStore.set(userId, filtered);
  return false;
}

// ===== TRANSPORTER BREVO (Sudah Dimerger) =====
let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com', // Menggunakan Server Brevo
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER, // Menggunakan .env Brevo Anda
        pass: process.env.BREVO_SMTP_PASS, // Menggunakan .env Brevo Anda
      },
    });
  }
  return transporter;
}

export async function POST(request) {
  try {
    console.log("=== API SEND EMAIL DIPANGGIL ===");

    // 1. AUTH MENGGUNAKAN @supabase/ssr
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* Diabaikan */ },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 🚨 CEK PERTAMA: Apakah User Terdeteksi?
    if (!user || authError) {
      console.error("GAGAL DI TAHAP 1 (AUTH): User tidak terdeteksi atau error Auth.", authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log("Tahap 1 Lulus: User ID", user.id);

    // 🚨 CEK KEDUA: Apakah Kena Rate Limit?
    if (isRateLimited(user.id)) {
      console.error("GAGAL DI TAHAP 2 (RATE LIMIT): Terlalu banyak klik.");
      return NextResponse.json({ error: 'Terlalu banyak request.' }, { status: 429 });
    }
    console.log("Tahap 2 Lulus: Tidak kena rate limit.");

    // 🚨 CEK KETIGA: Apakah Data Body Valid?
    const bodyText = await request.text(); // Ambil body sebagai teks mentah dulu
    console.log("Data Diterima dari Frontend:", bodyText);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch (e) {
      console.error("GAGAL DI TAHAP 3 (JSON PARSE): Body bukan JSON yang valid.");
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { nama, pesan } = parsedBody;

    if (!nama || !pesan || pesan.length < 5) {
      console.error("GAGAL DI TAHAP 4 (VALIDASI INPUT): Nama atau Pesan kosong/terlalu pendek.");
      return NextResponse.json({ error: 'Input tidak valid' }, { status: 400 });
    }
    console.log("Tahap 3 & 4 Lulus: Input tervalidasi.");

    // SANITASI & TEMPLATE
    const safeNama = he.encode(nama);
    const safePesan = he.encode(pesan);
    const safeEmail = he.encode(user.email || '');

    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 10px;">📄 Permintaan Surat Baru!</h2>
        <p>Halo Ketua RT,</p>
        <p>Warga atas nama <b>${safeNama}</b> (${safeEmail}) mengirimkan pesan / permintaan pembuatan surat pengantar.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; white-space: pre-wrap;">${safePesan}</div>
        <p>Silakan login ke Dashboard Ketua RT untuk menindaklanjutinya.</p>
      </div>
    `;

    // SEND EMAIL
    console.log("Mencoba mengirim email ke Brevo...");
    const mailer = getTransporter();

    // 🚨 CEK KELIMA: Uji Pengiriman Brevo
    const info = await mailer.sendMail({
      from: '"Aplikasi RT 16" <admin@gangmaeng.my.id>', 
      to: 'gunturbayujantoro@gmail.com',
      replyTo: user.email,
      subject: '📄 [SIMAK RT] Notifikasi Permintaan Surat Pengantar Warga',
      html,
    });

    console.log("=== EMAIL BERHASIL DIKIRIM! ===");
    console.log("Message ID:", info.messageId);

    return NextResponse.json({ message: 'Email berhasil dikirim' });

  } catch (err) {
    console.error("=== GAGAL TOTAL DI BLOK CATCH ===");
    console.error(err);
    return NextResponse.json({ error: 'Terjadi kesalahan server saat mengirim email' }, { status: 500 });
  }
}