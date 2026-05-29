import React, { useEffect, useState } from 'react'
import { loadPOPs, saveOlt } from '../../api'

export default function OltModal({ visible, onClose, initial = null, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [pops, setPops] = useState([])
  const [form, setForm] = useState({ id: '', pop_id: '', name: '', model: '', ip_address: '', management_port: 22, total_ports: 16, total_pon_ports: 4, location: '', description: '' })

  useEffect(() => {
    if (!visible) return
    async function load() {
      const result = await loadPOPs()
      setPops(Array.isArray(result) ? result : [])
    }
    load()
    if (initial) setForm({ ...initial })
    else setForm({ id: '', pop_id: '', name: '', model: '', ip_address: '', management_port: 22, total_ports: 16, total_pon_ports: 4, location: '', description: '' })
  }, [visible, initial])

  if (!visible) return null

  async function handleSubmit(e) {
    e.preventDefault()
    const data = { pop_id: form.pop_id, name: form.name, model: form.model, ip_address: form.ip_address, management_port: Number(form.management_port), total_ports: Number(form.total_ports), total_pon_ports: Number(form.total_pon_ports), location: form.location, description: form.description }
    setLoading(true)
    const res = await saveOlt(form.id, data)
    setLoading(false)
    if (res && !res.error) {
      onSaved?.()
      onClose()
    } else {
      alert(res?.error || 'Gagal menyimpan OLT')
    }
  }

  return (
    <div className="modal show" id="oltModal">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h2>{form.id ? 'Edit OLT' : 'Tambah OLT'}</h2>
          <span className="close" onClick={onClose}>&times;</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>Pilih POP:</label>
                <select value={form.pop_id} onChange={e => setForm(prev => ({ ...prev, pop_id: e.target.value }))} required>
                  <option value="">Pilih POP...</option>
                  {pops.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Nama OLT:</label>
                <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Model:</label>
                <input value={form.model} onChange={e => setForm(prev => ({ ...prev, model: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>IP Address:</label>
                <input value={form.ip_address} onChange={e => setForm(prev => ({ ...prev, ip_address: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan OLT'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
