-- Jalankan di Supabase SQL Editor sebelum memakai fitur desil/custom field.
alter table public.master_warga
  add column if not exists tanggal_masuk date,
  add column if not exists tanggal_keluar date,
  add column if not exists foto_rumah_depan text,
  add column if not exists foto_ruang_tamu text,
  add column if not exists foto_kamar_mandi text,
  add column if not exists id_pln text,
  add column if not exists id_pdam text,
  add column if not exists pendapatan_kerja numeric default 0,
  add column if not exists pendapatan_usaha numeric default 0,
  add column if not exists pendapatan_pemberian numeric default 0,
  add column if not exists status_kepemilikan_rumah text,
  add column if not exists pengeluaran_makan_mingguan numeric default 0,
  add column if not exists pengeluaran_listrik_bulanan numeric default 0,
  add column if not exists pengeluaran_lain_bulanan numeric default 0,
  add column if not exists pengeluaran_tahunan numeric default 0,
  add column if not exists desil integer check (desil between 1 and 10),
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

create table if not exists public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  field_key text not null unique,
  target text not null check (target in ('warga', 'desil')),
  field_type text not null default 'text' check (field_type in ('text', 'number', 'date', 'boolean')),
  created_at timestamptz not null default now()
);

alter table public.custom_field_definitions enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Admin dapat mengelola definisi field' and tablename = 'custom_field_definitions') then
    create policy "Admin dapat mengelola definisi field"
      on public.custom_field_definitions for all using (true) with check (true);
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('warga', 'warga', true)
on conflict (id) do update set public = true;

drop policy if exists "Admin dapat mengunggah foto warga" on storage.objects;
drop policy if exists "Admin dapat memperbarui foto warga" on storage.objects;
drop policy if exists "Admin dapat membaca foto warga" on storage.objects;

create policy "Admin dapat mengunggah foto warga"
  on storage.objects for insert to public
  with check (bucket_id = 'warga');

create policy "Admin dapat memperbarui foto warga"
  on storage.objects for update to public
  using (bucket_id = 'warga') with check (bucket_id = 'warga');

create policy "Admin dapat membaca foto warga"
  on storage.objects for select to public
  using (bucket_id = 'warga');

create or replace function public.update_warga_nik(p_old_nik text, p_new_nik text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(p_old_nik), '') is null or nullif(trim(p_new_nik), '') is null then
    raise exception 'NIK lama dan NIK baru wajib diisi';
  end if;

  if trim(p_old_nik) = trim(p_new_nik) then
    return;
  end if;

  if exists (select 1 from public.master_warga where nik = trim(p_new_nik)) then
    raise exception 'NIK baru sudah digunakan warga lain';
  end if;

  update public.profiles set nik = trim(p_new_nik) where nik = trim(p_old_nik);
  update public.iuran_kas set nik_warga = trim(p_new_nik) where nik_warga = trim(p_old_nik);
  update public.permintaan_surat set nik_pemohon = trim(p_new_nik) where nik_pemohon = trim(p_old_nik);
  update public.usulan_warga set nik_pengusul = trim(p_new_nik) where nik_pengusul = trim(p_old_nik);
  update public.surat_keterangan set nik_warga = trim(p_new_nik) where nik_warga = trim(p_old_nik);
  update public.master_warga set nik = trim(p_new_nik) where nik = trim(p_old_nik);

  if not found then
    raise exception 'Warga dengan NIK lama tidak ditemukan';
  end if;
end;
$$;

grant execute on function public.update_warga_nik(text, text) to anon, authenticated;