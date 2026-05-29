import React, { useEffect, useRef } from 'react'
import { parseCoordinates } from '../utils'

const deviceIconConfig = {
  odc: {
    html: '<i class="fas fa-hdd" style="font-size: 26px; color: #3182ce;"></i>',
    className: 'device-marker odc'
  },
  odp: {
    html: '<i class="fas fa-project-diagram" style="font-size: 26px; color: #dd6b20;"></i>',
    className: 'device-marker odp'
  }
}

function getDeviceIcon(L, type) {
  const config = deviceIconConfig[type] || {
    html: '<i class="fas fa-map-marker-alt" style="font-size: 26px; color: #718096;"></i>',
    className: 'device-marker default'
  }
  return L.divIcon({
    html: config.html,
    className: config.className,
    iconSize: [26, 26],
    iconAnchor: [13, 26]
  })
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

      const marker = window.L.marker([lat, lng], { icon: getDeviceIcon(window.L, device.type) }).addTo(markersLayer)
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
