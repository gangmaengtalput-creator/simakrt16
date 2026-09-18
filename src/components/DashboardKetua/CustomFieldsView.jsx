import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

const emptyForm = { label: '', field_key: '', target: 'warga', field_type: 'text' };

export default function CustomFieldsView({ setActiveView }) {
  const supabase = getSupabaseClient();
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
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
    const query = editingId
      ? supabase.from('custom_field_definitions').update(payload).eq('id', editingId)
      : supabase.from('custom_field_definitions').insert(payload);
    const { error } = await query;
    setLoading(false);
    if (error) setMessage(`Gagal menyimpan: ${error.message}`);
    else {
      setForm(emptyForm);
      setEditingId(null);
      setMessage(editingId ? 'Field custom berhasil diperbarui.' : 'Field custom berhasil ditambahkan.');
      loadFields();
    }
  };

  const removeField = async (id) => {
    if (!window.confirm('Hapus field custom ini? Nilai yang sudah tersimpan tidak akan ditampilkan lagi.')) return;
    const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id);
    if (error) setMessage(`Gagal menghapus: ${error.message}`); else loadFields();
  };

  const editField = (field) => {
    setEditingId(field.id);
    setForm({ label: field.label, field_key: field.field_key, target: field.target, field_type: field.field_type });
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:hidden">
      <button onClick={() => setActiveView('menu')} className="text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-4 py-2 rounded-lg">&larr; Kembali ke Menu Utama</button>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-black text-gray-800">Field Custom Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Tambahkan field tambahan untuk data warga atau data desil. Nilainya disimpan di data custom warga.</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          <input required placeholder="Label, contoh: Status bantuan" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="border p-3 rounded-xl" />
          <input required readOnly={Boolean(editingId)} placeholder="Kunci, contoh: status_bantuan" value={form.field_key} onChange={e => setForm({ ...form, field_key: e.target.value })} className={`border p-3 rounded-xl ${editingId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} />
          <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} className="border p-3 rounded-xl"><option value="warga">Data Warga</option><option value="desil">Data Desil</option></select>
          <select value={form.field_type} onChange={e => setForm({ ...form, field_type: e.target.value })} className="border p-3 rounded-xl"><option value="text">Teks</option><option value="number">Angka</option><option value="date">Tanggal</option><option value="boolean">Ya/Tidak</option></select>
          <div className="md:col-span-4 flex gap-3">
            <button disabled={loading} className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold disabled:opacity-50">{loading ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Field'}</button>
            {editingId && <button type="button" onClick={cancelEdit} className="px-5 bg-gray-100 text-gray-700 p-3 rounded-xl font-bold">Batal</button>}
          </div>
        </form>
        {message && <p className="mt-4 text-sm font-semibold text-blue-700">{message}</p>}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-4">Label</th><th className="p-4">Kunci</th><th className="p-4">Tujuan</th><th className="p-4">Tipe</th><th className="p-4">Aksi</th></tr></thead><tbody className="divide-y">{fields.map(field => <tr key={field.id}><td className="p-4 font-bold">{field.label}</td><td className="p-4 font-mono">{field.field_key}</td><td className="p-4">{field.target}</td><td className="p-4">{field.field_type}</td><td className="p-4"><div className="flex gap-3"><button onClick={() => editField(field)} className="text-amber-600 font-bold">Edit</button><button onClick={() => removeField(field.id)} className="text-red-600 font-bold">Hapus</button></div></td></tr>)}</tbody></table>
      </div>
    </div>
  );
}