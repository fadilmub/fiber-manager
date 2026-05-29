import React, { useEffect } from 'react'

export default function CoordinatePickerModal({ visible, onClose }) {
  useEffect(() => {
    // coordinate picker map will be initialized by MapView when needed
  }, [visible])

  if (!visible) return null
  return (
    <div className={`modal show`} id="coordinatePickerModal">
      <div className="modal-content" style={{maxWidth:900}}>
        <div className="modal-header">
          <h2>Pilih Lokasi di Peta</h2>
          <span className="close" onClick={onClose}>&times;</span>
        </div>
        <div className="modal-body">
          <div id="coordinatePickerMap" className="coordinate-picker-map"></div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:12}}>
            <button type="button" className="btn btn-secondary btn-sm">Gunakan Lokasi Saat Ini</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    </div>
  )
}
