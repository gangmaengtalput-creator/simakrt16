// File: src/app/api/send-email/route.js
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { nama, nik, keperluan, keterangan } = await request.json();

    // Setup koneksi ke Brevo
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    // Desain Email
    const mailOptions = {
      from: '"Sistem RT 16" <no-reply@gangmaeng.my.id>', // Ganti dengan email pengirim Anda
      to: 'gunturbayujantoro@gmail.com', // Email tujuan (Ketua RT)
      subject: `Permintaan Surat Baru - ${nama}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Ada Permintaan Surat Pengantar Baru!</h2>
          <p>Halo Bapak/Ibu Ketua RT.16,</p>
          <p>Berikut adalah detail warga yang baru saja mengajukan permintaan surat:</p>
          <table style="width: 100%; max-width: 500px; border-collapse: collapse; margin-top: 15px;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Nama</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">: ${nama}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>NIK</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">: ${nik}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Keperluan</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">: ${keperluan}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Keterangan</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">: ${keterangan}</td></tr>
          </table>
          <p style="margin-top: 20px;">Silakan cek <a href="https://gangmaeng.my.id/dashboard/ketua">Dashboard Ketua RT</a> untuk memproses surat ini.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: 'Email berhasil dikirim' }, { status: 200 });
  } catch (error) {
    console.error('Error kirim email:', error);
    return NextResponse.json({ error: 'Gagal mengirim email' }, { status: 500 });
  }
}