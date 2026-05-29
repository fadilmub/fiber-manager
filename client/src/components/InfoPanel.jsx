import React from 'react'

export default function InfoPanel({ device, onClose, onEdit }) {
  if (!device) return null
  const isODC = device.type === 'odc'
  const canEdit = device.type === 'odc' || device.type === 'odp'

  return (
    <div className={`info-panel show`} id="infoPanel">
      <div className="info-header">
        <h3 id="infoTitle">{device.name}</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="info-content" id="infoContent">
        <p><strong>Tipe:</strong> {isODC ? 'ODC' : 'ODP'}</p>
        <p><strong>Lokasi:</strong> {device.location}</p>
        <p><strong>Koordinat:</strong> {parseFloat(device.lat).toFixed(6)}, {parseFloat(device.lng).toFixed(6)}</p>
        {isODC ? (
          <>
            <p><strong>Kapasitas:</strong> {device.capacity}</p>
            <p><strong>Terpakai:</strong> {device.used_ports || 0}</p>
            <p><strong>ODP Terhubung:</strong> {device.connected_odps || 0}</p>
          </>
        ) : (
          <>
            <p><strong>Sumber:</strong> {device.source_name || 'Tidak terhubung'}</p>
            <p><strong>Total Port:</strong> {device.total_ports}</p>
            <p><strong>Port Tersedia:</strong> {device.available_ports}</p>
          </>
        )}
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
