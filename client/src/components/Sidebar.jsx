import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DeviceList from './DeviceList'

export default function Sidebar({ devices = [], user, onAddODP, onAddODC, onSearch, onFilterChange, onSelectDevice, onLogout }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    onSearch(query)
  }, [query, onSearch])

  function handleFilter(filter) {
    setActiveFilter(filter)
    onFilterChange(filter)
  }

  return (
    <div className="sidebar open" id="sidebar">
      <div className="sidebar-header">
        <h2><i className="fas fa-network-wired"></i> Fiber Manager</h2>
        <div className="user-info">
          <span id="userDisplayName">Loading...</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{user ? `${user.full_name || user.username} (${user.role})` : 'Loading...'}</div>
            {user?.role === 'admin' && (
              <button type="button" className="btn-logout" onClick={() => navigate('/users')} title="Manajemen User"><i className="fas fa-users-cog"></i></button>
            )}
            <button className="btn-logout" onClick={onLogout} title="Logout"><i className="fas fa-sign-out-alt"></i></button>
          </div>
        </div>
      </div>
      <div className="sidebar-content">
        <div className="action-buttons" id="actionButtons">
          <button className="btn btn-primary" onClick={onAddODP}><i className="fas fa-plus-circle"></i> Tambah ODP</button>
          <button className="btn btn-secondary" onClick={onAddODC}><i className="fas fa-plus-circle"></i> Tambah ODC</button>
          <button className="btn btn-info" type="button" onClick={() => navigate('/pop-management')}><i className="fas fa-building"></i> POP Management</button>
          {user?.role === 'admin' && (
            <button className="btn btn-warning" type="button" onClick={() => navigate('/users')}><i className="fas fa-users"></i> User Management</button>
          )}
        </div>
        <div className="filter-section">
          <input className="search-input" id="searchInput" placeholder="Cari ODP/ODC..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="filter-buttons">
            <button type="button" className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => handleFilter('all')}>Semua</button>
            <button type="button" className={`filter-btn ${activeFilter === 'odc' ? 'active' : ''}`} onClick={() => handleFilter('odc')}>ODC</button>
            <button type="button" className={`filter-btn ${activeFilter === 'odp' ? 'active' : ''}`} onClick={() => handleFilter('odp')}>ODP</button>
          </div>
        </div>
        <div className="customer-search-section">
          <h4><i className="fas fa-users"></i> Cari Pelanggan</h4>
          <div className="search-box">
            <input type="text" id="customerSearchInput" placeholder="Nama pelanggan..." />
            <button id="customerSearchBtn"><i className="fas fa-search"></i></button>
          </div>
          <div id="customerSearchResults" className="customer-results"></div>
        </div>
        <DeviceList devices={devices} onSelect={onSelectDevice} />
      </div>
    </div>
  )
}
