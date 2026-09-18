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

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Admin dapat mengunggah foto warga' and tablename = 'objects') then
    create policy "Admin dapat mengunggah foto warga"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'warga');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admin dapat memperbarui foto warga' and tablename = 'objects') then
    create policy "Admin dapat memperbarui foto warga"
      on storage.objects for update to authenticated
      using (bucket_id = 'warga') with check (bucket_id = 'warga');
  end if;
end $$;