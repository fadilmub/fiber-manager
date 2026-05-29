import React, { useEffect, useState } from 'react'
import { getOdc, getOdp } from '../api'

export default function InfoPanel({ device, onClose, onEdit }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!device) {
      setDetail(null)
      return
    }

    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = device.type === 'odc' ? await getOdc(device.id) : await getOdp(device.id)
        if (mounted) setDetail(res)
      } catch (err) {
        console.error('Failed to load detail', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [device])

  if (!device) return null
  const isODC = device.type === 'odc'
  const canEdit = device.type === 'odc' || device.type === 'odp'

  const renderOdc = () => {
    const d = detail || device
    return (
      <>
        <p><strong>Kapasitas:</strong> {d.capacity}</p>
        <p><strong>Terpakai:</strong> {d.used_ports || 0}</p>
        <p><strong>ODP Terhubung:</strong> {d.connected_odps || 0}</p>
        {detail && Array.isArray(detail.connected_odps_list) && (
          <div className="section-title">Daftar ODP Terhubung</div>
        )}
        {detail && Array.isArray(detail.connected_odps_list) && (
          <div className="port-grid">
            {detail.connected_odps_list.map(item => (
              <div key={item.odp_id || item.id || item.odp_name || item.port_number} className="port-item used">
                {`ODP ${item.odp_name || item.name || item.odp_id || item.id}`}<br/>
                <small>Port {item.port_number}</small>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  const renderOdp = () => {
    const d = detail || device
    return (
      <>
        <p><strong>Sumber:</strong> {d.source_name || 'Tidak terhubung'}</p>
        <p><strong>Total Port:</strong> {d.total_ports}</p>
        <p><strong>Port Tersedia:</strong> {d.available_ports}</p>

        {detail && Array.isArray(detail.ports) && (
          <>
            <div className="section-title">Visualisasi Port</div>
            <div className="port-grid">
              {detail.ports.map(port => (
                <div key={port.port_number} className={`port-item ${port.status}`} title={port.target || ''}>
                  {port.port_number}
                  {port.status === 'used' && port.target ? <div style={{fontSize:11, fontWeight:400, marginTop:6}}>{port.target}</div> : null}
                </div>
              ))}
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <div className={`info-panel show`} id="infoPanel">
      <div className="info-header">
        <h3 id="infoTitle">{device.name}</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="info-content" id="infoContent">
        {loading && <div className="loading">Memuat detail...</div>}
        <p><strong>Tipe:</strong> {isODC ? 'ODC' : 'ODP'}</p>
        <p><strong>Lokasi:</strong> {device.location}</p>
        <p><strong>Koordinat:</strong> {parseFloat(device.lat).toFixed(6)}, {parseFloat(device.lng).toFixed(6)}</p>
        {isODC ? renderOdc() : renderOdp()}
        {device.description && <p><strong>Keterangan:</strong> {device.description}</p>}
      </div>
      {canEdit && (
        <div className="info-footer">
          <button className="btn btn-secondary" onClick={() => onEdit?.(device)}>Edit</button>
        </div>
      )}
    </div>
  )
}
