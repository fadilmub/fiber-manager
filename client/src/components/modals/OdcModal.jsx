import React, { useEffect, useState } from 'react'
import { createOdc, loadAvailableSources, loadPONPorts, updateOdc } from '../../api'

export default function OdcModal({ visible, onClose, initial = null, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [ponId, setPonId] = useState('')
  const [selectedPort, setSelectedPort] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [capacity, setCapacity] = useState(24)
  const [description, setDescription] = useState('')
  const [sources, setSources] = useState([])
  const [ports, setPorts] = useState([])

  useEffect(() => {
    if (!visible) return

    async function load() {
      const result = await loadAvailableSources()
      setSources(result && result.pons ? result.pons : [])
    }

    load()
    if (initial) {
      setName(initial.name || '')
      setPonId(initial.pon_id || '')
      setSelectedPort(initial.pon_port_number ? `${initial.pon_port_number}` : '')
      setCoordinates(`${initial.lat || ''}, ${initial.lng || ''}`)
      setCapacity(initial.capacity || 24)
      setDescription(initial.description || '')
      setPorts([])
    } else {
      setName('')
      setPonId('')
      setSelectedPort('')
      setCoordinates('')
      setCapacity(24)
      setDescription('')
      setPorts([])
    }
  }, [visible, initial])

  useEffect(() => {
    if (!ponId) {
      setPorts([])
      return
    }

    async function loadPorts() {
      const result = await loadPONPorts(ponId)
      const availablePorts = Array.isArray(result) ? result.filter(port => port.status === 'available') : []
      if (initial && initial.pon_id === ponId && initial.pon_port_number) {
        const exists = availablePorts.some(port => `${port.port_number}` === `${initial.pon_port_number}`)
        if (!exists) {
          availablePorts.unshift({ port_number: initial.pon_port_number, status: 'used' })
        }
      }
      setPorts(availablePorts)
      if (initial && initial.pon_id === ponId && initial.pon_port_number) {
        setSelectedPort(`${initial.pon_port_number}`)
      }
    }

    loadPorts()
  }, [ponId, initial])

  if (!visible) return null

  async function handleSubmit(e) {
    e.preventDefault()
    const [lat, lng] = (coordinates || '').split(',').map(value => value.trim())

    if (!name || !ponId || !coordinates) {
      alert('Nama ODC, PON, dan koordinat wajib diisi')
      return
    }

    const portNumber = Number(selectedPort) || null
    if (!portNumber) {
      alert('Pilih port PON yang tersedia')
      return
    }

    const data = {
      name,
      pon_id: ponId,
      pon_port_number: portNumber,
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      capacity: Number(capacity) || 24,
      description
    }

    setLoading(true)
    const res = initial && initial.id ? await updateOdc(initial.id, data) : await createOdc(data)
    setLoading(false)

    if (res && !res.error) {
      onSaved?.()
      onClose()
    } else {
      alert(res?.error || 'Gagal menyimpan ODC')
    }
  }

  return (
    <div className="modal show" id="odcModal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{initial && initial.id ? 'Edit ODC' : 'Tambah ODC'}</h2>
          <span className="close" onClick={onClose}>&times;</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Nama ODC:</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: ODC-CKR-001" required />
            </div>
            <div className="form-group">
              <label>Pilih PON Card:</label>
              <select value={ponId} onChange={e => setPonId(e.target.value)} required>
                <option value="">Pilih PON...</option>
                {sources.map(pon => (
                  <option key={pon.id} value={pon.id}>
                    POP: {pon.pop_name} → OLT: {pon.olt_name} → PON {pon.card_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Pilih Port PON:</label>
              <select name="odcPonPort" value={selectedPort} onChange={e => setSelectedPort(e.target.value)} required>
                <option value="">Pilih port...</option>
                {ports.map(port => (
                  <option key={port.port_number} value={port.port_number}>
                    {port.port_number}{port.status === 'used' ? ' (dipakai)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Koordinat (latitude, longitude):</label>
              <input type="text" value={coordinates} onChange={e => setCoordinates(e.target.value)} placeholder="Contoh: -6.208800, 106.845600" required />
            </div>
            <div className="form-group">
              <label>Kapasitas Port:</label>
              <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} min="1" max="288" />
            </div>
            <div className="form-group">
              <label>Keterangan:</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows="3"></textarea>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
