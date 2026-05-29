import React, { useEffect, useState } from 'react'
import { createOdp, loadDevices, loadODCPorts, updateOdp } from '../../api'

export default function OdpModal({ visible, onClose, initial = null, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [sourceType, setSourceType] = useState('none')
  const [selectedPort, setSelectedPort] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [location, setLocation] = useState('')
  const [totalPorts, setTotalPorts] = useState(8)
  const [description, setDescription] = useState('')
  const [odcs, setOdcs] = useState([])
  const [availablePorts, setAvailablePorts] = useState([])

  useEffect(() => {
    if (!visible) return

    async function load() {
      const { odc } = await loadDevices()
      setOdcs(Array.isArray(odc) ? odc : [])
      setAvailablePorts([])
    }

    load()
    if (initial) {
      setName(initial.name || '')
      setSourceType(initial.source_type || 'none')
      setSourceId(initial.source_id || '')
      setSelectedPort(initial.port_number_in_odc ? `${initial.port_number_in_odc}` : '')
      setCoordinates(`${initial.lat || ''}, ${initial.lng || ''}`)
      setLocation(initial.location || '')
      setTotalPorts(initial.total_ports || 8)
      setDescription(initial.description || '')
      setAvailablePorts([])
    } else {
      setName('')
      setSourceId('')
      setSourceType('none')
      setSelectedPort('')
      setCoordinates('')
      setLocation('')
      setTotalPorts(8)
      setDescription('')
      setAvailablePorts([])
    }
  }, [visible, initial])

  useEffect(() => {
    if (!visible || sourceType !== 'odc' || !sourceId) {
      setAvailablePorts([])
      return
    }

    async function loadPorts() {
      const result = await loadODCPorts(sourceId)
      const availablePorts = Array.isArray(result) ? result.filter(port => port.status === 'available') : []
      if (initial && initial.source_type === 'odc' && `${initial.source_id}` === `${sourceId}` && initial.port_number_in_odc) {
        const exists = availablePorts.some(port => `${port.port_number}` === `${initial.port_number_in_odc}`)
        if (!exists) {
          availablePorts.unshift({ port_number: initial.port_number_in_odc, status: 'used' })
        }
      }
      setAvailablePorts(availablePorts)
      if (initial && initial.source_type === 'odc' && `${initial.source_id}` === `${sourceId}` && initial.port_number_in_odc) {
        setSelectedPort(`${initial.port_number_in_odc}`)
      }
    }

    loadPorts()
  }, [visible, sourceType, sourceId, initial])

  if (!visible) return null

  async function handleSubmit(e) {
    e.preventDefault()
    const [lat, lng] = (coordinates || '').split(',').map(value => value.trim())

    if (!name || !coordinates) {
      alert('Nama ODP dan koordinat wajib diisi')
      return
    }

    const data = {
      name,
      source_type: sourceType === 'odc' ? 'odc' : null,
      source_id: sourceType === 'odc' ? sourceId || null : null,
      port_number_in_odc: sourceType === 'odc' ? Number(selectedPort) || null : null,
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      location,
      total_ports: Number(totalPorts) || 8,
      description
    }

    if (sourceType === 'odc' && !data.port_number_in_odc) {
      alert('Pilih port ODC yang tersedia')
      return
    }

    setLoading(true)
    const res = initial && initial.id ? await updateOdp(initial.id, data) : await createOdp(data)
    setLoading(false)

    if (res && !res.error) {
      onSaved?.()
      onClose()
    } else {
      alert(res?.error || 'Gagal menyimpan ODP')
    }
  }

  return (
    <div className="modal show" id="odpModal">
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="modalTitle">{initial && initial.id ? 'Edit ODP' : 'Tambah ODP'}</h2>
          <span className="close" onClick={onClose}>&times;</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Nama ODP:</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: ODP-FT-001" required />
            </div>
            <div className="form-group">
              <label>Sumber:</label>
              <select value={sourceType} onChange={e => setSourceType(e.target.value)}>
                <option value="none">Tanpa sumber</option>
                <option value="odc">ODC</option>
              </select>
            </div>
            {sourceType === 'odc' && (
              <>
                <div className="form-group">
                  <label>Pilih ODC sumber:</label>
                  <select value={sourceId} onChange={e => setSourceId(e.target.value)} required>
                    <option value="">Pilih ODC...</option>
                    {odcs.map(odc => (
                      <option key={odc.id} value={odc.id}>{odc.name} ({odc.source_path || 'sumber tidak tersedia'})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Pilih port ODC:</label>
                  <select name="odcPort" value={selectedPort} onChange={e => setSelectedPort(e.target.value)} required>
                    <option value="">Pilih port...</option>
                    {availablePorts.map(port => (
                      <option key={port.port_number} value={port.port_number}>
                        {port.port_number}{port.status === 'used' ? ' (dipakai)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="form-group">
              <label>Koordinat (latitude, longitude):</label>
              <input type="text" value={coordinates} onChange={e => setCoordinates(e.target.value)} placeholder="Contoh: -6.208800, 106.845600" required />
              <div className="coordinate-actions" style={{marginTop:8}}>
                <button type="button" className="btn btn-secondary btn-sm">Klik di Peta</button>
                <button type="button" className="btn btn-secondary btn-sm">Gunakan Lokasi Saat Ini</button>
              </div>
            </div>
            <div className="form-group">
              <label>Alamat Lokasi:</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Contoh: Jl. Raya Cikarang No. 123" />
            </div>
            <div className="form-group">
              <label>Jumlah Port:</label>
              <input type="number" value={totalPorts} onChange={e => setTotalPorts(e.target.value)} min="1" max="48" />
            </div>
            <div className="form-group">
              <label>Keterangan:</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows="3" placeholder="Tambahkan keterangan..." />
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
