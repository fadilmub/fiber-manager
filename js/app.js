// js/app.js
// js/app.js

// =============================================
// CATATAN: API_BASE sudah dideklarasikan di map.js
// JANGAN deklarasi ulang di sini!
// =============================================

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication FIRST
    const isAuth = await checkAuthentication();
    if (!isAuth) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load user info
    await loadUserInfo();
    
    // Initialize app
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
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                console.log('Authenticated as:', data.user.username);
                return true;
            }
        }
        
        console.log('Not authenticated');
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
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                const userDisplay = document.getElementById('userDisplayName');
                if (userDisplay) {
                    userDisplay.textContent = data.user.full_name + ' (' + data.user.role.toUpperCase() + ')';
                }
                window.currentUser = data.user;
                
                // Sembunyikan tombol tambah untuk viewer
                const actionButtons = document.getElementById('actionButtons');
                if (actionButtons && data.user.role === 'viewer') {
                    actionButtons.style.display = 'none';
                }
                
                // Tampilkan tombol manajemen user untuk admin
                const btnUserManagement = document.getElementById('btnUserManagement');
                if (btnUserManagement && data.user.role === 'admin') {
                    btnUserManagement.style.display = 'inline-block';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
    }
}
async function loadUserInfo() {
    try {
        const response = await fetch(`${API_BASE}/auth.php?action=me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                const userDisplay = document.getElementById('userDisplayName');
                if (userDisplay) {
                    userDisplay.textContent = data.user.full_name + ' (' + data.user.role.toUpperCase() + ')';
                }
                window.currentUser = data.user;
                
                // Tampilkan tombol manajemen user untuk admin
                const btnUserManagement = document.getElementById('btnUserManagement');
                if (btnUserManagement && data.user.role === 'admin') {
                    btnUserManagement.style.display = 'inline-block';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
    }
}
// Logout function
async function logout() {
    if (!confirm('Apakah Anda yakin ingin logout?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/auth.php?action=logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = 'login.html';
    }
}

// Initialize event listeners
function initEventListeners() {
    document.getElementById('odpForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        saveODP();
    });
    
    document.getElementById('odcForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        saveODC();
    });
    
    document.getElementById('odpTotalPorts')?.addEventListener('change', function() {
        if (!currentEditingDevice) {
            generatePortStatusInputs();
        }
    });
    
    document.getElementById('searchInput')?.addEventListener('input', function() {
        refreshDeviceList();
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            refreshDeviceList();
        });
    });
    
    const searchCoord = document.getElementById('searchCoordinate');
    if (searchCoord) {
        searchCoord.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchAndZoom();
            }
        });
    }
    
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
                if (infoTitle === device.name) {
                    showDeviceInfo(device);
                }
            }
            
            alert('Konfigurasi pelanggan berhasil disimpan');
        } else if (response.status === 401) {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan konfigurasi port');
    }
}

// Kosongkan port
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
                if (infoTitle === device.name) {
                    showDeviceInfo(device);
                }
            }
            
            alert('Port berhasil dikosongkan');
        } else if (response.status === 401) {
            window.location.href = 'login.html';
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

// Generic fetch function with auth handling
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
        
        // If unauthorized, redirect to login
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
        
        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(data)
        });
        
        if (!response) return;
        
        if (response.ok) {
            closeModal('odpModal');
            await loadDevices();
            alert('ODP berhasil disimpan');
        } else {
            const error = await response.json();
            alert('Gagal menyimpan ODP: ' + (error.error || 'Unknown error'));
        }
        if (response.ok) {
        const result = await response.json();
        const deviceId = id || result.id;
        
        // Upload foto jika ada
        if (deviceId) {
            const photos = await uploadPhotos(deviceId, 'odp');
        }
        
        closeModal('odpModal');
        await loadDevices();
        alert('ODP berhasil disimpan');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan ODP. Periksa koneksi ke server.');
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
        
        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(data)
        });
        
        if (!response) return;
        
        if (response.ok) {
            closeModal('odcModal');
            await loadDevices();
            alert('ODC berhasil disimpan');
        } else {
            const error = await response.json();
            alert('Gagal menyimpan ODC: ' + (error.error || 'Unknown error'));
        }
        if (response.ok) {
        const result = await response.json();
        const deviceId = id || result.id;
        
        // Upload foto jika ada
        if (deviceId) {
            const photos = await uploadPhotos(deviceId, 'odc');
        }
        
        closeModal('odcModal');
        await loadDevices();
        alert('ODC berhasil disimpan');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan ODC. Periksa koneksi ke server.');
    }
}
// =============================================
// UPLOAD FOTO FUNCTIONS
// =============================================

// Preview foto ODP
function previewODPPhotos() {
    const files = document.getElementById('odpPhotos').files;
    const preview = document.getElementById('odpPhotoPreview');
    const existingCount = preview.querySelectorAll('.photo-item').length;
    
    if (existingCount + files.length > 5) {
        alert('Maksimal 5 foto!');
        document.getElementById('odpPhotos').value = '';
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validasi tipe
        if (!file.type.startsWith('image/')) {
            alert(`File ${file.name} bukan gambar!`);
            continue;
        }
        
        // Validasi ukuran
        if (file.size > 5 * 1024 * 1024) {
            alert(`File ${file.name} terlalu besar (max 5MB)!`);
            continue;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'photo-item new-photo';
            div.dataset.fileIndex = i;
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="delete-photo" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

// Preview foto ODC
function previewODCPhotos() {
    const files = document.getElementById('odcPhotos').files;
    const preview = document.getElementById('odcPhotoPreview');
    const existingCount = preview.querySelectorAll('.photo-item').length;
    
    if (existingCount + files.length > 5) {
        alert('Maksimal 5 foto!');
        document.getElementById('odcPhotos').value = '';
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
            alert(`File ${file.name} bukan gambar!`);
            continue;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert(`File ${file.name} terlalu besar (max 5MB)!`);
            continue;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'photo-item new-photo';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="delete-photo" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

// Upload foto ke server
async function uploadPhotos(deviceId, type) {
    const fileInput = document.getElementById(type === 'odc' ? 'odcPhotos' : 'odpPhotos');
    const files = fileInput.files;
    
    if (files.length === 0) return [];
    
    // Cek jumlah foto existing + new
    const preview = document.getElementById(type === 'odc' ? 'odcPhotoPreview' : 'odpPhotoPreview');
    const existingPhotos = preview.querySelectorAll('.photo-item:not(.new-photo)');
    const newPhotos = preview.querySelectorAll('.photo-item.new-photo');
    
    if (existingPhotos.length + newPhotos.length > 5) {
        alert('Maksimal 5 foto!');
        return [];
    }
    
    const formData = new FormData();
    formData.append('type', type);
    formData.append('device_id', deviceId);
    
    for (let i = 0; i < files.length; i++) {
        formData.append('photos[]', files[i]);
    }
    
    try {
        const response = await fetch(`${API_BASE}/upload.php`, {
            method: 'POST',
            credentials: 'include',
            body: formData // Jangan set Content-Type, biarkan browser yang set multipart
        });
        
        const result = await response.json();
        
        if (response.ok) {
            return result.photos || [];
        } else {
            alert(result.error || 'Gagal upload foto');
            return [];
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Gagal upload foto');
        return [];
    }
}

// Hapus foto dari server
async function deletePhoto(photoId, type, deviceId) {
    if (!confirm('Hapus foto ini?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/upload.php`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo_id: photoId, type: type })
        });
        
        if (response.ok) {
            // Refresh tampilan
            await loadDevices();
            const device = type === 'odc' ? 
                devices.odc.find(d => d.id == deviceId) : 
                devices.odp.find(d => d.id == deviceId);
            if (device) {
                showDeviceInfo(device);
            }
        }
    } catch (error) {
        console.error('Delete photo error:', error);
    }
}

// Tampilkan foto di info panel
function renderPhotoGallery(device, type) {
    if (!device.photos || device.photos.length === 0) {
        return '';
    }
    
    let html = '<hr><h4>📷 Foto (' + device.photos.length + '/5)</h4><div class="photo-gallery">';
    
    device.photos.forEach(photo => {
        const primaryClass = photo.is_primary ? ' primary-photo' : '';
        html += `
            <img src="${photo.url}" 
                 alt="${photo.original_name || 'Foto'}" 
                 class="${primaryClass}"
                 onclick="openLightbox('${photo.url}')"
                 title="${photo.original_name || 'Foto'}${photo.is_primary ? ' (Utama)' : ''}">
        `;
    });
    
    html += '</div>';
    return html;
}

// Lightbox
function openLightbox(url) {
    let lightbox = document.getElementById('lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <span class="close-lightbox" onclick="closeLightbox()">&times;</span>
            <img src="" alt="Foto">
        `;
        lightbox.onclick = function(e) {
            if (e.target === lightbox) closeLightbox();
        };
        document.body.appendChild(lightbox);
    }
    
    lightbox.querySelector('img').src = url;
    lightbox.classList.add('show');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('show');
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
    } else {
        document.getElementById('modalTitle').textContent = 'Edit ODP';
        document.getElementById('odpId').value = device.id;
        document.getElementById('odpName').value = device.name;
        document.getElementById('odpCoordinates').value = formatCoordinates(device.lat, device.lng);
        document.getElementById('odpLocation').value = device.location;
        document.getElementById('odpTotalPorts').value = device.total_ports;
        document.getElementById('odpAvailablePorts').value = device.available_ports;
        document.getElementById('odpDescription').value = device.description || '';
        
        await populateSourceDropdown();
        // Di bagian else (edit ODP), tambahkan setelah populateSourceDropdown:
        // Tampilkan foto existing
        const photoPreview = document.getElementById('odpPhotoPreview');
        photoPreview.innerHTML = '';
        if (device.photos && device.photos.length > 0) {
            device.photos.forEach(photo => {
                const div = document.createElement('div');
                div.className = `photo-item${photo.is_primary ? ' primary' : ''}`;
                div.innerHTML = `
                    <img src="${photo.url}" alt="${photo.original_name}">
                    <button type="button" class="delete-photo" onclick="deletePhoto(${photo.id}, 'odp', ${device.id})">
                        <i class="fas fa-times"></i>
                    </button>
                    ${photo.is_primary ? '<span class="primary-badge">Utama</span>' : ''}
                `;
                photoPreview.appendChild(div);
            });
        }
        if (device.source_id) {
            document.getElementById('odpSource').value = device.source_id;
        }
        
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
        
        const response = await fetchWithAuth(url, { method: 'DELETE' });
        
        if (!response) return;
        
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

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    
    // Invalidate map size setelah modal tertutup
    setTimeout(() => {
        if (typeof map !== 'undefined' && map) {
            map.invalidateSize();
        }
    }, 300);
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
};