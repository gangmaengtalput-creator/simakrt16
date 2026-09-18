import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

const emptyForm = { label: '', field_key: '', target: 'warga', field_type: 'text' };

const targetLabel = { warga: 'Data Warga', desil: 'Data Desil' };
const typeLabel = { text: 'Teks', number: 'Angka', date: 'Tanggal', boolean: 'Ya/Tidak' };

export default function CustomFieldsView({ setActiveView }) {
  const supabase = getSupabaseClient();
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const loadFields = async () => {
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error) setFields(data || []);
    else showMessage(`Gagal memuat field: ${error.message}`, 'error');
  };

  useEffect(() => { loadFields(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const wasEditing = Boolean(editingId);
    const payload = {
      ...form,
      field_key: form.field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    };
    const query = editingId
      ? supabase.from('custom_field_definitions').update({
          label: payload.label,
          target: payload.target,
          field_type: payload.field_type
        }).eq('id', editingId)
      : supabase.from('custom_field_definitions').insert(payload);

    const { error } = await query;
    setLoading(false);
    if (error) {
      showMessage(`Gagal menyimpan: ${error.message}`, 'error');
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    showMessage(wasEditing ? 'Field custom berhasil diperbarui.' : 'Field custom berhasil ditambahkan.', 'success');
    loadFields();
  };

  const removeField = async (field) => {
    const ok = window.confirm(
      `Hapus field "${field.label}"?\n\nDefinisi field akan dihapus. Nilai yang sudah tersimpan di data warga tidak ditampilkan lagi di form.`
    );
    if (!ok) return;

    setDeletingId(field.id);
    setMessage('');
    const { error } = await supabase.from('custom_field_definitions').delete().eq('id', field.id);
    setDeletingId(null);

    if (error) {
      showMessage(`Gagal menghapus: ${error.message}`, 'error');
      return;
    }
    if (editingId === field.id) {
      setEditingId(null);
      setForm(emptyForm);
    }
    showMessage(`Field "${field.label}" berhasil dihapus.`, 'success');
    loadFields();
  };

  const editField = (field) => {
    setEditingId(field.id);
    setForm({
      label: field.label,
      field_key: field.field_key,
      target: field.target,
      field_type: field.field_type
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:hidden">
      <button
        type="button"
        onClick={() => setActiveView('menu')}
        className="text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-4 py-2 rounded-lg"
      >
        &larr; Kembali ke Menu Utama
      </button>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-black text-gray-800">Field Custom Admin</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tambahkan field tambahan untuk data warga atau data desil. Nilainya disimpan di data custom warga.
        </p>

        {editingId && (
          <div className="mt-4 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm font-semibold">
            <span>Mode edit: ubah label / tujuan / tipe, lalu klik Simpan Perubahan.</span>
            <button type="button" onClick={cancelEdit} className="text-amber-700 underline shrink-0">Batal</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          <input
            required
            placeholder="Label, contoh: Status bantuan"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            required
            readOnly={Boolean(editingId)}
            placeholder="Kunci, contoh: status_bantuan"
            value={form.field_key}
            onChange={(e) => setForm({ ...form, field_key: e.target.value })}
            className={`border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${editingId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            title={editingId ? 'Kunci tidak bisa diubah agar data warga tetap cocok' : ''}
          />
          <select
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })}
            className="border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="warga">Data Warga</option>
            <option value="desil">Data Desil</option>
          </select>
          <select
            value={form.field_type}
            onChange={(e) => setForm({ ...form, field_type: e.target.value })}
            className="border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="text">Teks</option>
            <option value="number">Angka</option>
            <option value="date">Tanggal</option>
            <option value="boolean">Ya/Tidak</option>
          </select>
          <div className="md:col-span-4 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Field'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-xl font-bold transition-colors"
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>

        {message && (
          <p className={`mt-4 text-sm font-semibold ${messageType === 'error' ? 'text-red-600' : messageType === 'success' ? 'text-emerald-700' : 'text-blue-700'}`}>
            {message}
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-black text-gray-800">Daftar Field Custom</h2>
          <span className="text-xs font-bold text-gray-500">{fields.length} field</span>
        </div>

        {fields.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">Belum ada field custom. Tambahkan lewat formulir di atas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="bg-white border-b">
                <tr className="text-gray-500 uppercase text-xs tracking-wide">
                  <th className="p-4 font-bold">Label</th>
                  <th className="p-4 font-bold">Kunci</th>
                  <th className="p-4 font-bold">Tujuan</th>
                  <th className="p-4 font-bold">Tipe</th>
                  <th className="p-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fields.map((field) => (
                  <tr
                    key={field.id}
                    className={`hover:bg-gray-50 ${editingId === field.id ? 'bg-amber-50/70' : ''}`}
                  >
                    <td className="p-4 font-bold text-gray-800">{field.label}</td>
                    <td className="p-4 font-mono text-xs text-gray-600">{field.field_key}</td>
                    <td className="p-4">{targetLabel[field.target] || field.target}</td>
                    <td className="p-4">{typeLabel[field.field_type] || field.field_type}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => editField(field)}
                          className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs hover:bg-amber-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === field.id}
                          onClick={() => removeField(field)}
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-bold text-xs hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          {deletingId === field.id ? 'Menghapus...' : 'Hapus'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
