import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import he from 'he';
import puppeteer from 'puppeteer';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailTujuan, nama, status, tujuan, catatan, htmlSurat, nomorSurat } = await request.json();

    const isSelesai = status === 'Selesai';
    const safeNama = he.encode(nama);
    
    // ==========================================
    // PROSES KONVERSI HTML KE PDF (PUPPETEER)
    // ==========================================
    const attachments = [];
    let isPdfSuccess = false;

    if (isSelesai && htmlSurat) {
      try {
        const browser = await puppeteer.launch({ 
          headless: "new",
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
        const page = await browser.newPage();
        await page.setContent(htmlSurat, { waitUntil: 'domcontentloaded' });
        
        const pdfBuffer = await page.pdf({ 
          format: 'A4',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });
        
        await browser.close();

        attachments.push({
          filename: `Surat_Pengantar_${nomorSurat.replace(/\//g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
        isPdfSuccess = true;

      } catch (pdfError) {
        console.error("GAGAL MEMBUAT PDF:", pdfError.message);
        attachments.push({
          filename: `Surat_Pengantar_${nomorSurat.replace(/\//g, '_')}.html`,
          content: htmlSurat,
          contentType: 'text/html'
        });
      }
    }

    // ==========================================
    // BADAN EMAIL PROFESIONAL (KORPORAT/INSTANSI)
    // ==========================================
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        
        <div style="background-color: ${isSelesai ? '#16a34a' : '#dc2626'}; padding: 25px; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 22px; letter-spacing: 0.5px;">
            ${isSelesai ? '✅ Dokumen Surat Selesai' : '❌ Permintaan Surat Ditolak'}
          </h2>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #374151; margin-top: 0;">Yth. Bapak/Ibu <b>${safeNama}</b>,</p>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
            ${isSelesai 
              ? 'Bersama email ini, kami sampaikan bahwa permintaan pembuatan Surat Keterangan Anda telah <b>selesai diproses</b> dan disetujui oleh Ketua RT.16.' 
              : 'Mohon maaf, permintaan pembuatan Surat Keterangan Anda <b>tidak dapat diproses</b> pada saat ini.'}
          </p>

          <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Rincian Permintaan</h3>
            <table style="width: 100%; font-size: 14px; color: #111827; border-collapse: collapse;">
              ${isSelesai ? `<tr><td style="padding: 6px 0; width: 120px; color: #6b7280;">Nomor Surat</td><td style="padding: 6px 0;">: <b>${nomorSurat}</b></td></tr>` : ''}
              <tr><td style="padding: 6px 0; width: 120px; color: #6b7280;">Keperluan</td><td style="padding: 6px 0;">: ${tujuan || '-'}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Status</td><td style="padding: 6px 0;">: <span style="color: ${isSelesai ? '#16a34a' : '#dc2626'}; font-weight: bold;">${status.toUpperCase()}</span></td></tr>
            </table>
          </div>

          ${isSelesai ? `
            <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #16a34a; border-radius: 4px; margin-top: 20px;">
              <p style="margin: 0; font-size: 15px; color: #166534; line-height: 1.5;">
                📄 <b>File Tersedia:</b><br/>Dokumen resmi Anda telah kami lampirkan pada email ini dalam format PDF. File ini sudah dilengkapi tanda tangan Ketua RT dan siap untuk Anda <b>unduh & cetak</b>.
              </p>
            </div>
          ` : `
            <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; border-radius: 4px; margin-top: 20px;">
              <p style="margin: 0; font-size: 15px; color: #991b1b; line-height: 1.5;">
                <b>Alasan Penolakan:</b><br/>${catatan || 'Data tidak lengkap atau tidak sesuai.'}
              </p>
            </div>
          `}
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 35px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Terima kasih telah menggunakan layanan digital SIMAK RT 16.<br/><br/>
            Hormat kami,<br/>
            <b>Ketua RT.16 RW.04</b><br/>
            Kelurahan Talangputri
          </p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
          Email ini dihasilkan otomatis oleh sistem. Mohon untuk tidak membalas email ini.
        </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"SIMAK RT 16" <admin@gangmaeng.my.id>',
      to: emailTujuan,
      subject: isSelesai ? '✅ Dokumen Surat Keterangan Selesai Diproses' : '❌ Permintaan Surat Ditolak',
      html: htmlEmail,
      attachments 
    });

    return NextResponse.json({ message: 'Notifikasi & File terkirim' });
  } catch (err) {
    console.error('Notify Warga Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}