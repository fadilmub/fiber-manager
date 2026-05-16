// =============================================
// DEKLARASI GLOBAL - HANYA SEKALI DI SINI
// =============================================
const API_BASE = window.location.origin + '/fiber-manager/api';

// Global variables
let map;
let markersLayer;
let devices = { odc: [], odp: [] };
let currentEditingDevice = null;
let currentPortConfig = { deviceId: null, portNumber: null };
let odpMarkers = {};
let highlightedMarker = null;

// =============================================
// FUNGSI-FUNGSI MAP
// =============================================

// Initialize map
function initMap() {
    map = L.map('map').setView([-6.966409024897329, 109.6469502011238], 13);
        // Google Satellite Hybrid (satelit + label jalan)
    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '© Google',
        maxZoom: 22,
        maxNativeZoom: 20  // Zoom maksimal dari tile Google
    }).addTo(map);
    
    // Layer group untuk marker
    markersLayer = L.layerGroup().addTo(map);
/*    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    markersLayer = L.layerGroup().addTo(map); */
}

// Parse coordinate string to lat/lng
function parseCoordinates(coordString) {
    const cleaned = coordString.replace(/\s+/g, '');
    const parts = cleaned.split(',');
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
}

// Format coordinates for display
function formatCoordinates(lat, lng) {
    return `${lat}, ${lng}`;
}

// Search and zoom to coordinate
function searchAndZoom() {
    const input = document.getElementById('searchCoordinate');
    const coordString = input.value.trim();
    if (!coordString) {
        alert('Masukkan koordinat terlebih dahulu');
        return;
    }
    const coords = parseCoordinates(coordString);
    if (!coords) {
        alert('Format koordinat tidak valid!\n\nGunakan format: latitude, longitude\nContoh: -6.963707888562949, 109.64706473647041');
        return;
    }
    
    const tempMarker = L.marker([coords.lat, coords.lng], {
        icon: L.divIcon({
            html: '<i class="fas fa-map-marker-alt" style="font-size: 24px; color: #e53e3e;"></i>',
            className: 'temp-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 24]
        })
    }).addTo(map);
    
    tempMarker.bindPopup(`<b>Lokasi Pencarian</b><br>${coords.lat}, ${coords.lng}`).openPopup();
    setTimeout(() => { map.removeLayer(tempMarker); }, 10000);
    map.setView([coords.lat, coords.lng], 17);
}
// Generic fetch with auth
async function fetchWithAuth(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (response.status === 401) {
            window.location.href = 'login.html';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Load devices from API
async function loadDevices() {
    try {
        const [odcRes, odpRes] = await Promise.all([
            fetchWithAuth(`${API_BASE}/odc.php`),
            fetchWithAuth(`${API_BASE}/odp.php`)
        ]);
        
        if (!odcRes || !odpRes) return;
        
        const odcData = await odcRes.json();
        const odpData = await odpRes.json();
        
        devices.odc = Array.isArray(odcData) ? odcData : [];
        devices.odp = Array.isArray(odpData) ? odpData : [];
        
        refreshMapMarkers();
        refreshDeviceList();
    } catch (error) {
        console.error('Error loading devices:', error);
        alert('Gagal memuat data. Pastikan XAMPP berjalan dan API dapat diakses.');
    }
}


// =============================================
// FUNGSI UNTUK MENENTUKAN STATUS KAPASITAS ODP
// =============================================

/**
 * Menghitung persentase port yang tersedia
 * @param {number} available - Jumlah port tersedia
 * @param {number} total - Total port
 * @returns {string} Status: 'normal', 'warning', 'critical', 'full'
 */
function getODPStatus(available, total) {
    if (total === 0) return 'full';
    
    const percentage = (available / total) * 100;
    
    if (available === 0) return 'full';           // 0% tersedia = penuh
    if (percentage < 20) return 'critical';        // < 20% = kritis (merah)
    if (percentage <= 50) return 'warning';        // 20-50% = hampir penuh (kuning)
    return 'normal';                               // > 50% = normal (hijau)
}

/**
 * Mendapatkan filter CSS untuk mengubah warna PNG
 * @param {string} status - Status kapasitas ODP
 * @returns {string} CSS filter untuk warna yang sesuai
 */
function getColorFilter(status) {
    switch(status) {
        case 'normal':
            // Hijau - tanpa filter (gunakan PNG asli jika sudah hijau)
            return 'none';
        case 'warning':
            // Kuning/Oranye
            return 'hue-rotate(-30deg) saturate(2) brightness(1.1)';
        case 'critical':
            // Merah
            return 'hue-rotate(140deg) saturate(3) brightness(0.9)';
        case 'full':
            // Abu-abu gelap
            return 'grayscale(1) brightness(0.6)';
        default:
            return 'none';
    }
}

/**
 * Mendapatkan warna border/glow untuk marker
 * @param {string} status - Status kapasitas ODP
 * @returns {string} Warna dalam hex
 */
function getStatusColor(status) {
    switch(status) {
        case 'normal': return '#48bb78';    // Hijau
        case 'warning': return '#ecc94b';   // Kuning
        case 'critical': return '#f56565';  // Merah
        case 'full': return '#718096';      // Abu-abu
        default: return '#48bb78';
    }
}

// =============================================
// FUNGSI ICON DENGAN WARNA DINAMIS
// =============================================

// Create custom ODC icon (tetap satu warna - oranye)
function createODCIcon() {
    return L.divIcon({
        html: `
            <div style="
                width: 40px; 
                height: 40px; 
                background-image: url('assets/icons/odc-icon.png');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.3));
            "></div>
        `,
        className: 'custom-marker-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
}

// Create custom ODP icon DENGAN WARNA DINAMIS berdasarkan kapasitas
function createODPIcon(availablePorts = null, totalPorts = null) {
    let status = 'normal';
    
    if (availablePorts !== null && totalPorts !== null) {
        status = getODPStatus(availablePorts, totalPorts);
    }
    
    const borderColor = getStatusColor(status);
    
    return L.divIcon({
        html: `
            <div style="
                position: relative;
                width: 36px; 
                height: 36px;
            ">
                <img src="assets/icons/odp-icon.png" 
                     style="
                         width: 32px; 
                         height: 32px;
                         filter: ${getColorFilter(status)} drop-shadow(2px 2px 3px rgba(0,0,0,0.3));
                     "
                     alt="ODP">
                <div style="
                    position: absolute;
                    bottom: -4px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 12px;
                    height: 12px;
                    background: ${borderColor};
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 4px rgba(0,0,0,0.3);
                "></div>
            </div>
        `,
        className: 'custom-marker-icon',
        iconSize: [36, 40],  // Extra height untuk indikator
        iconAnchor: [18, 40],
        popupAnchor: [0, -40]
    });
}

// =============================================
// UPDATE: refreshMapMarkers dengan warna dinamis
// =============================================

function refreshMapMarkers() {
    markersLayer.clearLayers();
    odpMarkers = {};
    
    // Render ODC markers
    devices.odc.forEach(odc => {
        const marker = L.marker(
            [parseFloat(odc.lat), parseFloat(odc.lng)], 
            { icon: createODCIcon() }
        ).addTo(markersLayer);
        
        marker.bindPopup(createPopupContent(odc));
        marker.on('click', () => showDeviceInfo(odc));
    });
    
    // Render ODP markers DENGAN WARNA SESUAI KAPASITAS
    devices.odp.forEach(odp => {
        const icon = createODPIcon(odp.available_ports, odp.total_ports);
        
        const marker = L.marker(
            [parseFloat(odp.lat), parseFloat(odp.lng)], 
            { icon: icon }
        ).addTo(markersLayer);
        
        marker.bindPopup(createPopupContent(odp));
        marker.on('click', () => showDeviceInfo(odp));
        
        // Simpan referensi marker
        odpMarkers[odp.id] = marker;
        
        // Draw connection line
        if (odp.source_id && odp.source_type === 'odc') {
            const source = devices.odc.find(d => d.id == odp.source_id);
            if (source) {
                drawConnectionLine(odp, source);
            }
        }
    });
}

// Draw connection line
function drawConnectionLine(odp, source) {
    const line = L.polyline([
        [parseFloat(odp.lat), parseFloat(odp.lng)],
        [parseFloat(source.lat), parseFloat(source.lng)]
    ], {
        color: '#48bb78',
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 5'
    }).addTo(markersLayer);
}

// =============================================
// POPUP CONTENT (dengan informasi kapasitas)
// =============================================

function createPopupContent(device) {
    const isODC = devices.odc.some(d => d.id === device.id);
    const type = isODC ? 'ODC' : 'ODP';
    const currentUser = window.currentUser;
    const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'operator');
    
    let content = `
        <div style="min-width: 220px;">
            <h4 style="margin: 0 0 10px 0;">${device.name}</h4>
            <p><strong>Tipe:</strong> ${type}</p>
            <p><strong>Lokasi:</strong> ${device.location}</p>
            <p><strong>Koordinat:</strong> ${parseFloat(device.lat).toFixed(8)}, ${parseFloat(device.lng).toFixed(8)}</p>
    `;
    
    if (isODC) {
        content += `
            <p><strong>Kapasitas:</strong> ${device.capacity} Port</p>
            <p><strong>Terpakai:</strong> ${device.used_ports || 0} Port</p>
            <p><strong>ODP Terhubung:</strong> ${device.connected_odps || 0}</p>
        `;
    } else {
        const available = device.available_ports || 0;
        const total = device.total_ports || 0;
        const percentage = total > 0 ? Math.round((available / total) * 100) : 0;
        
        let statusText = '';
        let statusColor = '';
        
        if (available === 0) {
            statusText = '⚠️ PENUH';
            statusColor = '#e53e3e';
        } else if (percentage < 20) {
            statusText = '🔴 Kritis';
            statusColor = '#f56565';
        } else if (percentage <= 50) {
            statusText = '🟡 Hampir Penuh';
            statusColor = '#ecc94b';
        } else {
            statusText = '🟢 Normal';
            statusColor = '#48bb78';
        }
        
        content += `
            <p><strong>Sumber:</strong> ${device.source_name || 'Tidak ada'}</p>
            <p><strong>Total Port:</strong> ${total}</p>
            <p style="color: ${statusColor}; font-weight: bold;">
                Status: ${statusText} (${available} tersedia)
            </p>
        `;
    }
    
    // Tombol edit/hapus hanya untuk admin & operator
    if (canEdit) {
        content += `
            <button onclick="editDevice('${device.id}', '${type.toLowerCase()}')" 
                    style="margin-top: 10px; padding: 5px 10px; background: #4299e1; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button onclick="deleteDevice('${device.id}', '${type.toLowerCase()}')" 
                    style="margin-top: 10px; padding: 5px 10px; background: #f56565; color: white; border: none; border-radius: 3px; cursor: pointer;">
                <i class="fas fa-trash"></i> Hapus
            </button>
        `;
    }
    
    content += `</div>`;
    
    return content;
}

// =============================================
// SHOW DEVICE INFO PANEL
// =============================================

function showDeviceInfo(device) {
    const panel = document.getElementById('infoPanel');
    const title = document.getElementById('infoTitle');
    const content = document.getElementById('infoContent');
    
    const isODC = devices.odc.some(d => d.id === device.id);
    const currentUser = window.currentUser;
    const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'operator');
    
    title.textContent = device.name;
    
    let html = `
        <div class="device-detail">
            <p><strong>Tipe:</strong> ${isODC ? 'ODC' : 'ODP'}</p>
            <p><strong>ID:</strong> ${device.id}</p>
            <p><strong>Lokasi:</strong> ${device.location}</p>
            <p><strong>Koordinat:</strong> ${parseFloat(device.lat).toFixed(8)}, ${parseFloat(device.lng).toFixed(8)}</p>
    `;

    if (isODC) {
        html += `
            <p><strong>Kapasitas Port:</strong> ${device.capacity}</p>
            <p><strong>Port Terpakai:</strong> ${device.used_ports || 0}</p>
            <p><strong>Port Tersedia:</strong> ${device.capacity - (device.used_ports || 0)}</p>
            <p><strong>ODP Terhubung:</strong></p>
            <ul>
        `;
        if (device.connected_odps_list) {
            device.connected_odps_list.forEach(odp => {
                html += `<li>${odp.name}</li>`;
            });
        }
        html += `</ul>`;
        html += renderPhotoGallery(device, 'odc');
    } else {
        // Status kapasitas dengan progress bar
        const available = device.available_ports || 0;
        const total = device.total_ports || 0;
        const used = total - available;
        const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
        
        let statusColor = '#48bb78';
        let statusText = 'Normal';
        
        if (available === 0) {
            statusColor = '#e53e3e';
            statusText = '⚠️ PENUH - Tidak ada port tersedia';
        } else if (percentage > 80) {
            statusColor = '#f56565';
            statusText = '🔴 Kritis - Segera perlu ODP tambahan';
        } else if (percentage > 50) {
            statusColor = '#ecc94b';
            statusText = '🟡 Hampir Penuh - Monitor penggunaan';
        } else {
            statusColor = '#48bb78';
            statusText = '🟢 Normal - Port masih banyak tersedia';
        }
        
        html += `
            <p><strong>Sumber ODC:</strong> ${device.source_name || 'Tidak terhubung'}</p>
            <p><strong>Total Port:</strong> ${total}</p>
            
            <div style="margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>Port Terpakai:</strong> ${used} dari ${total}</span>
                    <span style="color: ${statusColor}; font-weight: bold;">${percentage}%</span>
                </div>
                <div style="background: #e2e8f0; border-radius: 10px; height: 20px; overflow: hidden;">
                    <div style="
                        width: ${percentage}%; 
                        height: 100%; 
                        background: ${statusColor}; 
                        border-radius: 10px;
                        transition: width 0.5s ease;
                    "></div>
                </div>
                <p style="color: ${statusColor}; font-weight: bold; margin-top: 5px;">
                    ${statusText}
                </p>
            </div>
            
            <hr>
            <h4>📋 Daftar Pelanggan Terhubung</h4>
        `;
        
        if (device.ports && device.ports.length > 0) {
            const usedPorts = device.ports.filter(p => p.status === 'used' && p.target);
            if (usedPorts.length > 0) {
                html += `
                    <table class="customer-table">
                        <thead>
                            <tr>
                                <th>Port</th>
                                <th>Nama Pelanggan</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                usedPorts.forEach(port => {
                    html += `
                        <tr>
                            <td>${port.port_number}</td>
                            <td>${port.target}</td>
                            <td>${port.status === 'used' ? 'Aktif' : port.status}</td>
                        </tr>
                    `;
                });
                html += `
                        </tbody>
                    </table>
                `;
            } else {
                html += `<p class="empty-message">Belum ada pelanggan terhubung</p>`;
            }
            
            const maintenancePorts = device.ports.filter(p => p.status === 'maintenance');
            if (maintenancePorts.length > 0) {
                html += `<p><strong>Port Maintenance:</strong> ${maintenancePorts.map(p => p.port_number).join(', ')}</p>`;
            }
            if (canEdit) {
                html += `
                    <div style="margin-top: 15px;">
                        <button onclick="editDevice('${device.id}', '${isODC ? 'odc' : 'odp'}')" class="btn-icon btn-edit">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="deleteDevice('${device.id}', '${isODC ? 'odc' : 'odp'}')" class="btn-icon btn-delete">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
                    </div>
                `;
            } else {
                html += `
                    <div style="margin-top: 15px; padding: 10px; background: #fefcbf; border-radius: 5px; color: #975a16; font-size: 12px;">
                        <i class="fas fa-info-circle"></i> Anda login sebagai <strong>Viewer</strong>. Hanya dapat melihat data.
                    </div>
                `;
            }
            // Di bagian akhir showDeviceInfo, sebelum tombol edit/delete:
            if (isODC) {
                html += renderPhotoGallery(device, 'odc');
            } else {
                html += renderPhotoGallery(device, 'odp');
            }

            html += `</div>`;
            
            content.innerHTML = html;
            panel.classList.add('show');
        }
        
        // Grid port visual
        html += `
            <p style="margin-top:10px;"><strong>Status Port:</strong></p>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
        `;
        if (device.ports) {
            device.ports.forEach(port => {
                let bgColor = '#c6f6d5'; // available - hijau muda
                if (port.status === 'used') bgColor = '#fed7d7'; // used - merah muda
                else if (port.status === 'maintenance') bgColor = '#fefcbf'; // maintenance - kuning
                
                html += `
                    <div style="padding: 5px; text-align: center; background: ${bgColor}; border-radius: 3px; font-size: 12px; cursor: pointer;"
                         onclick="configurePort(${port.port_number})"
                         title="Port ${port.port_number}: ${port.status === 'used' ? port.target : port.status}">
                        ${port.port_number}
                    </div>
                `;
            });
        }
        html += `</div>`;
    }
    
    if (device.description) {
        html += `<p><strong>Keterangan:</strong> ${device.description}</p>`;
    }
    
    html += `
            <div style="margin-top: 15px;">
                <button onclick="editDevice('${device.id}', '${isODC ? 'odc' : 'odp'}')" class="btn-icon btn-edit">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteDevice('${device.id}', '${isODC ? 'odc' : 'odp'}')" class="btn-icon btn-delete">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    panel.classList.add('show');
}

// Hide info panel
function hideInfoPanel() {
    document.getElementById('infoPanel').classList.remove('show');
}

// Zoom to device location
function zoomToDevice(lat, lng) {
    map.setView([parseFloat(lat), parseFloat(lng)], 17);
}

// Highlight and zoom to ODP
function highlightODP(odpId) {
    if (highlightedMarker) {
        // Kembalikan ke icon dengan warna normal
        const odp = devices.odp.find(d => d.id == odpId);
        if (odp) {
            highlightedMarker.setIcon(createODPIcon(odp.available_ports, odp.total_ports));
        } else {
            highlightedMarker.setIcon(createODPIcon());
        }
        highlightedMarker = null;
    }
    
    const marker = odpMarkers[odpId];
    if (!marker) return;
    
    // Buat icon highlight (lebih besar, dengan glow)
    const odp = devices.odp.find(d => d.id == odpId);
    const available = odp ? odp.available_ports : 0;
    const total = odp ? odp.total_ports : 0;
    const status = odp ? getODPStatus(available, total) : 'normal';
    const borderColor = getStatusColor(status);
    
    const highlightIcon = L.divIcon({
        html: `
            <div style="
                position: relative;
                width: 48px; 
                height: 48px;
            ">
                <img src="assets/icons/odp-icon.png" 
                     style="
                         width: 44px; 
                         height: 44px;
                         filter: ${getColorFilter(status)} drop-shadow(0 0 10px ${borderColor});
                         animation: pulse 1.5s infinite;
                     "
                     alt="ODP">
                <div style="
                    position: absolute;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 16px;
                    height: 16px;
                    background: ${borderColor};
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 8px ${borderColor};
                "></div>
            </div>
        `,
        className: 'custom-marker-icon',
        iconSize: [48, 54],
        iconAnchor: [24, 54],
        popupAnchor: [0, -54]
    });
    
    marker.setIcon(highlightIcon);
    highlightedMarker = marker;
    
    if (odp) {
        map.setView([parseFloat(odp.lat), parseFloat(odp.lng)], 18);
        marker.openPopup();
    }
    
    setTimeout(() => {
        if (highlightedMarker === marker) {
            const currentOdp = devices.odp.find(d => d.id == odpId);
            if (currentOdp) {
                marker.setIcon(createODPIcon(currentOdp.available_ports, currentOdp.total_ports));
            } else {
                marker.setIcon(createODPIcon());
            }
            highlightedMarker = null;
        }
    }, 8000);
}

// Load devices from API
async function loadDevices() {
    try {
        const [odcRes, odpRes] = await Promise.all([
            fetch(`${API_BASE}/odc.php`, { credentials: 'include' }),
            fetch(`${API_BASE}/odp.php`, { credentials: 'include' })
        ]);
        
        const odcData = await odcRes.json();
        const odpData = await odpRes.json();
        
        devices.odc = Array.isArray(odcData) ? odcData : [];
        devices.odp = Array.isArray(odpData) ? odpData : [];
        
        refreshMapMarkers();
        refreshDeviceList();
    } catch (error) {
        console.error('Error loading devices:', error);
        alert('Gagal memuat data. Pastikan XAMPP berjalan dan API dapat diakses.');
    }
}

// Refresh device list
function refreshDeviceList() {
    const container = document.getElementById('deviceList');
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    const currentUser = window.currentUser;
    const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'operator');
    
    const allDevices = [
        ...devices.odc.map(d => ({...d, type: 'odc'})), 
        ...devices.odp.map(d => ({...d, type: 'odp'}))
    ];
    
    container.innerHTML = '';
    
    allDevices.forEach(device => {
        if (activeFilter !== 'all' && device.type !== activeFilter) return;
        if (searchTerm && !device.name.toLowerCase().includes(searchTerm) && 
            !device.location.toLowerCase().includes(searchTerm)) return;
        
        const div = document.createElement('div');
        div.className = `device-item ${device.type}`;
        div.onclick = () => {
            showDeviceInfo(device);
            zoomToDevice(device.lat, device.lng);
            handleDeviceClickMobile(); // 👈 TAMBAHKAN BARIS INI
        };
        
        let infoHtml = '';
        let statusIndicator = '';
        
        if (device.type === 'odc') {
            infoHtml = `Port: ${device.used_ports || 0}/${device.capacity} | ODP: ${device.connected_odps || 0}`;
        } else {
            const available = device.available_ports || 0;
            const total = device.total_ports || 0;
            const percentage = total > 0 ? Math.round((available / total) * 100) : 0;
            
            let statusEmoji = '🟢';
            if (percentage <= 50 && percentage > 20) statusEmoji = '🟡';
            else if (percentage <= 20 && percentage > 0) statusEmoji = '🔴';
            else if (percentage === 0) statusEmoji = '⚫';
            
            statusIndicator = `<span style="float: right;">${statusEmoji}</span>`;
            infoHtml = `Port: ${available}/${total} tersedia (${percentage}%) | Sumber: ${device.source_name || '-'}`;
        }
        
        let actionsHtml = '';
        if (canEdit) {
            actionsHtml = `
                <div class="device-actions">
                    <button class="btn-icon btn-edit" onclick="event.stopPropagation(); editDevice('${device.id}', '${device.type}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="event.stopPropagation(); deleteDevice('${device.id}', '${device.type}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        
        div.innerHTML = `
            <div class="device-header">
                <span class="device-name">${device.name} ${statusIndicator}</span>
                <span class="device-type">${device.type.toUpperCase()}</span>
            </div>
            <div class="device-info">${infoHtml}</div>
            <div class="device-info">${device.location}</div>
            ${actionsHtml}
        `;
        
        container.appendChild(div);
    });
}
// =============================================
// SIDEBAR TOGGLE FUNCTIONS
// =============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!sidebar) {
        console.error('Element #sidebar not found');
        return;
    }
    
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleMap = document.getElementById('sidebarToggleMap');
    
    if (!sidebar) return;
    
    sidebar.classList.add('open');
    sidebar.classList.remove('closed');
    
    if (overlay) overlay.classList.add('active');
    if (toggleMap) toggleMap.style.display = 'none';
    
    // Invalidate map size setelah sidebar terbuka
    setTimeout(() => {
        if (typeof map !== 'undefined' && map) {
            map.invalidateSize();
        }
    }, 350);
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleMap = document.getElementById('sidebarToggleMap');
    
    if (!sidebar) return;
    
    sidebar.classList.remove('open');
    sidebar.classList.add('closed');
    
    if (overlay) overlay.classList.remove('active');
    
    // Tampilkan tombol buka sidebar di peta (mobile)
    if (window.innerWidth <= 768) {
        if (toggleMap) toggleMap.style.display = 'block';
    }
    
    // Invalidate map size setelah sidebar tertutup
    setTimeout(() => {
        if (typeof map !== 'undefined' && map) {
            map.invalidateSize();
        }
    }, 350);
}

// Tutup sidebar saat klik device di mobile
function handleDeviceClickMobile() {
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// Handle window resize
window.addEventListener('resize', function() {
    const toggleMap = document.getElementById('sidebarToggleMap');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!sidebar) return;
    
    if (window.innerWidth > 768) {
        // Desktop: sidebar selalu terbuka
        sidebar.classList.remove('closed', 'open');
        if (toggleMap) toggleMap.style.display = 'none';
        if (overlay) overlay.classList.remove('active');
    } else {
        // Mobile: sidebar tertutup default
        if (!sidebar.classList.contains('open')) {
            if (toggleMap) toggleMap.style.display = 'block';
        }
    }
    
    // Invalidate map size
    setTimeout(() => {
        if (typeof map !== 'undefined' && map) {
            map.invalidateSize();
        }
    }, 350);
});