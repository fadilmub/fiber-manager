// js/app.js

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initEventListeners();
    loadDevices();
});

// Initialize event listeners
function initEventListeners() {
    document.getElementById('odpForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveODP();
    });
    
    document.getElementById('odcForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveODC();
    });
    
    document.getElementById('odpTotalPorts').addEventListener('change', function() {
        if (!currentEditingDevice) {
            generatePortStatusInputs();
        }
    });
    
    document.getElementById('searchInput').addEventListener('input', function() {
        refreshDeviceList();
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            refreshDeviceList();
        });
    });
    
    // Enter untuk search coordinate
    document.getElementById('searchCoordinate').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchAndZoom();
        }
    });
    
    // Enter untuk search customer
    const customerInput = document.getElementById('customerSearchInput');
    if (customerInput) {
        customerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCustomer();
            }
        });
    }
}

// Show add ODP dialog
async function showAddODPDialog() {
    currentEditingDevice = null;
    document.getElementById('modalTitle').textContent = 'Tambah ODP';
    document.getElementById('odpForm').reset();
    document.getElementById('odpId').value = '';
    
    await populateSourceDropdown();
    generatePortStatusInputs();
    
    document.getElementById('odpModal').classList.add('show');
}

// Show add ODC dialog
function showAddODCDialog() {
    currentEditingDevice = null;
    document.getElementById('odcForm').reset();
    document.getElementById('odcId').value = '';
    document.getElementById('odcModal').classList.add('show');
}

// Populate source dropdown - hanya ODC
async function populateSourceDropdown() {
    const sourceSelect = document.getElementById('odpSource');
    sourceSelect.innerHTML = '<option value="">Pilih ODC sumber...</option>';
    
    devices.odc.forEach(odc => {
        const option = document.createElement('option');
        option.value = odc.id;
        option.dataset.type = 'odc';
        option.textContent = `${odc.name} (ODC)`;
        sourceSelect.appendChild(option);
    });
}

// Generate port status inputs
function generatePortStatusInputs(existingPorts = null) {
    const totalPorts = parseInt(document.getElementById('odpTotalPorts').value) || 8;
    const container = document.getElementById('odpPortStatus');
    container.innerHTML = '';
    
    for (let i = 1; i <= totalPorts; i++) {
        const portData = existingPorts ? existingPorts.find(p => p.port_number === i) : null;
        const status = portData ? portData.status : 'available';
        
        const portDiv = document.createElement('div');
        portDiv.className = `port-item ${status}`;
        portDiv.textContent = i;
        portDiv.onclick = () => configurePort(i);
        
        if (portData && portData.target) {
            portDiv.title = `Pelanggan: ${portData.target}`;
        }
        
        container.appendChild(portDiv);
    }
    
    updateAvailablePortsCount();
}

// Configure port - hanya pelanggan
function configurePort(portNumber) {
    const deviceId = document.getElementById('odpId').value;
    
    if (!deviceId) {
        alert('Simpan ODP terlebih dahulu sebelum mengkonfigurasi port');
        return;
    }
    
    currentPortConfig.deviceId = deviceId;
    currentPortConfig.portNumber = portNumber;
    
    // Ambil data port eksisting
    const device = devices.odp.find(d => d.id == deviceId);
    const existingPort = device?.ports?.find(p => p.port_number === portNumber);
    
    document.getElementById('displayPortNumber').value = portNumber;
    document.getElementById('customerName').value = existingPort?.target || '';
    document.getElementById('portStatus').value = (existingPort?.status === 'maintenance') ? 'maintenance' : 'active';
    
    document.getElementById('portDirectionModal').classList.add('show');
}

// Simpan konfigurasi pelanggan
async function savePortCustomer() {
    const customerName = document.getElementById('customerName').value.trim();
    const statusSelect = document.getElementById('portStatus').value;
    
    if (!customerName && statusSelect === 'active') {
        alert('Nama pelanggan harus diisi untuk port aktif!');
        return;
    }
    
    const finalStatus = (statusSelect === 'active') ? 'used' : 'maintenance';
    
    const data = {
        status: finalStatus,
        target: finalStatus === 'used' ? customerName : null,
        connection_type: 'drop'
    };
    
    try {
        const response = await fetch(`${API_BASE}/ports.php?odp_id=${currentPortConfig.deviceId}&port=${currentPortConfig.portNumber}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('portDirectionModal');
            await loadDevices();
            
            const device = devices.odp.find(d => d.id == currentPortConfig.deviceId);
            if (device) {
                generatePortStatusInputs(device.ports);
                // Jika panel info sedang terbuka untuk ODP ini, refresh tampilannya
                const infoTitle = document.getElementById('infoTitle').textContent;
                if (infoTitle === device.name) {
                    showDeviceInfo(device);
                }
            }
            
            alert('Konfigurasi pelanggan berhasil disimpan');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan konfigurasi port');
    }
}

// Kosongkan port (kembalikan ke available)
async function clearPort() {
    if (!confirm('Kosongkan port ini? Status akan kembali ke Available.')) return;
    
    const data = {
        status: 'available',
        target: null,
        connection_type: null
    };
    
    try {
        const response = await fetch(`${API_BASE}/ports.php?odp_id=${currentPortConfig.deviceId}&port=${currentPortConfig.portNumber}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('portDirectionModal');
            await loadDevices();
            
            const device = devices.odp.find(d => d.id == currentPortConfig.deviceId);
            if (device) {
                generatePortStatusInputs(device.ports);
                const infoTitle = document.getElementById('infoTitle').textContent;
                if (infoTitle === device.name) {
                    showDeviceInfo(device);
                }
            }
            
            alert('Port berhasil dikosongkan');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal mengosongkan port');
    }
}

// Update available ports count
function updateAvailablePortsCount() {
    const totalPorts = parseInt(document.getElementById('odpTotalPorts').value) || 8;
    const usedPorts = document.querySelectorAll('#odpPortStatus .port-item.used').length;
    const maintenancePorts = document.querySelectorAll('#odpPortStatus .port-item.maintenance').length;
    const availablePorts = totalPorts - usedPorts - maintenancePorts;
    
    document.getElementById('odpAvailablePorts').value = availablePorts;
}

// Save ODP
async function saveODP() {
    const id = document.getElementById('odpId').value;
    const sourceSelect = document.getElementById('odpSource');
    const selectedOption = sourceSelect.selectedOptions[0];
    const coordString = document.getElementById('odpCoordinates').value.trim();
    
    const coords = parseCoordinates(coordString);
    if (!coords) {
        alert('Format koordinat tidak valid!\n\nGunakan format: latitude, longitude\nContoh: -6.963707888562949, 109.64706473647041');
        return;
    }
    
    const data = {
        name: document.getElementById('odpName').value,
        source_id: sourceSelect.value || null,
        source_type: selectedOption ? selectedOption.dataset.type : null,
        lat: coords.lat,
        lng: coords.lng,
        location: document.getElementById('odpLocation').value,
        total_ports: parseInt(document.getElementById('odpTotalPorts').value),
        description: document.getElementById('odpDescription').value
    };
    
    if (!data.location) {
        alert('Alamat lokasi harus diisi');
        return;
    }
    
    try {
        const url = id ? `${API_BASE}/odp.php?id=${id}` : `${API_BASE}/odp.php`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeModal('odpModal');
            await loadDevices(); // Refresh semua data dari server
            
            // Jika panel info terbuka untuk ODP ini, refresh tampilannya
            const infoTitle = document.getElementById('infoTitle').textContent;
            if (id && result.data) {
                // Cari device yang baru diupdate di data yang sudah direfresh
                const updatedDevice = devices.odp.find(d => d.id == id);
                if (updatedDevice && document.getElementById('infoPanel').classList.contains('show')) {
                    showDeviceInfo(updatedDevice);
                }
            }
            
            alert('ODP berhasil disimpan');
        } else {
            alert('Gagal menyimpan ODP: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan ODP');
    }
}

// Save ODC
async function saveODC() {
    const id = document.getElementById('odcId').value;
    const coordString = document.getElementById('odcCoordinates').value.trim();
    
    const coords = parseCoordinates(coordString);
    if (!coords) {
        alert('Format koordinat tidak valid!\n\nGunakan format: latitude, longitude\nContoh: -6.963707888562949, 109.64706473647041');
        return;
    }
    
    const data = {
        name: document.getElementById('odcName').value,
        lat: coords.lat,
        lng: coords.lng,
        location: document.getElementById('odcLocation').value,
        capacity: parseInt(document.getElementById('odcCapacity').value),
        description: document.getElementById('odcDescription').value
    };
    
    if (!data.location) {
        alert('Alamat lokasi harus diisi');
        return;
    }
    
    try {
        const url = id ? `${API_BASE}/odc.php?id=${id}` : `${API_BASE}/odc.php`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('odcModal');
            await loadDevices();
            alert('ODC berhasil disimpan');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan ODC');
    }
}

// Edit device
async function editDevice(id, type) {
    const device = type === 'odc' ? 
        devices.odc.find(d => d.id == id) : 
        devices.odp.find(d => d.id == id);
    
    if (!device) return;
    
    currentEditingDevice = device;
    
    if (type === 'odc') {
        document.getElementById('odcId').value = device.id;
        document.getElementById('odcName').value = device.name;
        document.getElementById('odcCoordinates').value = formatCoordinates(device.lat, device.lng);
        document.getElementById('odcLocation').value = device.location;
        document.getElementById('odcCapacity').value = device.capacity;
        document.getElementById('odcUsedPorts').value = device.used_ports || 0;
        document.getElementById('odcDescription').value = device.description || '';
        
        const container = document.getElementById('connectedODPList');
        container.innerHTML = '';
        if (device.connected_odps_list) {
            device.connected_odps_list.forEach(odp => {
                const div = document.createElement('div');
                div.className = 'connected-item';
                div.textContent = odp.name;
                container.appendChild(div);
            });
        }
        
        document.getElementById('odcModal').classList.add('show');
    }  else {
        document.getElementById('modalTitle').textContent = 'Edit ODP';
        document.getElementById('odpId').value = device.id;
        document.getElementById('odpName').value = device.name;
        document.getElementById('odpCoordinates').value = formatCoordinates(device.lat, device.lng);
        document.getElementById('odpLocation').value = device.location;
        document.getElementById('odpTotalPorts').value = device.total_ports;
        document.getElementById('odpAvailablePorts').value = device.available_ports;
        document.getElementById('odpDescription').value = device.description || '';
        
        await populateSourceDropdown();
        if (device.source_id) {
            document.getElementById('odpSource').value = device.source_id;
        }
        
        // PENTING: Kirim data port yang ada untuk ditampilkan
        generatePortStatusInputs(device.ports);
        document.getElementById('odpModal').classList.add('show');
    }
}
// Delete device
async function deleteDevice(id, type) {
    if (!confirm('Yakin ingin menghapus perangkat ini?')) return;
    
    try {
        const url = type === 'odc' ? 
            `${API_BASE}/odc.php?id=${id}` : 
            `${API_BASE}/odp.php?id=${id}`;
        
        const response = await fetch(url, { method: 'DELETE' });
        
        if (response.ok) {
            await loadDevices();
            hideInfoPanel();
            alert('Perangkat berhasil dihapus');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menghapus perangkat');
    }
}

// Pencarian Pelanggan
function searchCustomer() {
    const input = document.getElementById('customerSearchInput');
    const keyword = input.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('customerSearchResults');
    
    if (!keyword) {
        resultsContainer.innerHTML = '<div class="no-customer">Masukkan nama pelanggan</div>';
        return;
    }
    
    const results = [];
    
    devices.odp.forEach(odp => {
        if (odp.ports) {
            odp.ports.forEach(port => {
                if (port.target && port.target.toLowerCase().includes(keyword) && port.status === 'used') {
                    results.push({
                        customerName: port.target,
                        odpName: odp.name,
                        portNumber: port.port_number,
                        odpId: odp.id
                    });
                }
            });
        }
    });
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-customer">Tidak ditemukan</div>';
        return;
    }
    
    let html = '';
    results.forEach(r => {
        html += `
            <div class="customer-result-item" onclick="highlightODP('${r.odpId}'); showDeviceInfo(devices.odp.find(d => d.id == '${r.odpId}'))">
                <div class="customer-name">${r.customerName}</div>
                <div class="customer-odp">${r.odpName} (Port ${r.portNumber})</div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
};