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
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists foto_warga text,
  add column if not exists dokumen_ktp text,
  add column if not exists dokumen_kk text,
  add column if not exists nama_ayah text,
  add column if not exists nama_ibu text,
  add column if not exists status_perkawinan text,
  add column if not exists dokumen_buku_nikah text,
  add column if not exists dokumen_akta_cerai text,
  add column if not exists dokumen_akta_kematian_pasangan text;

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

insert into storage.buckets (id, name, public)
values ('dokumen-warga', 'dokumen-warga', false)
on conflict (id) do update set public = false;

drop policy if exists "Ketua RT dapat mengunggah dokumen personal" on storage.objects;
drop policy if exists "Ketua RT dapat membaca dokumen personal" on storage.objects;

create policy "Ketua RT dapat mengunggah dokumen personal"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dokumen-warga'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ketua_rt'
    )
  );

create policy "Ketua RT dapat membaca dokumen personal"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dokumen-warga'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ketua_rt'
    )
  );

-- Satu kali: FK ke master_warga.nik memakai ON UPDATE CASCADE
-- supaya ganti NIK di induk otomatis ikut ke tabel anak (iuran_kas, dll).
do $$
declare
  r record;
  col_name text;
begin
  for r in
    select c.oid, c.conname, c.conrelid, c.conkey
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'public.master_warga'::regclass
  loop
    select a.attname into col_name
    from pg_attribute a
    where a.attrelid = r.conrelid
      and a.attnum = r.conkey[1]
      and not a.attisdropped;

    execute format('alter table %s drop constraint %I', r.conrelid::regclass, r.conname);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references public.master_warga(nik) on update cascade',
      r.conrelid::regclass,
      r.conname,
      col_name
    );
  end loop;
end $$;

drop function if exists public.update_warga_nik(text, text);
drop function if exists public.update_warga_nik(bigint, bigint);

create function public.update_warga_nik(p_old_nik text, p_new_nik text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_nik text := trim(p_old_nik);
  v_new_nik text := trim(p_new_nik);
  v_new bigint;
begin
  if v_old_nik is null or v_old_nik = '' or v_new_nik is null or v_new_nik = '' then
    raise exception 'NIK lama dan NIK baru wajib diisi';
  end if;

  if v_old_nik !~ '^\d{16}$' or v_new_nik !~ '^\d{16}$' then
    raise exception 'NIK harus terdiri dari tepat 16 digit angka';
  end if;

  v_new := v_new_nik::bigint;

  if v_old_nik = v_new_nik then
    return;
  end if;

  if exists (select 1 from public.master_warga where nik::text = v_new_nik) then
    raise exception 'NIK baru sudah digunakan warga lain';
  end if;

  if not exists (select 1 from public.master_warga where nik::text = v_old_nik) then
    raise exception 'Warga dengan NIK lama tidak ditemukan';
  end if;

  -- Lepas FK sementara agar semua lini NIK bisa diganti tanpa chicken-egg.
  alter table public.iuran_kas drop constraint if exists iuran_kas_nik_warga_fkey;
  alter table public.permintaan_surat drop constraint if exists permintaan_surat_nik_pemohon_fkey;
  alter table public.usulan_warga drop constraint if exists usulan_warga_nik_pengusul_fkey;
  alter table public.surat_keterangan drop constraint if exists surat_keterangan_nik_warga_fkey;

  -- 1) Login warga memakai profiles.nik → wajib ikut diganti.
  update public.profiles set nik = v_new where nik::text = v_old_nik;

  -- 2) Tabel transaksi / surat / usulan (SET pakai bigint; kolom text otomatis cast).
  update public.iuran_kas set nik_warga = v_new where nik_warga::text = v_old_nik;
  update public.permintaan_surat set nik_pemohon = v_new where nik_pemohon::text = v_old_nik;
  update public.usulan_warga set nik_pengusul = v_new where nik_pengusul::text = v_old_nik;
  update public.surat_keterangan set nik_warga = v_new where nik_warga::text = v_old_nik;

  -- 3) Induk terakhir
  update public.master_warga set nik = v_new where nik::text = v_old_nik;

  -- Pasang kembali FK + ON UPDATE CASCADE (abaikan jika tipe kolom tidak cocok / sudah ada).
  begin
    alter table public.iuran_kas
      add constraint iuran_kas_nik_warga_fkey
      foreign key (nik_warga) references public.master_warga(nik) on update cascade;
  exception when others then null;
  end;

  begin
    alter table public.permintaan_surat
      add constraint permintaan_surat_nik_pemohon_fkey
      foreign key (nik_pemohon) references public.master_warga(nik) on update cascade;
  exception when others then null;
  end;

  begin
    alter table public.usulan_warga
      add constraint usulan_warga_nik_pengusul_fkey
      foreign key (nik_pengusul) references public.master_warga(nik) on update cascade;
  exception when others then null;
  end;

  begin
    alter table public.surat_keterangan
      add constraint surat_keterangan_nik_warga_fkey
      foreign key (nik_warga) references public.master_warga(nik) on update cascade;
  exception when others then null;
  end;
end;
$$;

grant execute on function public.update_warga_nik(text, text) to anon, authenticated;

-- Login by NIK harus cocok dengan profiles.nik yang baru.
drop function if exists public.get_login_info_by_nik(text);
drop function if exists public.get_login_info_by_nik(bigint);

create function public.get_login_info_by_nik(input_nik text)
returns table(email text, status text, role text)
language sql
security definer
set search_path = public
as $$
  select p.email::text, p.status::text, p.role::text
  from public.profiles p
  where p.nik::text = trim(input_nik)
  limit 1;
$$;

grant execute on function public.get_login_info_by_nik(text) to anon, authenticated;