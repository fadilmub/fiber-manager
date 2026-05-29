import React, { useEffect, useState } from 'react'
import { savePortConfig } from '../../api'

export default function PortModal({ visible, onClose, initial = null, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ pon_id: '', port_number: '', status: 'available', target_odc_id: '', description: '' })

  useEffect(() => {
    if (!visible) return
    if (initial) setForm({ ...initial })
    else setForm({ pon_id: '', port_number: '', status: 'available', target_odc_id: '', description: '' })
  }, [visible, initial])

  if (!visible) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const res = await savePortConfig(form)
    setLoading(false)
    if (res && !res.error) {
      onSaved?.()
      onClose()
    } else {
      alert(res?.error || 'Gagal menyimpan konfigurasi port')
    }
  }

  return (
    <div className={`modal show`} id="portDirectionModal">
      <div className="modal-content modal-small">
        <div className="modal-header">
          <h3>Konfigurasi Port</h3>
          <span className="close" onClick={onClose}>&times;</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <input type="hidden" value={form.pon_id} />
            <div className="form-group">
              <label>Nomor Port:</label>
              <input readOnly value={form.port_number} />
            </div>
            <div className="form-group">
              <label>Status:</label>
              <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
                <option value="available">Available (Tersedia)</option>
                <option value="used">Used (Terpakai)</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="form-group">
              <label>Terhubung ke ODC (ID):</label>
              <input value={form.target_odc_id} onChange={e => setForm(prev => ({ ...prev, target_odc_id: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Keterangan:</label>
              <textarea rows="2" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
