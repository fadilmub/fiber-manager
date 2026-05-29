import React, { useEffect, useRef } from 'react'
import { parseCoordinates } from '../utils'

// PNG marker files placed under public/assets/icons
const deviceMarkerFiles = {
  odc: '/assets/icons/odc-icon.png',
  odp: {
    green: '/assets/icons/odp-green.png',
    yellow: '/assets/icons/odp-yellow.png',
    red: '/assets/icons/odp-red.png',
    grey: '/assets/icons/odp-grey.png'
  }
}

function getDeviceIcon(L, device) {
  if (!device || !L) return null
  // ODP: choose colored PNG based on available ports
  if (device.type === 'odp') {
    const total = Number(device.total_ports) || 8
    const available = Number(device.available_ports) || 0
    const ratio = total > 0 ? available / total : 0
    let url = deviceMarkerFiles.odp.grey
    if (ratio >= 0.75) url = deviceMarkerFiles.odp.green
    else if (ratio >= 0.4) url = deviceMarkerFiles.odp.yellow
    else url = deviceMarkerFiles.odp.red
    try {
      return L.icon({ iconUrl: url, iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36] })
    } catch (err) {
      console.warn('icon create failed', err)
    }
  }

  // ODC: use PNG but add colored ring based on usage
  if (device.type === 'odc') {
    const used = Number(device.used_ports) || 0
    const capacity = Number(device.capacity) || 24
    const ratio = capacity > 0 ? used / capacity : 0
    let cls = 'odc-ok'
    if (ratio >= 0.9) cls = 'odc-high'
    else if (ratio >= 0.6) cls = 'odc-medium'

    const imgUrl = deviceMarkerFiles.odc
    const html = `<div class="odc-marker ${cls}"><img src="${imgUrl}" width="36" height="36"/></div>`
    return L.divIcon({ html, className: 'odc-divicon', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -36] })
  }

  // fallback
  return L.divIcon({ html: '<i class="fas fa-map-marker-alt" style="font-size: 26px; color: #718096;"></i>', className: 'device-marker default', iconSize: [26, 26], iconAnchor: [13, 26] })
}

export default function MapView({ devices = [], onSelectDevice, coordinateQuery, searchCount }) {
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const connectionLinesRef = useRef([])
  const searchMarkerRef = useRef(null)

  useEffect(() => {
    if (!window.L) {
      console.error('Leaflet not found. Ensure CDN script is loaded.')
      return
    }

    const L = window.L
    const map = L.map('map').setView([-6.9664, 109.64695], 13)
    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: '© Google', maxZoom: 22, maxNativeZoom: 20
    }).addTo(map)

    mapRef.current = map
    markersLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const markersLayer = markersLayerRef.current
    if (!map || !markersLayer) return

    markersLayer.clearLayers()
    connectionLinesRef.current.forEach(line => line.remove())
    connectionLinesRef.current = []

    devices.forEach(device => {
      const lat = parseFloat(device.lat)
      const lng = parseFloat(device.lng)
      if (Number.isNaN(lat) || Number.isNaN(lng)) return

      const marker = window.L.marker([lat, lng], { icon: getDeviceIcon(window.L, device) }).addTo(markersLayer)
      marker.bindPopup(`<b>${device.name}</b><br/>${device.type.toUpperCase()} - ${device.location || ''}`)
      marker.on('click', () => {
        if (onSelectDevice) onSelectDevice(device)
      })

      if (device.type === 'odp' && device.source_id && device.source_type === 'odc') {
        const source = devices.find(item => item.type === 'odc' && `${item.id}` === `${device.source_id}`)
        if (source) {
          const path = [[lat, lng], [parseFloat(source.lat), parseFloat(source.lng)]]
          const line = window.L.polyline(path, { color: '#48bb78', weight: 3, opacity: 0.8, dashArray: '5, 5' }).addTo(map)
          connectionLinesRef.current.push(line)
        }
      }
    })
  }, [devices, onSelectDevice])

  useEffect(() => {
    if (!searchCount) return
    const map = mapRef.current
    if (!map) return

    const coords = parseCoordinates(coordinateQuery)
    if (!coords) {
      return
    }

    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current)
      searchMarkerRef.current = null
    }

    const icon = window.L.divIcon({
      html: '<i class="fas fa-map-marker-alt" style="font-size: 24px; color: #e53e3e;"></i>',
      className: 'temp-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 24]
    })

    searchMarkerRef.current = window.L.marker([coords.lat, coords.lng], { icon }).addTo(map)
    searchMarkerRef.current.bindPopup(`<b>Lokasi Pencarian</b><br/>${coords.lat}, ${coords.lng}`).openPopup()
    map.setView([coords.lat, coords.lng], 17)
  }, [coordinateQuery, searchCount])

  return null
}
