import React, { useEffect, useState } from 'react'
import { savePop } from '../../api'

export default function PopModal({ visible, onClose, initial = null, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    id: '', name: '', code: '', lat: '', lng: '', location: '', address: '', description: ''
  })

  useEffect(() => {
    if (!visible) return
    if (initial) setForm({ ...initial })
    else setForm({ id: '', name: '', code: '', lat: '', lng: '', location: '', address: '', description: '' })
  }, [visible, initial])

  if (!visible) return null

  async function handleSubmit(e) {
    e.preventDefault()
    const data = {
      name: form.name,
      code: form.code,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      location: form.location,
      address: form.address,
      description: form.description
    }
    setLoading(true)
    const res = await savePop(form.id, data)
    setLoading(false)
    if (res && !res.error) {
      onSaved?.()
      onClose()
    } else {
      alert(res?.error || 'Gagal menyimpan POP')
    }
  }

  return (
    <div className="modal show" id="popModal">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h2>{form.id ? 'Edit POP' : 'Tambah POP'}</h2>
          <span className="close" onClick={onClose}>&times;</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>Nama POP:</label>
                <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Kode POP:</label>
                <input value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Koordinat:</label>
              <input value={form.lat && form.lng ? `${form.lat}, ${form.lng}` : ''} onChange={e => {
                const v = e.target.value.split(',').map(s => s.trim())
                setForm(prev => ({ ...prev, lat: v[0]||'', lng: v[1]||'' }))
              }} required />
            </div>
            <div className="form-group">
              <label>Lokasi:</label>
              <input value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Alamat Lengkap:</label>
              <textarea rows="2" value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Keterangan:</label>
              <textarea rows="2" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan POP'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
