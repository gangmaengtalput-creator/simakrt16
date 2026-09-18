import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

const emptyForm = { label: '', field_key: '', target: 'warga', field_type: 'text' };

export default function CustomFieldsView({ setActiveView }) {
  const supabase = getSupabaseClient();
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadFields = async () => {
    const { data, error } = await supabase.from('custom_field_definitions').select('*').order('created_at', { ascending: true });
    if (!error) setFields(data || []);
    else setMessage(`Gagal memuat field: ${error.message}`);
  };

  useEffect(() => { loadFields(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const payload = { ...form, field_key: form.field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') };
    const { error } = await supabase.from('custom_field_definitions').insert(payload);
    setLoading(false);
    if (error) setMessage(`Gagal menyimpan: ${error.message}`);
    else { setForm(emptyForm); setMessage('Field custom berhasil ditambahkan.'); loadFields(); }
  };

  const removeField = async (id) => {
    const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id);
    if (error) setMessage(`Gagal menghapus: ${error.message}`); else loadFields();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:hidden">
      <button onClick={() => setActiveView('menu')} className="text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-4 py-2 rounded-lg">&larr; Kembali ke Menu Utama</button>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-black text-gray-800">Field Custom Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Tambahkan field tambahan untuk data warga atau data desil. Nilainya disimpan di data custom warga.</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          <input required placeholder="Label, contoh: Status bantuan" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="border p-3 rounded-xl" />
          <input required placeholder="Kunci, contoh: status_bantuan" value={form.field_key} onChange={e => setForm({ ...form, field_key: e.target.value })} className="border p-3 rounded-xl" />
          <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} className="border p-3 rounded-xl"><option value="warga">Data Warga</option><option value="desil">Data Desil</option></select>
          <select value={form.field_type} onChange={e => setForm({ ...form, field_type: e.target.value })} className="border p-3 rounded-xl"><option value="text">Teks</option><option value="number">Angka</option><option value="date">Tanggal</option><option value="boolean">Ya/Tidak</option></select>
          <button disabled={loading} className="md:col-span-4 bg-blue-600 text-white p-3 rounded-xl font-bold disabled:opacity-50">{loading ? 'Menyimpan...' : 'Tambah Field'}</button>
        </form>
        {message && <p className="mt-4 text-sm font-semibold text-blue-700">{message}</p>}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-4">Label</th><th className="p-4">Kunci</th><th className="p-4">Tujuan</th><th className="p-4">Tipe</th><th className="p-4">Aksi</th></tr></thead><tbody className="divide-y">{fields.map(field => <tr key={field.id}><td className="p-4 font-bold">{field.label}</td><td className="p-4 font-mono">{field.field_key}</td><td className="p-4">{field.target}</td><td className="p-4">{field.field_type}</td><td className="p-4"><button onClick={() => removeField(field.id)} className="text-red-600 font-bold">Hapus</button></td></tr>)}</tbody></table>
      </div>
    </div>
  );
}