import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  loadPOPs,
  loadOLTs,
  loadPONs,
  loadPONPorts,
  savePop,
  deletePop,
  saveOlt,
  deleteOlt,
  savePon,
  deletePon,
  savePortConfig
} from '../api'

const initialPopForm = {
  id: '',
  name: '',
  code: '',
  lat: '',
  lng: '',
  location: '',
  address: '',
  description: ''
}

const initialOltForm = {
  id: '',
  pop_id: '',
  name: '',
  model: '',
  ip_address: '',
  management_port: 22,
  total_ports: 16,
  total_pon_ports: 4,
  location: '',
  description: ''
}

const initialPonForm = {
  id: '',
  olt_id: '',
  card_number: 1,
  name: '',
  port_count: 8,
  status: 'active',
  description: ''
}

const initialPortForm = {
  pon_id: '',
  port_number: '',
  status: 'available',
  target_odc_id: '',
  description: ''
}

export default function PopManagementPage({ user }) {
  const navigate = useNavigate()
  const [pops, setPops] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [expandedPops, setExpandedPops] = useState(new Set())
  const [expandedPons, setExpandedPons] = useState(new Set())
  const [oltsByPop, setOltsByPop] = useState({})
  const [ponsByOlt, setPonsByOlt] = useState({})
  const [portsByPon, setPortsByPon] = useState({})
  const [popForm, setPopForm] = useState(initialPopForm)
  const [oltForm, setOltForm] = useState(initialOltForm)
  const [ponForm, setPonForm] = useState(initialPonForm)
  const [portForm, setPortForm] = useState(initialPortForm)
  const [visibleModal, setVisibleModal] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const items = await loadPOPs()
    if (!items) {
      navigate('/login', { replace: true })
      return
    }
    setPops(items)
    setLoading(false)
  }

  async function refreshPOPs() {
    const items = await loadPOPs()
    setPops(items || [])
  }

  async function loadOLTsForPop(popId) {
    const olts = await loadOLTs(popId)
    setOltsByPop(prev => ({ ...prev, [popId]: olts || [] }))
    if (Array.isArray(olts)) {
      olts.forEach(olt => loadPONsForOlt(olt.id))
    }
  }

  async function loadPONsForOlt(oltId) {
    const pons = await loadPONs(oltId)
    setPonsByOlt(prev => ({ ...prev, [oltId]: pons || [] }))
  }

  async function loadPONPortsForPon(ponId) {
    const ports = await loadPONPorts(ponId)
    setPortsByPon(prev => ({ ...prev, [ponId]: ports || [] }))
  }

  function togglePop(popId) {
    const next = new Set(expandedPops)
    if (next.has(popId)) {
      next.delete(popId)
    } else {
      next.add(popId)
      if (!oltsByPop[popId]) {
        loadOLTsForPop(popId)
      }
    }
    setExpandedPops(next)
  }

  function togglePon(ponId, oltId) {
    const next = new Set(expandedPons)
    if (next.has(ponId)) {
      next.delete(ponId)
    } else {
      next.add(ponId)
      if (!portsByPon[ponId]) {
        loadPONPortsForPon(ponId)
      }
    }
    setExpandedPons(next)
  }

  function showMessage(text, type = 'success') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  function openPopModal(pop = null) {
    if (pop) {
      setPopForm({
        id: pop.id,
        name: pop.name || '',
        code: pop.code || '',
        lat: pop.lat || '',
        lng: pop.lng || '',
        location: pop.location || '',
        address: pop.address || '',
        description: pop.description || ''
      })
    } else {
      setPopForm(initialPopForm)
    }
    setVisibleModal('pop')
  }

  function openOltModal(popId, popName, olt = null) {
    if (olt) {
      setOltForm({
        id: olt.id,
        pop_id: popId,
        name: olt.name || '',
        model: olt.model || '',
        ip_address: olt.ip_address || '',
        management_port: olt.management_port || 22,
        total_ports: olt.total_ports || 16,
        total_pon_ports: olt.total_pon_ports || 4,
        location: olt.location || '',
        description: olt.description || ''
      })
    } else {
      setOltForm({ ...initialOltForm, pop_id: popId })
    }
    setVisibleModal('olt')
  }

  function openPonModal(oltId, oltName, pon = null) {
    if (pon) {
      setPonForm({
        id: pon.id,
        olt_id: oltId,
        card_number: pon.card_number || 1,
        name: pon.name || '',
        port_count: pon.port_count || 8,
        status: pon.status || 'active',
        description: pon.description || ''
      })
    } else {
      setPonForm({ ...initialPonForm, olt_id: oltId })
    }
    setVisibleModal('pon')
  }

  function openPortConfig(ponId, portNumber, currentStatus, targetOdcId) {
    setPortForm({
      pon_id: ponId,
      port_number: portNumber,
      status: currentStatus,
      target_odc_id: targetOdcId || '',
      description: ''
    })
    setVisibleModal('port')
  }

  function closeModal() {
    setVisibleModal('')
  }

  async function submitPop(event) {
    event.preventDefault()
    const data = {
      name: popForm.name,
      code: popForm.code,
      lat: parseFloat(popForm.lat),
      lng: parseFloat(popForm.lng),
      location: popForm.location,
      address: popForm.address,
      description: popForm.description
    }
    if (!data.name || !data.location || Number.isNaN(data.lat) || Number.isNaN(data.lng)) {
      showMessage('Nama, lokasi, dan koordinat wajib diisi', 'error')
      return
    }
    const response = await savePop(popForm.id, data)
    if (response && !response.error) {
      showMessage('POP berhasil disimpan')
      closeModal()
      refreshPOPs()
    } else {
      showMessage(response?.error || 'Gagal menyimpan POP', 'error')
    }
  }

  async function submitOlt(event) {
    event.preventDefault()
    const data = {
      pop_id: oltForm.pop_id,
      name: oltForm.name,
      model: oltForm.model,
      ip_address: oltForm.ip_address,
      management_port: Number(oltForm.management_port),
      total_ports: Number(oltForm.total_ports),
      total_pon_ports: Number(oltForm.total_pon_ports),
      location: oltForm.location,
      description: oltForm.description
    }
    if (!data.name) {
      showMessage('Nama OLT harus diisi', 'error')
      return
    }
    const response = await saveOlt(oltForm.id, data)
    if (response && !response.error) {
      showMessage('OLT berhasil disimpan')
      closeModal()
      refreshPOPs()
    } else {
      showMessage(response?.error || 'Gagal menyimpan OLT', 'error')
    }
  }

  async function submitPon(event) {
    event.preventDefault()
    const data = {
      olt_id: ponForm.olt_id,
      card_number: Number(ponForm.card_number),
      name: ponForm.name,
      port_count: Number(ponForm.port_count),
      status: ponForm.status,
      description: ponForm.description
    }
    if (!data.card_number) {
      showMessage('Nomor card harus diisi', 'error')
      return
    }
    const response = await savePon(ponForm.id, data)
    if (response && !response.error) {
      showMessage('PON Card berhasil disimpan')
      closeModal()
      refreshPOPs()
    } else {
      showMessage(response?.error || 'Gagal menyimpan PON', 'error')
    }
  }

  async function submitPortConfig(event) {
    event.preventDefault()
    const response = await savePortConfig(portForm)
    if (response && !response.error) {
      showMessage('Konfigurasi port berhasil disimpan')
      closeModal()
      refreshPOPs()
    } else {
      showMessage(response?.error || 'Gagal menyimpan konfigurasi port', 'error')
    }
  }

  async function removePop(id, name) {
    if (!window.confirm(`Yakin ingin menghapus POP "${name}"? Ini akan menghapus OLT dan PON di dalamnya.`)) return
    const response = await deletePop(id)
    if (response && !response.error) {
      showMessage('POP berhasil dihapus')
      refreshPOPs()
    } else {
      showMessage(response?.error || 'Gagal menghapus POP', 'error')
    }
  }

  async function removeOlt(id, name) {
    if (!window.confirm(`Yakin ingin menghapus OLT "${name}"?`)) return
    const response = await deleteOlt(id)
    if (response && !response.error) {
      showMessage('OLT berhasil dihapus')
      refreshPOPs()
    } else {
      showMessage(response?.error || 'Gagal menghapus OLT', 'error')
    }
  }

  async function removePon(id) {
    if (!window.confirm('Yakin ingin menghapus PON Card ini?')) return
    const response = await deletePon(id)
    if (response && !response.error) {
      showMessage('PON Card berhasil dihapus')
      refreshPOPs()
    } else {
      showMessage(response?.error || 'Gagal menghapus PON', 'error')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Manajemen POP, OLT & PON</h1>
          <p>Kelola infrastruktur POP, OLT, dan PON dalam aplikasi Fiber Manager.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/')}>Kembali ke Peta</button>
          <button className="btn btn-primary" type="button" onClick={() => openPopModal()}>Tambah POP</button>
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="pops-grid">
        {loading ? (
          <div className="loading">Memuat data...</div>
        ) : pops.length === 0 ? (
          <div className="empty-message">Belum ada POP. Klik "Tambah POP" untuk memulai.</div>
        ) : (
          pops.map(pop => (
            <div key={pop.id} className="pop-card">
              <div className="pop-header" onClick={() => togglePop(pop.id)}>
                <div>
                  <h3><i className="fas fa-building" /> {pop.name}</h3>
                  {pop.code && <span className="pop-code">{pop.code}</span>}
                </div>
                <div>
                  <span className="pop-badge">{(oltsByPop[pop.id] || []).length} OLT</span>
                  <i className={`fas fa-chevron-down chevron ${expandedPops.has(pop.id) ? 'rotated' : ''}`} />
                </div>
              </div>

              {expandedPops.has(pop.id) && (
                <div className="pop-body">
                  <div className="pop-info"><i className="fas fa-map-marker-alt" /> {pop.location || '-'}</div>
                  <div className="pop-info"><i className="fas fa-coordinates" /> {pop.lat}, {pop.lng}</div>
                  {pop.address && <div className="pop-info"><i className="fas fa-address-card" /> {pop.address}</div>}
                  {pop.description && <div className="pop-info"><i className="fas fa-info-circle" /> {pop.description}</div>}
                  <div className="card-actions">
                    <button className="btn btn-success btn-sm" type="button" onClick={() => openOltModal(pop.id, pop.name)}>Tambah OLT</button>
                    <button className="btn btn-warning btn-sm" type="button" onClick={() => openPopModal(pop)}>Edit POP</button>
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => removePop(pop.id, pop.name)}>Hapus POP</button>
                  </div>
                  <hr />
                  <div className="section-title">Daftar OLT</div>
                  <div id={`oltList-${pop.id}`}>
                    {oltsByPop[pop.id] && oltsByPop[pop.id].length === 0 ? (
                      <div className="empty-message">Belum ada OLT. Klik "Tambah OLT" untuk menambahkan.</div>
                    ) : (
                      (oltsByPop[pop.id] || []).map(olt => {
                        const pons = ponsByOlt[olt.id] || []
                        return (
                          <div key={olt.id} className="olt-card">
                            <div className="olt-header">
                              <div className="olt-name"><i className="fas fa-server" /> {olt.name}</div>
                              <div>
                                <button className="btn btn-info btn-sm" type="button" onClick={() => openPonModal(olt.id, olt.name)}>Tambah PON</button>
                                <button className="btn btn-warning btn-sm" type="button" onClick={() => openOltModal(pop.id, pop.name, olt)}>Edit</button>
                                <button className="btn btn-danger btn-sm" type="button" onClick={() => removeOlt(olt.id, olt.name)}>Hapus</button>
                              </div>
                            </div>
                            <div className="olt-stats">
                              <span className="olt-stat"><i className="fas fa-plug" /> Total Port: {olt.total_ports || 16}</span>
                              <span className="olt-stat"><i className="fas fa-layer-group" /> PON Card: {olt.total_pon_ports || 0}</span>
                            </div>
                            {olt.model && <div className="pop-info"><i className="fas fa-microchip" /> Model: {olt.model}</div>}
                            {olt.ip_address && <div className="pop-info"><i className="fas fa-network-wired" /> IP: {olt.ip_address}:{olt.management_port || 22}</div>}
                            <div className="section-title" style={{ marginTop: 15 }}>PON Cards</div>
                            {pons.length === 0 ? (
                              <div className="empty-message">Belum ada PON Card untuk OLT ini.</div>
                            ) : (
                              pons.map(pon => (
                                <div key={pon.id} className="pon-card">
                                  <div className="pon-header" onClick={() => togglePon(pon.id, olt.id)}>
                                    <div>
                                      <h4><i className="fas fa-layer-group" /> PON Card {pon.card_number} - {pon.name || `Card ${pon.card_number}`}</h4>
                                    </div>
                                    <div>
                                      <span className={`badge badge-${pon.status === 'active' ? 'active' : 'inactive'}`}>{pon.status}</span>
                                      <i className={`fas fa-chevron-down chevron-pon ${expandedPons.has(pon.id) ? 'rotated' : ''}`} />
                                    </div>
                                  </div>
                                  {expandedPons.has(pon.id) && (
                                    <div className="pon-body">
                                      <div className="olt-stats" style={{ marginBottom: 10 }}>
                                        <span className="olt-stat"><i className="fas fa-plug" /> Total Port: {pon.port_count || 8}</span>
                                        <span className="olt-stat" style={{ background: '#c6f6d5' }}><i className="fas fa-check-circle" /> Tersedia: {pon.available_ports || 0}</span>
                                        <span className="olt-stat" style={{ background: '#fed7d7' }}><i className="fas fa-users" /> Terpakai: {pon.used_ports || 0}</span>
                                      </div>
                                      {pon.description && <div className="pop-info"><i className="fas fa-info-circle" /> {pon.description}</div>}
                                      <div className="port-grid">
                                        {(portsByPon[pon.id] || []).length === 0 ? (
                                          <div className="empty-message">Memuat port...</div>
                                        ) : (
                                          portsByPon[pon.id].map(port => (
                                            <button
                                              key={port.port_number}
                                              type="button"
                                              className={`port-item ${port.status}`}
                                              title={port.status === 'used' ? `Port ${port.port_number}: Terhubung ke ODC ${port.odc_name || '?'}` : `Port ${port.port_number}: ${port.status}`}
                                              onClick={() => openPortConfig(pon.id, port.port_number, port.status, port.target_odc_id)}
                                            >
                                              {port.port_number}
                                            </button>
                                          ))
                                        )}
                                      </div>
                                      <div className="card-actions" style={{ marginTop: 10 }}>
                                        <button className="btn btn-warning btn-xs" type="button" onClick={() => openPonModal(olt.id, olt.name, pon)}>Edit PON</button>
                                        <button className="btn btn-danger btn-xs" type="button" onClick={() => removePon(pon.id)}>Hapus PON</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {visibleModal === 'pop' && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{popForm.id ? 'Edit POP' : 'Tambah POP'}</h2>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            <form onSubmit={submitPop}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nama POP *</label>
                    <input value={popForm.name} onChange={e => setPopForm(prev => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Kode POP</label>
                    <input value={popForm.code} onChange={e => setPopForm(prev => ({ ...prev, code: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Latitude *</label>
                    <input type="number" step="any" value={popForm.lat} onChange={e => setPopForm(prev => ({ ...prev, lat: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Longitude *</label>
                    <input type="number" step="any" value={popForm.lng} onChange={e => setPopForm(prev => ({ ...prev, lng: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Lokasi *</label>
                  <input value={popForm.location} onChange={e => setPopForm(prev => ({ ...prev, location: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Alamat Lengkap</label>
                  <textarea rows="2" value={popForm.address} onChange={e => setPopForm(prev => ({ ...prev, address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Keterangan</label>
                  <textarea rows="2" value={popForm.description} onChange={e => setPopForm(prev => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan POP</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {visibleModal === 'olt' && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{oltForm.id ? 'Edit OLT' : 'Tambah OLT'}</h2>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            <form onSubmit={submitOlt}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama OLT *</label>
                  <input value={oltForm.name} onChange={e => setOltForm(prev => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input value={oltForm.model} onChange={e => setOltForm(prev => ({ ...prev, model: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>IP Address</label>
                    <input value={oltForm.ip_address} onChange={e => setOltForm(prev => ({ ...prev, ip_address: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Management Port</label>
                    <input type="number" value={oltForm.management_port} onChange={e => setOltForm(prev => ({ ...prev, management_port: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Jumlah Port Total</label>
                    <input type="number" value={oltForm.total_ports} onChange={e => setOltForm(prev => ({ ...prev, total_ports: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Jumlah PON Card</label>
                    <input type="number" value={oltForm.total_pon_ports} onChange={e => setOltForm(prev => ({ ...prev, total_pon_ports: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Lokasi</label>
                  <input value={oltForm.location} onChange={e => setOltForm(prev => ({ ...prev, location: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Keterangan</label>
                  <textarea rows="2" value={oltForm.description} onChange={e => setOltForm(prev => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan OLT</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {visibleModal === 'pon' && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{ponForm.id ? 'Edit PON Card' : 'Tambah PON Card'}</h2>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            <form onSubmit={submitPon}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Card Number *</label>
                  <input type="number" value={ponForm.card_number} onChange={e => setPonForm(prev => ({ ...prev, card_number: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Nama Card</label>
                  <input value={ponForm.name} onChange={e => setPonForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Jumlah Port</label>
                  <input type="number" value={ponForm.port_count} onChange={e => setPonForm(prev => ({ ...prev, port_count: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={ponForm.status} onChange={e => setPonForm(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Keterangan</label>
                  <textarea rows="2" value={ponForm.description} onChange={e => setPonForm(prev => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan PON</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {visibleModal === 'port' && (
        <div className="modal show">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>Konfigurasi Port PON</h3>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            <form onSubmit={submitPortConfig}>
              <div className="modal-body">
                <input type="hidden" value={portForm.pon_id} />
                <input type="hidden" value={portForm.port_number} />

                <div className="info-card">
                  <p><i className="fas fa-info-circle" /> <strong>Informasi Port:</strong></p>
                  <p>PON ID: {portForm.pon_id} | Port: {portForm.port_number}</p>
                </div>
                <div className="form-group">
                  <label>Status Port</label>
                  <select value={portForm.status} onChange={e => setPortForm(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="available">Available (Tersedia)</option>
                    <option value="used">Used (Terpakai)</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Terhubung ke ODC</label>
                  <input value={portForm.target_odc_id} onChange={e => setPortForm(prev => ({ ...prev, target_odc_id: e.target.value }))} placeholder="ID ODC tujuan" />
                </div>
                <div className="form-group">
                  <label>Keterangan</label>
                  <textarea rows="2" value={portForm.description} onChange={e => setPortForm(prev => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
