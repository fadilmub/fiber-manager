// js/app.js

// =============================================
// CATATAN: API_BASE sudah dideklarasikan di map.js
// JANGAN deklarasi ulang di sini!
// =============================================

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    const isAuth = await checkAuthentication();
    if (!isAuth) {
        window.location.href = 'login.html';
        return;
    }
    await loadUserInfo();
    initMap();
    initEventListeners();
    loadDevices();
});

// Check authentication
async function checkAuthentication() {
    try {
        const response = await fetch(`${API_BASE}/auth.php?action=me`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                console.log('Authenticated as:', data.user.username);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

// Load user info
async function loadUserInfo() {
    try {
        const response = await fetch(`${API_BASE}/auth.php?action=me`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                const userDisplay = document.getElementById('userDisplayName');
                if (userDisplay) userDisplay.textContent = data.user.full_name;
                window.currentUser = data.user;
            }
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
    }
}

// Logout
async function logout() {
    if (!confirm('Apakah Anda yakin ingin logout?')) return;
    try {
        await fetch(`${API_BASE}/auth.php?action=logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
    } catch (e) {}
    window.location.href = 'login.html';
}

// Initialize event listeners
function initEventListeners() {
    // ODP source dropdown - tampilkan port ODC tersedia
    const odpSourceDropdown = document.getElementById('odpSource');
    if (odpSourceDropdown) {
        odpSourceDropdown.addEventListener('change', async function() {
            const selectedOption = this.selectedOptions[0];
            const portGroup = document.getElementById('odcPortGroup');
            const portSelect = document.getElementById('odcSourcePort');
            if (selectedOption && selectedOption.dataset.type === 'odc') {
                const odcId = selectedOption.value;
                portGroup.style.display = 'block';
                portSelect.innerHTML = '<option value="">Memuat port...</option>';
                try {
                    const ports = await fetchOdcAvailablePorts(odcId);
                    portSelect.innerHTML = '<option value="">Pilih port ODC</option>';
                    if (ports.length === 0) {
                        portSelect.innerHTML += '<option value="" disabled>Tidak ada port tersedia</option>';
                    } else {
                        ports.forEach(p => {
                            const opt = document.createElement('option');
                            opt.value = p.port_number;
                            opt.textContent = `Port ${p.port_number}`;
                            portSelect.appendChild(opt);
                        });
                    }
                } catch (err) {
                    console.error(err);
                    portSelect.innerHTML = '<option value="">Gagal memuat port</option>';
                }
            } else {
                portGroup.style.display = 'none';
                portSelect.innerHTML = '<option value="">Pilih port ODC</option>';
            }
        });
    }

    document.getElementById('odpForm')?.addEventListener('submit', e => { e.preventDefault(); saveODP(); });
    document.getElementById('odcForm')?.addEventListener('submit', e => { e.preventDefault(); saveODC(); });
    document.getElementById('odpTotalPorts')?.addEventListener('change', () => {
        if (!currentEditingDevice) generatePortStatusInputs();
    });
    document.getElementById('searchInput')?.addEventListener('input', () => refreshDeviceList());
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            refreshDeviceList();
        });
    });
    document.getElementById('searchCoordinate')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') searchAndZoom();
    });
    document.getElementById('customerSearchInput')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') searchCustomer();
    });
}

// Generic fetch with auth
async function fetchWithAuth(url, options = {}) {
    const defaults = {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    };
    const merged = { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } };
    try {
        const response = await fetch(url, merged);
        if (response.status === 401) { window.location.href = 'login.html'; return null; }
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Fetch available ODC ports
async function fetchOdcAvailablePorts(odcId) {
    const response = await fetchWithAuth(`${API_BASE}/odc_ports.php?odc_id=${odcId}`);
    if (!response || !response.ok) throw new Error('Gagal mengambil port ODC');
    const allPorts = await response.json();
    return allPorts.filter(p => p.status === 'available');
}

// Show dialogs
async function showAddODPDialog() {
    currentEditingDevice = null;
    document.getElementById('modalTitle').textContent = 'Tambah ODP';
    document.getElementById('odpForm').reset();
    document.getElementById('odpId').value = '';
    document.getElementById('odcPortGroup').style.display = 'none';
    await populateSourceDropdown();
    generatePortStatusInputs();
    document.getElementById('odpModal').classList.add('show');
}

function showAddODCDialog() {
    currentEditingDevice = null;
    document.getElementById('odcForm').reset();
    document.getElementById('odcId').value = '';
    document.getElementById('odcModal').classList.add('show');
}

// Populate source dropdown (only ODC)
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
        const div = document.createElement('div');
        div.className = `port-item ${status}`;
        div.textContent = i;
        div.onclick = () => configurePort(i);
        if (portData && portData.target) div.title = `Pelanggan: ${portData.target}`;
        container.appendChild(div);
    }
    updateAvailablePortsCount();
}

// Configure port (pelanggan)
function configurePort(portNumber) {
    const deviceId = document.getElementById('odpId').value;
    if (!deviceId) { alert('Simpan ODP terlebih dahulu'); return; }
    currentPortConfig.deviceId = deviceId;
    currentPortConfig.portNumber = portNumber;
    const device = devices.odp.find(d => d.id == deviceId);
    const existingPort = device?.ports?.find(p => p.port_number === portNumber);
    document.getElementById('displayPortNumber').value = portNumber;
    document.getElementById('customerName').value = existingPort?.target || '';
    document.getElementById('portStatus').value = (existingPort?.status === 'maintenance') ? 'maintenance' : 'active';
    document.getElementById('customerOnuId').value = existingPort?.onu_id || '';
    document.getElementById('portDirectionModal').classList.add('show');
}

// Save port customer (ONU ID included)
async function savePortCustomer() {
    const customerName = document.getElementById('customerName').value.trim();
    const statusSelect = document.getElementById('portStatus').value;
    const onuId = document.getElementById('customerOnuId').value.trim();
    if (!customerName && statusSelect === 'active') {
        alert('Nama pelanggan harus diisi!');
        return;
    }
    const finalStatus = (statusSelect === 'active') ? 'used' : 'maintenance';
    const data = {
        status: finalStatus,
        target: finalStatus === 'used' ? customerName : null,
        connection_type: 'drop',
        onu_id: onuId || null
    };
    try {
        const response = await fetch(`${API_BASE}/ports.php?odp_id=${currentPortConfig.deviceId}&port=${currentPortConfig.portNumber}`, {
            method: 'PUT',
            credentials: 'include',
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
                if (infoTitle === device.name) showDeviceInfo(device);
            }
            alert('Konfigurasi pelanggan berhasil disimpan');
        } else if (response.status === 401) { window.location.href = 'login.html'; }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan konfigurasi port');
    }
}

// Clear port
async function clearPort() {
    if (!confirm('Kosongkan port ini?')) return;
    const data = { status: 'available', target: null, connection_type: null, onu_id: null };
    try {
        const response = await fetch(`${API_BASE}/ports.php?odp_id=${currentPortConfig.deviceId}&port=${currentPortConfig.portNumber}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            closeModal('portDirectionModal');
            await loadDevices();
            const device = devices.odp.find(d => d.id == currentPortConfig.deviceId);
            if (device) {
                generatePortStatusInputs(device.ports);
                if (document.getElementById('infoTitle').textContent === device.name) showDeviceInfo(device);
            }
            alert('Port berhasil dikosongkan');
        } else if (response.status === 401) { window.location.href = 'login.html'; }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal mengosongkan port');
    }
}

// Update available ports count
function updateAvailablePortsCount() {
    const total = parseInt(document.getElementById('odpTotalPorts').value) || 8;
    const used = document.querySelectorAll('#odpPortStatus .port-item.used').length;
    const maint = document.querySelectorAll('#odpPortStatus .port-item.maintenance').length;
    document.getElementById('odpAvailablePorts').value = total - used - maint;
}

// Save ODP (include source_port)
async function saveODP() {
    const id = document.getElementById('odpId').value;
    const sourceSelect = document.getElementById('odpSource');
    const selectedOption = sourceSelect.selectedOptions[0];
    const coordString = document.getElementById('odpCoordinates').value.trim();
    const coords = parseCoordinates(coordString);
    if (!coords) { alert('Format koordinat tidak valid!'); return; }

    const data = {
        name: document.getElementById('odpName').value,
        source_id: sourceSelect.value || null,
        source_type: selectedOption ? selectedOption.dataset.type : null,
        source_port: (selectedOption && selectedOption.dataset.type === 'odc') ? document.getElementById('odcSourcePort').value : null,
        lat: coords.lat,
        lng: coords.lng,
        location: document.getElementById('odpLocation').value,
        total_ports: parseInt(document.getElementById('odpTotalPorts').value),
        description: document.getElementById('odpDescription').value
    };
    if (!data.location) { alert('Alamat lokasi harus diisi'); return; }

    try {
        const url = id ? `${API_BASE}/odp.php?id=${id}` : `${API_BASE}/odp.php`;
        const method = id ? 'PUT' : 'POST';
        const response = await fetchWithAuth(url, { method, body: JSON.stringify(data) });
        if (!response) return;
        if (response.ok) {
            closeModal('odpModal');
            await loadDevices();
            alert('ODP berhasil disimpan');
        } else {
            const error = await response.json();
            alert('Gagal: ' + (error.error || ''));
        }
    } catch (error) {
        console.error(error);
        alert('Gagal menyimpan ODP');
    }
}

// Save ODC (include pop_name, pon_port)
async function saveODC() {
    const id = document.getElementById('odcId').value;
    const coordString = document.getElementById('odcCoordinates').value.trim();
    const coords = parseCoordinates(coordString);
    if (!coords) { alert('Format koordinat tidak valid!'); return; }
    const data = {
        name: document.getElementById('odcName').value,
        lat: coords.lat,
        lng: coords.lng,
        location: document.getElementById('odcLocation').value,
        capacity: parseInt(document.getElementById('odcCapacity').value),
        pop_name: document.getElementById('odcPopName').value,
        pon_port: document.getElementById('odcPonPort').value,
        description: document.getElementById('odcDescription').value
    };
    if (!data.location) { alert('Alamat lokasi harus diisi'); return; }

    try {
        const url = id ? `${API_BASE}/odc.php?id=${id}` : `${API_BASE}/odc.php`;
        const method = id ? 'PUT' : 'POST';
        const response = await fetchWithAuth(url, { method, body: JSON.stringify(data) });
        if (!response) return;
        if (response.ok) {
            closeModal('odcModal');
            await loadDevices();
            alert('ODC berhasil disimpan');
        } else {
            const error = await response.json();
            alert('Gagal: ' + (error.error || ''));
        }
    } catch (error) {
        console.error(error);
        alert('Gagal menyimpan ODC');
    }
}

// ODC Port Management
let currentOdcPortConfig = { odcId: null, portNumber: null };

async function configureOdcPort(odcId, portNumber) {
    currentOdcPortConfig.odcId = odcId;
    currentOdcPortConfig.portNumber = portNumber;
    const response = await fetchWithAuth(`${API_BASE}/odc_ports.php?odc_id=${odcId}`);
    if (!response) return;
    const ports = await response.json();
    const portData = ports.find(p => p.port_number === portNumber);
    document.getElementById('odcDisplayPort').value = portNumber;
    const targetSelect = document.getElementById('odcTargetOdp');
    targetSelect.innerHTML = '<option value="">Pilih ODP...</option>';
    devices.odp.forEach(odp => {
        const option = document.createElement('option');
        option.value = odp.id;
        option.textContent = `${odp.name} (${odp.location})`;
        if (portData && portData.target_odp_id == odp.id) option.selected = true;
        targetSelect.appendChild(option);
    });
    document.getElementById('odcPortStatus').value = portData ? portData.status : 'available';
    document.getElementById('odcPortModal').classList.add('show');
}

async function saveOdcPort() {
    const targetOdpId = document.getElementById('odcTargetOdp').value;
    const status = document.getElementById('odcPortStatus').value;
    const data = { status, target_odp_id: targetOdpId || null, connection_type: 'feeder' };
    const response = await fetchWithAuth(`${API_BASE}/odc_ports.php?odc_id=${currentOdcPortConfig.odcId}&port=${currentOdcPortConfig.portNumber}`, {
        method: 'PUT', body: JSON.stringify(data)
    });
    if (!response) return;
    closeModal('odcPortModal');
    await loadDevices();
    alert('Port ODC diperbarui');
}

async function clearOdcPort() {
    if (!confirm('Kosongkan port ini?')) return;
    const data = { status: 'available', target_odp_id: null };
    const response = await fetchWithAuth(`${API_BASE}/odc_ports.php?odc_id=${currentOdcPortConfig.odcId}&port=${currentOdcPortConfig.portNumber}`, {
        method: 'PUT', body: JSON.stringify(data)
    });
    if (!response) return;
    closeModal('odcPortModal');
    await loadDevices();
    alert('Port ODC dikosongkan');
}

// Edit device
async function editDevice(id, type) {
    const device = type === 'odc' ? devices.odc.find(d => d.id == id) : devices.odp.find(d => d.id == id);
    if (!device) return;
    currentEditingDevice = device;
    if (type === 'odc') {
        document.getElementById('odcId').value = device.id;
        document.getElementById('odcName').value = device.name;
        document.getElementById('odcCoordinates').value = formatCoordinates(device.lat, device.lng);
        document.getElementById('odcLocation').value = device.location;
        document.getElementById('odcCapacity').value = device.capacity;
        document.getElementById('odcPopName').value = device.pop_name || '';
        document.getElementById('odcPonPort').value = device.pon_port || '';
        document.getElementById('odcUsedPorts').value = device.used_ports || 0;
        document.getElementById('odcDescription').value = device.description || '';
        // Connected ODP list
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
    } else {
        document.getElementById('modalTitle').textContent = 'Edit ODP';
        document.getElementById('odpId').value = device.id;
        document.getElementById('odpName').value = device.name;
        document.getElementById('odpCoordinates').value = formatCoordinates(device.lat, device.lng);
        document.getElementById('odpLocation').value = device.location;
        document.getElementById('odpTotalPorts').value = device.total_ports;
        document.getElementById('odpAvailablePorts').value = device.available_ports;
        document.getElementById('odpDescription').value = device.description || '';
        document.getElementById('odcPortGroup').style.display = 'none';
        await populateSourceDropdown();
        if (device.source_id) {
            document.getElementById('odpSource').value = device.source_id;
            // Jika sumber ODC, tampilkan port yang sesuai
            if (device.source_type === 'odc') {
                document.getElementById('odcPortGroup').style.display = 'block';
                const ports = await fetchOdcAvailablePorts(device.source_id);
                const portSelect = document.getElementById('odcSourcePort');
                portSelect.innerHTML = '<option value="">Pilih port ODC</option>';
                ports.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.port_number;
                    opt.textContent = `Port ${p.port_number}`;
                    // Tandai port yang saat ini digunakan oleh ODP ini
                    if (p.port_number == device.source_port) opt.selected = true;
                    portSelect.appendChild(opt);
                });
            }
        }
        generatePortStatusInputs(device.ports);
        document.getElementById('odpModal').classList.add('show');
    }
}

// Delete device
async function deleteDevice(id, type) {
    if (!confirm('Yakin ingin menghapus perangkat ini?')) return;
    const url = type === 'odc' ? `${API_BASE}/odc.php?id=${id}` : `${API_BASE}/odp.php?id=${id}`;
    const response = await fetchWithAuth(url, { method: 'DELETE' });
    if (!response) return;
    if (response.ok) {
        await loadDevices();
        hideInfoPanel();
        alert('Perangkat berhasil dihapus');
    }
}

// Search customer
function searchCustomer() {
    const input = document.getElementById('customerSearchInput');
    const keyword = input.value.trim().toLowerCase();
    const container = document.getElementById('customerSearchResults');
    if (!keyword) { container.innerHTML = '<div class="no-customer">Masukkan nama pelanggan</div>'; return; }
    const results = [];
    devices.odp.forEach(odp => {
        if (odp.ports) {
            odp.ports.forEach(port => {
                if (port.target && port.target.toLowerCase().includes(keyword) && port.status === 'used') {
                    results.push({ customerName: port.target, odpName: odp.name, portNumber: port.port_number, odpId: odp.id });
                }
            });
        }
    });
    if (results.length === 0) { container.innerHTML = '<div class="no-customer">Tidak ditemukan</div>'; return; }
    let html = '';
    results.forEach(r => {
        html += `<div class="customer-result-item" onclick="highlightODP('${r.odpId}'); showDeviceInfo(devices.odp.find(d => d.id == '${r.odpId}'))">
            <div class="customer-name">${r.customerName}</div>
            <div class="customer-odp">${r.odpName} (Port ${r.portNumber})</div>
        </div>`;
    });
    container.innerHTML = html;
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) event.target.classList.remove('show');
};