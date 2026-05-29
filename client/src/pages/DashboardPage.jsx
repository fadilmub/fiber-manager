import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import Sidebar from '../components/Sidebar'
import InfoPanel from '../components/InfoPanel'
import OdpModal from '../components/modals/OdpModal'
import OdcModal from '../components/modals/OdcModal'
import PopModal from '../components/modals/PopModal'
import OltModal from '../components/modals/OltModal'
import PortModal from '../components/modals/PortModal'
import CoordinatePickerModal from '../components/modals/CoordinatePickerModal'
import Lightbox from '../components/Lightbox'
import { loadDevices, logout } from '../api'

export default function DashboardPage({ user, onLogout }) {
  const navigate = useNavigate()
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [showOdp, setShowOdp] = useState(false)
  const [showOdc, setShowOdc] = useState(false)
  const [showPop, setShowPop] = useState(false)
  const [showOlt, setShowOlt] = useState(false)
  const [showPort, setShowPort] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [editingDevice, setEditingDevice] = useState(null)
  const [coordinateQuery, setCoordinateQuery] = useState('')
  const [coordinateSearchCount, setCoordinateSearchCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initialize() {
      const { odc, odp } = await loadDevices()
      const normalized = [
        ...odc.map(item => ({ ...item, type: 'odc' })),
        ...odp.map(item => ({ ...item, type: 'odp' }))
      ]
      setDevices(normalized)
      setLoading(false)
    }

    initialize()
  }, [])

  async function refreshDevices() {
    const { odc, odp } = await loadDevices()
    const normalized = [
      ...odc.map(item => ({ ...item, type: 'odc' })),
      ...odp.map(item => ({ ...item, type: 'odp' }))
    ]
    setDevices(normalized)
  }

  const filteredDevices = devices.filter(device => {
    const query = searchQuery.toLowerCase()
    const matchesQuery = !query || device.name.toLowerCase().includes(query) || (device.location || '').toLowerCase().includes(query)
    const matchesFilter = activeFilter === 'all' || device.type === activeFilter
    return matchesQuery && matchesFilter
  })

  function handleSearch(q) {
    setSearchQuery(q)
  }

  function handleFilter(filter) {
    setActiveFilter(filter)
  }

  function handleLogout() {
    logout().finally(() => {
      onLogout?.()
      navigate('/login', { replace: true })
    })
  }

  function handleEditDevice(device) {
    setEditingDevice(device)
    if (device.type === 'odc') {
      setShowOdc(true)
    } else if (device.type === 'odp') {
      setShowOdp(true)
    }
  }

  function closeOdcModal() {
    setShowOdc(false)
    setEditingDevice(null)
  }

  function closeOdpModal() {
    setShowOdp(false)
    setEditingDevice(null)
  }

  function handleCoordinateSearch() {
    setCoordinateSearchCount(prev => prev + 1)
  }

  return (
    <div className="app-container">
      <Sidebar
        devices={filteredDevices}
        user={user}
        onAddODP={() => setShowOdp(true)}
        onAddODC={() => setShowOdc(true)}
        onSearch={handleSearch}
        onFilterChange={handleFilter}
        onSelectDevice={setSelectedDevice}
        onLogout={handleLogout}
      />

      <main className="map-container">
        <div id="map" style={{ height: '100%' }} />
        <div className="coordinate-search">
          <input
            id="searchCoordinate"
            value={coordinateQuery}
            onChange={e => setCoordinateQuery(e.target.value)}
            placeholder="Cari koordinat... (-6.2088, 106.8456)"
            onKeyDown={e => e.key === 'Enter' && handleCoordinateSearch()}
          />
          <button type="button" onClick={handleCoordinateSearch}><i className="fas fa-search" /></button>
        </div>
        <InfoPanel device={selectedDevice} onClose={() => setSelectedDevice(null)} onEdit={handleEditDevice} />
      </main>

      <MapView
        devices={filteredDevices}
        onSelectDevice={setSelectedDevice}
        coordinateQuery={coordinateQuery}
        searchCount={coordinateSearchCount}
      />

      <OdpModal visible={showOdp} initial={editingDevice?.type === 'odp' ? editingDevice : null} onClose={closeOdpModal} onSaved={() => { refreshDevices(); setEditingDevice(null) }} />
      <OdcModal visible={showOdc} initial={editingDevice?.type === 'odc' ? editingDevice : null} onClose={closeOdcModal} onSaved={() => { refreshDevices(); setEditingDevice(null) }} />
      <PopModal visible={showPop} onClose={() => setShowPop(false)} onSaved={refreshDevices} />
      <OltModal visible={showOlt} onClose={() => setShowOlt(false)} onSaved={refreshDevices} />
      <PortModal visible={showPort} onClose={() => setShowPort(false)} onSaved={refreshDevices} />
      <CoordinatePickerModal visible={showPicker} onClose={() => setShowPicker(false)} />
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      {loading && <div className="loading-overlay">Memuat data...</div>}
    </div>
  )
}
