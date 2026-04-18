// File: src/app/api/notify-acc/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import he from 'he';

export async function POST(request) {
  try {
    // 🛡️ LAPIS 1: ORIGIN CHECKER
    const headersList = await headers();
    const origin = headersList.get('origin') || '';
    const host = headersList.get('host') || '';
    
    const isAllowedOrigin = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('gangmaeng.my.id') || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('gangmaeng.my.id');
    
    if (!isAllowedOrigin) {
      console.error("🚨 BLOKIR: Origin tidak dikenali!");
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 🛡️ LAPIS 2: SUPABASE AUTH GUARD (Hanya bisa dieksekusi jika RT sedang login)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      console.warn("🚨 BLOKIR: Eksekusi API ACC Akun tanpa sesi login yang sah.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🛡️ LAPIS 3 & 4: VALIDASI & SANITASI PAYLOAD
    const body = await request.json();
    const { email, nama } = body;

    if (!email) {
      return NextResponse.json({ error: 'Bad Request: Email tujuan kosong' }, { status: 400 });
    }

    const safeNama = he.encode(nama || 'Warga RT.16');
    const safeEmail = he.encode(email);

    // 📨 DESAIN EMAIL PROFESIONAL (Notifikasi Akun Aktif)
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        
        <div style="background-color: #16a34a; padding: 25px; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 22px; letter-spacing: 0.5px;">
            ✅ Akun Anda Telah Aktif
          </h2>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #374151; margin-top: 0;">Yth. Bapak/Ibu <b>${safeNama}</b>,</p>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
            Selamat! Pendaftaran akun Anda pada sistem <b>SIMAK RT 16</b> telah disetujui (ACC) oleh Ketua RT.
          </p>

          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px; color: #166534; line-height: 1.5;">
              Mulai sekarang, Anda sudah dapat melakukan <b>Login</b> ke dalam aplikasi untuk mengakses layanan persuratan digital, menyampaikan usulan, dan melihat informasi lingkungan.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
            <a href="https://gangmaeng.my.id/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
              Login ke Aplikasi Sekarang
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 35px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Hormat kami,<br/><br/>
            <b>Ketua RT.16 RW.04</b><br/>
            Kelurahan Talangputri
          </p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
          Email ini dikirim otomatis ke ${safeEmail}. Mohon untuk tidak membalas pesan ini.
        </div>
      </div>
    `;

    // 🛡️ LAPIS 5: PENGIRIMAN VIA BREVO
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
      to: email, // Kirim ke email warga yang di-ACC
      subject: '✅ [SIMAK RT] Akun Anda Telah Aktif!',
      html: htmlEmail,
    });

    return NextResponse.json({ message: 'Email Notifikasi ACC terkirim!' });

  } catch (err) {
    console.error('❌ FATAL ERROR API Notify ACC:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}