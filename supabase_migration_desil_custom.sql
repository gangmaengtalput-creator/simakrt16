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

  -- Update induk; anak (iuran_kas, surat, usulan, ...) ikut karena ON UPDATE CASCADE.
  update public.master_warga set nik = v_new where nik::text = v_old_nik;

  if not found then
    raise exception 'Warga dengan NIK lama tidak ditemukan';
  end if;

  -- profiles sering tanpa FK; update manual.
  update public.profiles set nik = v_new where nik::text = v_old_nik;
end;
$$;

grant execute on function public.update_warga_nik(text, text) to anon, authenticated;