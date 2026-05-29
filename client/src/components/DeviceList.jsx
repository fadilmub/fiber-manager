import React from 'react'

export default function DeviceList({ devices = [], onSelect }) {
  return (
    <div>
      {devices.map(device => (
        <div key={`${device.type}-${device.id}`} className={`device-item ${device.type}`} onClick={() => onSelect(device)}>
          <div className="device-header">
            <span className="device-name">{device.name}</span>
            <span className="device-type">{device.type.toUpperCase()}</span>
          </div>
          <div className="device-info">{device.location}</div>
        </div>
      ))}
    </div>
  )
}
