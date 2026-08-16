// =============================================
// APP.JS - VERSI LENGKAP DAN STABIL
// =============================================

// Initialize application
document.addEventListener('DOMContentLoaded', async function () {
    const user = await loadUserInfo();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    initMap();
    initEventListeners();
    loadDevices();
});

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

                const actionButtons = document.getElementById('actionButtons');
                const mapDragWidget = document.getElementById('mapDragWidget');
                if (data.user.role === 'viewer') {
                    if (actionButtons) actionButtons.style.display = 'none';
                    if (mapDragWidget) mapDragWidget.style.display = 'none';
                } else {
                    if (mapDragWidget) mapDragWidget.style.display = 'flex';
                }

                const btnUserManagement = document.getElementById('btnUserManagement');
                if (btnUserManagement && data.user.role === 'admin') {
                    btnUserManagement.style.display = 'inline-block';
                }
                return data.user;
            }
        }
        return null;
    } catch (error) {
        console.error('Failed to load user info:', error);
        return null;
    }
}


// Logout function
async function logout() {
    if (!confirm('Apakah Anda yakin ingin logout?')) return;

    try {
        await fetch(`${API_BASE}/auth.php?action=logout`, {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = 'login.html';
    }
}

// Initialize event listeners
function initEventListeners() {
    const odpForm = document.getElementById('odpForm');
    if (odpForm) {
        odpForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveODP();
        });
    }

    const odcForm = document.getElementById('odcForm');
    if (odcForm) {
        odcForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveODC();
        });
    }

    const poleForm = document.getElementById('poleForm');
    if (poleForm) {
        poleForm.addEventListener('submit', function (e) {
            e.preventDefault();
            savePole();
        });
    }

    const totalPorts = document.getElementById('odpTotalPorts');
    if (totalPorts) {
        totalPorts.addEventListener('change', function () {
            if (!currentEditingDevice) {
                generatePortStatusInputs();
            }
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            refreshDeviceList();
        });
    }

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            refreshDeviceList();
        });
    });

    const searchCoord = document.getElementById('searchCoordinate');
    if (searchCoord) {
        searchCoord.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                searchAndZoom();
            }
        });
    }

    const customerInput = document.getElementById('customerSearchInput');
    if (customerInput) {
        customerInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                searchCustomer();
            }
        });
    }

    // =============================================
    // EVENT LISTENER UNTUK ODC DROPDOWN
    // =============================================
    const popSelect = document.getElementById('odcSourcePop');
    const oltSelect = document.getElementById('odcSourceOlt');
    const ponSelect = document.getElementById('odcSourcePon');

    if (popSelect) {
        popSelect.addEventListener('change', loadOLTByPop);
    }
    if (oltSelect) {
        oltSelect.addEventListener('change', loadPONByOLT);
    }
    if (ponSelect) {
        ponSelect.addEventListener('change', loadPortByPON);
        console.log('Event listener attached to odcSourcePon');
    }
}

// =============================================
// DRAG & DROP HANDLER
// =============================================

async function handleMapDeviceDrop(type, latlng) {
    if (!window.currentUser || window.currentUser.role === 'viewer') {
        alert('Anda tidak memiliki akses untuk menambah perangkat.');
        return;
    }

    const coordVal = `${latlng.lat.toFixed(8)}, ${latlng.lng.toFixed(8)}`;

    if (type === 'odp') {
        await showAddODPDialog();
        const coordInput = document.getElementById('odpCoordinates');
        if (coordInput) {
            coordInput.value = coordVal;
        }
    } else if (type === 'odc') {
        await showAddODCDialog();
        const coordInput = document.getElementById('odcCoordinates');
        if (coordInput) {
            coordInput.value = coordVal;
        }
    } else if (type === 'pole') {
        await showAddPoleDialog();
        const coordInput = document.getElementById('poleCoordinates');
        if (coordInput) {
            coordInput.value = coordVal;
        }
    }
}

async function showAddPoleDialog() {
    currentEditingDevice = null;
    const poleModalTitle = document.getElementById('poleModalTitle');
    if (poleModalTitle) poleModalTitle.textContent = 'Tambah Tiang';

    const poleForm = document.getElementById('poleForm');
    if (poleForm) poleForm.reset();

    const poleId = document.getElementById('poleId');
    if (poleId) poleId.value = '';

    const poleModal = document.getElementById('poleModal');
    if (poleModal) poleModal.classList.add('show');
}

async function savePole() {
    const id = document.getElementById('poleId')?.value;
    const coordString = document.getElementById('poleCoordinates')?.value.trim();
    const coords = parseCoordinates(coordString);
    if (!coords) {
        alert('Format koordinat tidak valid!');
        return;
    }

    const data = {
        name: document.getElementById('poleName')?.value,
        lat: coords.lat,
        lng: coords.lng,
        location: document.getElementById('poleLocation')?.value,
        jenis_tiang: document.getElementById('poleType')?.value,
        description: document.getElementById('poleDescription')?.value
    };

    if (!data.name) {
        alert('Nama Tiang harus diisi');
        return;
    }

    try {
        const url = id ? `${API_BASE}/pole.php?id=${id}` : `${API_BASE}/pole.php`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(data)
        });

        if (!response) return;

        const result = await response.json();
        if (response.ok) {
            closeModal('poleModal');
            await loadDevices();
            alert('Tiang berhasil disimpan');
        } else {
            alert('Gagal menyimpan tiang: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving pole:', error);
        alert('Gagal menyimpan tiang');
    }
}

// =============================================
// ODP FUNCTIONS
// =============================================

async function showAddODPDialog() {
    currentEditingDevice = null;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Tambah ODP';

    const odpForm = document.getElementById('odpForm');
    if (odpForm) odpForm.reset();

    const odpId = document.getElementById('odpId');
    if (odpId) odpId.value = '';

    const odpOdcPortGroup = document.getElementById('odpOdcPortGroup');
    if (odpOdcPortGroup) odpOdcPortGroup.style.display = 'none';

    await populateSourceDropdown();
    generatePortStatusInputs();

    const odpModal = document.getElementById('odpModal');
    if (odpModal) odpModal.classList.add('show');
}

async function populateSourceDropdown(selectedSourceId = null, selectedPort = null) {
    const sourceSelect = document.getElementById('odpSource');
    if (!sourceSelect) return;

    sourceSelect.innerHTML = '<option value="">Pilih ODC sumber...</option>';

    devices.odc.forEach(odc => {
        const option = document.createElement('option');
        option.value = odc.id;
        option.dataset.type = 'odc';
        const used = odc.used_ports || 0;
        const available = odc.capacity - used;
        option.textContent = `${odc.name} (ODC - ${used}/${odc.capacity} port, ${available} tersedia)`;
        if (selectedSourceId && selectedSourceId == odc.id) {
            option.selected = true;
        }
        sourceSelect.appendChild(option);
    });

    if (selectedSourceId) {
        await loadODCPortsForEdit(selectedSourceId, selectedPort);
    }
}

// Called when user changes the ODC select in the ODP form
function onODCSourceChange() {
    const sel = document.getElementById('odpSource');
    const val = sel?.value;
    if (val) {
        loadODCPortsForEdit(val);
    } else {
        const portGroup = document.getElementById('odpOdcPortGroup');
        if (portGroup) portGroup.style.display = 'none';
    }
}

// Enable selecting an ODC directly from the map for the ODP form
function enableSelectODCOnMap() {
    if (!map) {
        alert('Peta belum siap. Mohon tunggu sebentar.');
        return;
    }
    // Hide any open modals so map is clickable (store to restore later)
    window._mapSelectionHiddenModals = [];
    document.querySelectorAll('.modal.show').forEach(m => {
        if (m.id && m.id !== 'coordinatePickerModal') {
            window._mapSelectionHiddenModals.push(m.id);
            m.classList.remove('show');
        }
    });

    // Show a small banner instructing the user
    let banner = document.getElementById('mapSelectionBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'mapSelectionBanner';
        banner.style.position = 'fixed';
        banner.style.top = '12px';
        banner.style.right = '12px';
        banner.style.zIndex = 10000;
        banner.style.background = 'rgba(255,255,255,0.95)';
        banner.style.padding = '10px 12px';
        banner.style.borderRadius = '6px';
        banner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        banner.innerHTML = `<span style="font-weight:600;">Mode pilih ODC aktif</span><div style="margin-top:6px;">Klik ODC di peta untuk memilihnya. <button id="cancelMapSelectBtn" class="btn btn-secondary btn-sm" style="margin-left:8px;">Batal</button></div>`;
        document.body.appendChild(banner);
        document.getElementById('cancelMapSelectBtn').addEventListener('click', cancelSelectODC);
    }

    // Set a global callback that map.js will call when an ODC marker is clicked
    window.mapSelectionCallback = async function (odc) {
        try {
            const sourceSelect = document.getElementById('odpSource');
            if (sourceSelect) {
                sourceSelect.value = odc.id;
                await loadODCPortsForEdit(odc.id);
            }

            const coordInput = document.getElementById('odpCoordinates');
            if (coordInput) coordInput.value = formatCoordinates(odc.lat, odc.lng);

            // Small visual feedback
            alert(`ODC terpilih: ${odc.name}`);
        } catch (e) {
            console.error('Error handling ODC selection:', e);
        } finally {
            // Disable selection mode and restore UI
            cancelSelectODC();
        }
    };
}

function cancelSelectODC() {
    // Remove banner
    const banner = document.getElementById('mapSelectionBanner');
    if (banner) banner.remove();

    // Clear callback
    window.mapSelectionCallback = null;

    // Restore previously hidden modals
    if (window._mapSelectionHiddenModals && window._mapSelectionHiddenModals.length) {
        window._mapSelectionHiddenModals.forEach(id => {
            const m = document.getElementById(id);
            if (m) m.classList.add('show');
        });
        window._mapSelectionHiddenModals = [];
    }
}

async function loadODCPortsForEdit(odcId, selectedPort = null) {
    const portGroup = document.getElementById('odpOdcPortGroup');
    const portSelect = document.getElementById('odpPortInODC');

    if (!odcId) {
        if (portGroup) portGroup.style.display = 'none';
        return;
    }

    if (portGroup) portGroup.style.display = 'block';
    if (portSelect) portSelect.innerHTML = '<option value="">Loading port...</option>';

    try {
        const response = await fetch(`${API_BASE}/odc.php?id=${odcId}&ports=true`, {
            credentials: 'include'
        });

        if (response.ok) {
            const ports = await response.json();
            if (portSelect) {
                portSelect.innerHTML = '<option value="">Pilih port...</option>';

                ports.forEach(port => {
                    const option = document.createElement('option');
                    option.value = port.port_number;

                    let statusText = '';
                    let disabled = false;

                    if (port.status === 'used' && port.port_number != selectedPort) {
                        statusText = `❌ Terpakai oleh ${port.odp_name || 'ODP'}`;
                        disabled = true;
                    } else if (port.status === 'used' && port.port_number == selectedPort) {
                        statusText = `🔗 Terhubung (ODP ini)`;
                        disabled = false;
                    } else {
                        statusText = '✅ Tersedia';
                    }

                    option.textContent = `Port ${port.port_number} - ${statusText}`;
                    option.disabled = disabled;

                    if (selectedPort == port.port_number) {
                        option.selected = true;
                    }

                    portSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading ports:', error);
        if (portSelect) portSelect.innerHTML = '<option value="">Gagal memuat port</option>';
    }
}

function generatePortStatusInputs(existingPorts = null) {
    const totalPortsInput = document.getElementById('odpTotalPorts');
    const totalPorts = totalPortsInput ? parseInt(totalPortsInput.value) || 8 : 8;
    const container = document.getElementById('odpPortStatus');
    if (!container) return;

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

function configurePort(portNumber, providedDeviceId = null) {
    const deviceId = providedDeviceId || document.getElementById('odpId')?.value;

    if (!deviceId) {
        alert('Simpan ODP terlebih dahulu sebelum mengkonfigurasi port');
        return;
    }

    currentPortConfig.deviceId = deviceId;
    currentPortConfig.portNumber = portNumber;

    const device = devices.odp.find(d => d.id == deviceId);
    const existingPort = device?.ports?.find(p => p.port_number === portNumber);

    const portDbId = document.getElementById('portDbId');
    const displayPortNumber = document.getElementById('displayPortNumber');
    const customerName = document.getElementById('customerName');
    const portStatus = document.getElementById('portStatus');
    const portCoordinates = document.getElementById('portCoordinates');
    const portOnuNumber = document.getElementById('portOnuNumber');
    const portModemType = document.getElementById('portModemType');
    const portDescription = document.getElementById('portDescription');
    const portPhotos = document.getElementById('portPhotos');
    const portPhotoPreview = document.getElementById('portPhotoPreview');

    if (portDbId) portDbId.value = existingPort?.id || '';
    if (displayPortNumber) displayPortNumber.value = portNumber;
    if (customerName) customerName.value = existingPort?.target || '';
    if (portStatus) portStatus.value = (existingPort?.status === 'maintenance') ? 'maintenance' : 'active';

    if (portCoordinates) {
        if (existingPort?.lat && existingPort?.lng) {
            portCoordinates.value = `${existingPort.lat}, ${existingPort.lng}`;
        } else {
            portCoordinates.value = '';
        }
    }
    if (portOnuNumber) portOnuNumber.value = existingPort?.onu_number || '';
    if (portModemType) portModemType.value = existingPort?.modem_type || '';
    if (portDescription) portDescription.value = existingPort?.description || '';

    if (portPhotos) portPhotos.value = '';
    if (portPhotoPreview) portPhotoPreview.innerHTML = '';

    if (existingPort?.has_photo == 1 && existingPort?.id) {
        loadPortPhotos(existingPort.id);
    }

    const portModal = document.getElementById('portDirectionModal');
    if (portModal) portModal.classList.add('show');
}

async function savePortCustomer() {
    const customerName = document.getElementById('customerName')?.value.trim();
    const statusSelect = document.getElementById('portStatus')?.value;

    if (!customerName && statusSelect === 'active') {
        alert('Nama pelanggan harus diisi untuk port aktif!');
        return;
    }

    const finalStatus = (statusSelect === 'active') ? 'used' : 'maintenance';

    const coordString = document.getElementById('portCoordinates')?.value.trim();
    let lat = null, lng = null;
    if (coordString) {
        const coords = parseCoordinates(coordString);
        if (!coords) {
            alert('Format koordinat tidak valid!');
            return;
        }
        lat = coords.lat;
        lng = coords.lng;
    }

    const data = {
        status: finalStatus,
        target: finalStatus === 'used' ? customerName : null,
        connection_type: 'drop',
        lat: lat,
        lng: lng,
        onu_number: document.getElementById('portOnuNumber')?.value,
        modem_type: document.getElementById('portModemType')?.value,
        description: document.getElementById('portDescription')?.value
    };

    try {
        const response = await fetch(`${API_BASE}/ports.php?odp_id=${currentPortConfig.deviceId}&port=${currentPortConfig.portNumber}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            await loadDevices();
            const device = devices.odp.find(d => d.id == currentPortConfig.deviceId);
            const updatedPort = device?.ports?.find(p => p.port_number === currentPortConfig.portNumber);

            if (updatedPort && updatedPort.id) {
                await uploadPhotos(updatedPort.id, 'port');
            }

            closeModal('portDirectionModal');

            if (device) {
                generatePortStatusInputs(device.ports);
                const infoTitle = document.getElementById('infoTitle');
                if (infoTitle && infoTitle.textContent === device.name) {
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
            alert('Port berhasil dikosongkan');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal mengosongkan port');
    }
}

function updateAvailablePortsCount() {
    const totalPortsInput = document.getElementById('odpTotalPorts');
    const totalPorts = totalPortsInput ? parseInt(totalPortsInput.value) || 8 : 8;
    const usedPorts = document.querySelectorAll('#odpPortStatus .port-item.used').length;
    const maintenancePorts = document.querySelectorAll('#odpPortStatus .port-item.maintenance').length;
    const availablePorts = totalPorts - usedPorts - maintenancePorts;

    const odpAvailablePorts = document.getElementById('odpAvailablePorts');
    if (odpAvailablePorts) odpAvailablePorts.value = availablePorts;
}

async function saveODP() {
    const id = document.getElementById('odpId')?.value;
    const sourceSelect = document.getElementById('odpSource');
    const selectedOption = sourceSelect?.selectedOptions[0];
    const rawSourceId = sourceSelect?.value;
    const portInODC = document.getElementById('odpPortInODC')?.value;
    const coordString = document.getElementById('odpCoordinates')?.value.trim();

    const coords = parseCoordinates(coordString);
    if (!coords) {
        alert('Format koordinat tidak valid!');
        return;
    }

    const sourceId = rawSourceId && rawSourceId !== '' ? Number(rawSourceId) : null;
    const sourceType = sourceId && selectedOption ? selectedOption.dataset.type : null;
    const normalizedPortInODC = portInODC && portInODC !== '' ? Number(portInODC) : null;

    const data = {
        name: document.getElementById('odpName')?.value,
        source_id: sourceId,
        source_type: sourceType,
        port_number_in_odc: normalizedPortInODC,
        lat: coords.lat,
        lng: coords.lng,
        location: document.getElementById('odpLocation')?.value,
        total_ports: parseInt(document.getElementById('odpTotalPorts')?.value) || 8,
        description: document.getElementById('odpDescription')?.value
    };

    if (!data.name) {
        alert('Nama ODP harus diisi');
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

        const result = await response.json();

        if (response.ok) {
            const deviceId = id || result.id;
            if (deviceId) {
                await uploadPhotos(deviceId, 'odp');
            }

            closeModal('odpModal');
            await loadDevices();
            alert('ODP berhasil disimpan');
        } else {
            alert('Gagal menyimpan ODP: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan ODP');
    }
}

// =============================================
// ODC FUNCTIONS WITH POP, OLT, PON, PORT
// =============================================

async function loadPOPsForODC() {
    try {
        const response = await fetch(`${API_BASE}/pop.php`, { credentials: 'include' });
        if (response.ok) {
            const pops = await response.json();
            const popSelect = document.getElementById('odcSourcePop');
            if (!popSelect) return;

            popSelect.innerHTML = '<option value="">Pilih POP...</option>';
            pops.forEach(pop => {
                const option = document.createElement('option');
                option.value = pop.id;
                option.textContent = `${pop.name} ${pop.code ? '(' + pop.code + ')' : ''} - ${pop.location || ''}`;
                popSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading POPs:', error);
    }
}

async function loadOLTByPop() {
    const popId = document.getElementById('odcSourcePop')?.value;
    const oltGroup = document.getElementById('odcOltGroup');
    const oltSelect = document.getElementById('odcSourceOlt');
    const ponGroup = document.getElementById('odcPonGroup');
    const portGroup = document.getElementById('odcPortGroup');

    console.log('=== loadOLTByPop ===');
    console.log('popId:', popId);

    if (!popId) {
        console.log('No popId, hiding groups');
        if (oltGroup) oltGroup.style.display = 'none';
        if (ponGroup) ponGroup.style.display = 'none';
        if (portGroup) portGroup.style.display = 'none';
        return;
    }

    if (oltGroup) {
        oltGroup.style.display = 'block';
        console.log('oltGroup visible');
    }
    if (oltSelect) oltSelect.innerHTML = '<option value="">🔄 Loading OLT...</option>';

    try {
        const response = await fetch(`${API_BASE}/olt.php`, { credentials: 'include' });
        console.log('OLT API response status:', response.status);

        if (response.ok) {
            const olts = await response.json();
            console.log('All OLTs:', olts);

            const filteredOlts = olts.filter(olt => olt.pop_id == popId);
            console.log('Filtered OLTs for pop_id', popId, ':', filteredOlts);

            if (oltSelect) {
                oltSelect.innerHTML = '<option value="">Pilih OLT...</option>';
                if (filteredOlts.length === 0) {
                    oltSelect.innerHTML = '<option value="">❌ Tidak ada OLT di POP ini</option>';
                } else {
                    filteredOlts.forEach(olt => {
                        const option = document.createElement('option');
                        option.value = olt.id;
                        option.textContent = `${olt.name} ${olt.model ? '(' + olt.model + ')' : ''}`;
                        oltSelect.appendChild(option);
                        console.log(`Added OLT: ${olt.name}`);
                    });
                }
            }

            if (ponGroup) ponGroup.style.display = 'none';
            if (portGroup) portGroup.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading OLTs:', error);
        if (oltSelect) oltSelect.innerHTML = '<option value="">❌ Gagal memuat OLT</option>';
    }
}

async function loadPONByOLT() {
    const oltId = document.getElementById('odcSourceOlt')?.value;
    const ponGroup = document.getElementById('odcPonGroup');
    const ponSelect = document.getElementById('odcSourcePon');
    const portGroup = document.getElementById('odcPortGroup');

    console.log('=== loadPONByOLT ===');
    console.log('oltId:', oltId);

    if (!oltId) {
        console.log('No oltId, hiding groups');
        if (ponGroup) ponGroup.style.display = 'none';
        if (portGroup) portGroup.style.display = 'none';
        return;
    }

    if (ponGroup) {
        ponGroup.style.display = 'block';
        console.log('ponGroup visible');
    }
    if (ponSelect) ponSelect.innerHTML = '<option value="">🔄 Loading PON Card...</option>';

    try {
        const response = await fetch(`${API_BASE}/olt.php?id=${oltId}&action=pons`, { credentials: 'include' });
        console.log('PON API response status:', response.status);

        if (response.ok) {
            const pons = await response.json();
            console.log('PONs for OLT', oltId, ':', pons);

            if (ponSelect) {
                ponSelect.innerHTML = '<option value="">Pilih PON Card...</option>';
                if (pons.length === 0) {
                    ponSelect.innerHTML = '<option value="">❌ Tidak ada PON di OLT ini</option>';
                } else {
                    pons.forEach(pon => {
                        const option = document.createElement('option');
                        option.value = pon.id;
                        option.textContent = `PON Card ${pon.card_number} - ${pon.name || 'Card ' + pon.card_number} (${pon.port_count || 8} port)`;
                        ponSelect.appendChild(option);
                        console.log(`Added PON: Card ${pon.card_number}`);
                    });
                }
            }

            if (portGroup) portGroup.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading PONs:', error);
        if (ponSelect) ponSelect.innerHTML = '<option value="">❌ Gagal memuat PON</option>';
    }
}

// =============================================
// LOAD PORT BY PON - INI YANG MEMBUAT PORT MUNCUL
// =============================================
// LOAD PORT BY PON - DENGAN DEBUG LENGKAP
// Saat edit: tampilkan available + port yang sedang dipakai ODC ini
// Saat create: hanya available
// =============================================
async function loadPortByPON(currentPortNumber = null) {
    const ponId = document.getElementById('odcSourcePon')?.value;
    const portGroup = document.getElementById('odcPortGroup');
    const portSelect = document.getElementById('odcPonPort');
    const portInfo = document.getElementById('selectedPortInfo');

    console.log('=== loadPortByPON DEBUG ===');
    console.log('ponId:', ponId);
    console.log('currentPortNumber (for edit):', currentPortNumber);
    console.log('portGroup element:', portGroup);
    console.log('portSelect element:', portSelect);

    if (!ponId) {
        console.log('No ponId, hiding groups');
        if (portGroup) portGroup.style.display = 'none';
        if (portInfo) portInfo.style.display = 'none';
        return;
    }

    // PASTIKAN PORT GROUP TAMPIL
    if (portGroup) {
        portGroup.style.display = 'block';
        console.log('portGroup display set to block');
    } else {
        console.error('ERROR: portGroup element not found!');
    }

    if (portSelect) {
        portSelect.innerHTML = '<option value="">🔄 Loading port...</option>';
        console.log('portSelect innerHTML set to loading');
    } else {
        console.error('ERROR: portSelect element not found! Check ID: odcPonPort');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/pon.php?id=${ponId}&action=ports`, {
            credentials: 'include'
        });

        console.log('API response status:', response.status);

        if (response.ok) {
            const ports = await response.json();
            console.log('Ports data received:', ports);
            console.log('Number of ports:', ports.length);

            // Filter: show available ports + current port if editing
            const selectablePorts = ports.filter(p =>
                p.status === 'available' || (currentPortNumber && p.port_number == currentPortNumber)
            );
            console.log('Selectable ports:', selectablePorts);

            if (selectablePorts.length === 0) {
                portSelect.innerHTML = '<option value="">❌ Tidak ada port tersedia</option>';
                if (portInfo) {
                    portInfo.style.display = 'block';
                    const portInfoText = document.getElementById('portInfoText');
                    if (portInfoText) {
                        portInfoText.innerHTML = '⚠️ Peringatan: Tidak ada port tersedia di PON Card ini. Semua port sudah terpakai.';
                    }
                }
                console.log('No selectable ports');
            } else {
                portSelect.innerHTML = '<option value="">📌 Pilih port...</option>';
                selectablePorts.forEach(port => {
                    const option = document.createElement('option');
                    option.value = port.port_number;
                    const label = (currentPortNumber && port.port_number == currentPortNumber)
                        ? `Port ${port.port_number} - 🔧 Terpakai (ODC ini)`
                        : `Port ${port.port_number} - ✅ Tersedia`;
                    option.textContent = label;
                    portSelect.appendChild(option);
                    console.log(`Added option: ${label}`);
                });

                if (portInfo) {
                    portInfo.style.display = 'none';
                }
                console.log(`Added ${selectablePorts.length} ports to dropdown`);
            }
        } else {
            const error = await response.json();
            console.error('API error:', error);
            portSelect.innerHTML = '<option value="">❌ Gagal memuat port</option>';
        }
    } catch (error) {
        console.error('Error loading ports:', error);
        portSelect.innerHTML = '<option value="">❌ Error: ' + error.message + '</option>';
    }

    console.log('=== END DEBUG ===');
}

async function showAddODCDialog() {
    currentEditingDevice = null;
    const odcForm = document.getElementById('odcForm');
    if (odcForm) odcForm.reset();

    const odcId = document.getElementById('odcId');
    if (odcId) odcId.value = '';

    const oltGroup = document.getElementById('odcOltGroup');
    const ponGroup = document.getElementById('odcPonGroup');
    const portGroup = document.getElementById('odcPortGroup');
    const portInfo = document.getElementById('selectedPortInfo');

    if (oltGroup) oltGroup.style.display = 'none';
    if (ponGroup) ponGroup.style.display = 'none';
    if (portGroup) portGroup.style.display = 'none';
    if (portInfo) portInfo.style.display = 'none';

    await loadPOPsForODC();

    const odcModal = document.getElementById('odcModal');
    if (odcModal) odcModal.classList.add('show');
}

async function saveODC() {
    const id = document.getElementById('odcId')?.value;
    const coordString = document.getElementById('odcCoordinates')?.value.trim();
    const isEdit = !!id;

    const coords = parseCoordinates(coordString);
    if (!coords) {
        alert('Format koordinat tidak valid!');
        return;
    }

    const ponId = document.getElementById('odcSourcePon')?.value;
    const ponPort = document.getElementById('odcPonPort')?.value;

    if (!ponId || !ponPort) {
        alert('Silakan pilih PON Card dan Port yang akan digunakan!');
        return;
    }

    const data = {
        name: document.getElementById('odcName')?.value,
        lat: coords.lat,
        lng: coords.lng,
        location: document.getElementById('odcLocation')?.value,
        capacity: parseInt(document.getElementById('odcCapacity')?.value) || 24,
        description: document.getElementById('odcDescription')?.value || '',
        pon_id: parseInt(ponId),
        pon_port_number: parseInt(ponPort)
    };

    if (!data.name) {
        alert('Nama ODC harus diisi');
        return;
    }

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

        const result = await response.json();

        if (response.ok) {
            const deviceId = id || result.id;
            if (deviceId) {
                await uploadPhotos(deviceId, 'odc');
            }

            closeModal('odcModal');
            await loadDevices();
            alert('ODC berhasil disimpan');
        } else {
            alert('Gagal menyimpan ODC: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan ODC');
    }
}

// =============================================
// ODC FUNCTIONS (ORIGINAL)
// =============================================

function showAddODCDialogOriginal() {
    currentEditingDevice = null;
    const odcForm = document.getElementById('odcForm');
    if (odcForm) odcForm.reset();

    const odcId = document.getElementById('odcId');
    if (odcId) odcId.value = '';

    const odcModal = document.getElementById('odcModal');
    if (odcModal) odcModal.classList.add('show');
}

async function saveODCOriginal() {
    const id = document.getElementById('odcId')?.value;
    const coordString = document.getElementById('odcCoordinates')?.value.trim();

    const coords = parseCoordinates(coordString);
    if (!coords) {
        alert('Format koordinat tidak valid!');
        return;
    }

    const data = {
        name: document.getElementById('odcName')?.value,
        lat: coords.lat,
        lng: coords.lng,
        location: document.getElementById('odcLocation')?.value,
        capacity: parseInt(document.getElementById('odcCapacity')?.value) || 24,
        description: document.getElementById('odcDescription')?.value
    };

    if (!data.name) {
        alert('Nama ODC harus diisi');
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
            const result = await response.json();
            const deviceId = id || result.id;
            if (deviceId) {
                await uploadPhotos(deviceId, 'odc');
            }

            closeModal('odcModal');
            await loadDevices();
            alert('ODC berhasil disimpan');
        } else {
            const error = await response.json();
            alert('Gagal menyimpan ODC: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan ODC');
    }
}

// =============================================
// PHOTO FUNCTIONS
// =============================================

function triggerPhotoPicker(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    window.lastPhotoInputId = inputId;
    input.click();
}

function handleClipboardPhotoPaste(event) {
    const targetInputId = window.lastPhotoInputId;
    if (!targetInputId || !event.clipboardData || !event.clipboardData.items) return;

    const files = Array.from(event.clipboardData.items)
        .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
        .map(item => item.getAsFile())
        .filter(Boolean);

    if (!files.length) return;

    const targetInput = document.getElementById(targetInputId);
    if (!targetInput || targetInput.type !== 'file') return;

    event.preventDefault();

    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    targetInput.files = dataTransfer.files;
    targetInput.dispatchEvent(new Event('change', { bubbles: true }));
}

document.addEventListener('paste', handleClipboardPhotoPaste);

async function replacePhoto(photoId, type, deviceId) {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.style.display = 'none';

    picker.addEventListener('change', async () => {
        const file = picker.files && picker.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('File yang dipilih bukan gambar!');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File terlalu besar! Maksimal 5MB per foto.');
            return;
        }

        const formData = new FormData();
        formData.append('type', type);
        formData.append('device_id', deviceId);
        formData.append('replace_photo_id', photoId);
        formData.append('photos[]', file);

        try {
            const response = await fetch(`${API_BASE}/upload.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const result = await response.json();
            if (response.ok) {
                await loadDevices();
                const device = type === 'odc' ? devices.odc.find(d => d.id == deviceId) :
                    type === 'odp' ? devices.odp.find(d => d.id == deviceId) :
                    type === 'port' ? devices.odp.find(d => d.id == deviceId) :
                    devices.pop.find(d => d.id == deviceId);

                if (device) showDeviceInfo(device);
                alert(result.message || 'Foto berhasil diganti');
            } else {
                alert(result.error || 'Gagal mengganti foto');
            }
        } catch (error) {
            console.error('Replace photo error:', error);
            alert('Gagal mengganti foto');
        }
    });

    picker.click();
}

function previewODPPhotos() {
    const files = document.getElementById('odpPhotos')?.files;
    const preview = document.getElementById('odpPhotoPreview');
    if (!files || !preview) return;

    const existingCount = preview.querySelectorAll('.photo-item').length;
    if (existingCount + files.length > 5) {
        alert('Maksimal 5 foto!');
        if (document.getElementById('odpPhotos')) document.getElementById('odpPhotos').value = '';
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
        reader.onload = function (e) {
            const div = document.createElement('div');
            div.className = 'photo-item new-photo';
            div.innerHTML = `<img src="${e.target.result}" alt="Preview"><button type="button" class="delete-photo" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

function previewPortPhotos() {
    const files = document.getElementById('portPhotos')?.files;
    const preview = document.getElementById('portPhotoPreview');
    if (!files || !preview) return;

    const existingCount = preview.querySelectorAll('.photo-item').length;
    if (existingCount + files.length > 5) {
        alert('Maksimal 5 foto!');
        if (document.getElementById('portPhotos')) document.getElementById('portPhotos').value = '';
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
        reader.onload = function (e) {
            const div = document.createElement('div');
            div.className = 'photo-item new-photo';
            div.innerHTML = `<img src="${e.target.result}" alt="Preview"><button type="button" class="delete-photo" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

async function loadPortPhotos(portId) {
    const preview = document.getElementById('portPhotoPreview');
    if (!preview) return;

    try {
        const response = await fetch(`${API_BASE}/upload.php?type=port&device_id=${portId}`);
        if (response.ok) {
            const photos = await response.json();
            preview.innerHTML = '';

            photos.forEach(photo => {
                const div = document.createElement('div');
                div.className = 'photo-item';
                div.innerHTML = `
                    <img src="${photo.url}" alt="Foto Port" onclick="openLightbox('${photo.url}')" style="cursor:pointer">
                    <button type="button" class="replace-photo" onclick="replacePhoto(${photo.id}, 'port', ${portId})" title="Ganti foto">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button type="button" class="delete-photo" onclick="deletePhoto(${photo.id}, 'port', ${portId})">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                preview.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Error loading port photos:', error);
    }
}

function previewODCPhotos() {
    const files = document.getElementById('odcPhotos')?.files;
    const preview = document.getElementById('odcPhotoPreview');
    if (!files || !preview) return;

    preview.innerHTML = '';
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        reader.onload = function (e) {
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.innerHTML = `<img src="${e.target.result}" alt="Preview"><button type="button" class="delete-photo" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

async function uploadPhotos(deviceId, type) {
    let fileInputId = 'odpPhotos';
    if (type === 'odc') fileInputId = 'odcPhotos';
    if (type === 'port') fileInputId = 'portPhotos';
    if (type === 'olt') fileInputId = 'oltPhotos';
    if (type === 'pop') fileInputId = 'popPhotos';

    const fileInput = document.getElementById(fileInputId);
    const files = fileInput?.files;
    if (!files || files.length === 0) return [];

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
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            return result.photos || [];
        }
    } catch (error) {
        console.error('Upload error:', error);
    }
    return [];
}

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

function renderPhotoGallery(device, type) {
    if (!device.photos || device.photos.length === 0) {
        return '';
    }

    let html = '<hr><h4>📷 Foto (' + device.photos.length + '/5)</h4><div class="photo-gallery">';
    device.photos.forEach(photo => {
        const primaryClass = photo.is_primary ? ' primary-photo' : '';
        html += `
            <div class="photo-gallery-item ${primaryClass}">
                <img src="${photo.url}" alt="${photo.original_name || 'Foto'}" onclick="openLightbox('${photo.url}')" title="${photo.original_name || 'Foto'}${photo.is_primary ? ' (Utama)' : ''}">
                <button type="button" class="replace-photo" onclick="replacePhoto(${photo.id}, '${type}', ${device.id})" title="Ganti foto"><i class="fas fa-sync-alt"></i></button>
                <button type="button" class="delete-photo" onclick="deletePhoto(${photo.id}, '${type}', ${device.id})" title="Hapus foto"><i class="fas fa-times"></i></button>
                ${photo.is_primary ? '<span class="primary-badge">Utama</span>' : ''}
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function openLightbox(url) {
    let lightbox = document.getElementById('lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `<span class="close-lightbox" onclick="closeLightbox()">&times;</span><img src="" alt="Foto">`;
        lightbox.onclick = function (e) {
            if (e.target === lightbox) closeLightbox();
        };
        document.body.appendChild(lightbox);
    }

    const img = lightbox.querySelector('img');
    if (img) img.src = url;
    lightbox.classList.add('show');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.classList.remove('show');
}

// =============================================
// EDIT & DELETE DEVICES
// =============================================

async function editDevice(id, type) {
    const device = type === 'odc' ?
        devices.odc.find(d => d.id == id) :
        type === 'odp' ? devices.odp.find(d => d.id == id) :
        type === 'pole' ? devices.pole.find(d => d.id == id) : null;

    if (!device) return;

    currentEditingDevice = device;

    if (type === 'odc') {
        const odcId = document.getElementById('odcId');
        const odcName = document.getElementById('odcName');
        const odcCoordinates = document.getElementById('odcCoordinates');
        const odcLocation = document.getElementById('odcLocation');
        const odcCapacity = document.getElementById('odcCapacity');
        const odcUsedPorts = document.getElementById('odcUsedPorts');
        const odcDescription = document.getElementById('odcDescription');
        const connectedODPList = document.getElementById('connectedODPList');

        // Fetch full ODC record (includes source ids) to populate POP/OLT/PON dropdowns
        let fullODC = device;
        try {
            const resp = await fetch(`${API_BASE}/odc.php?id=${device.id}`);
            if (resp.ok) fullODC = await resp.json();
        } catch (e) {
            console.error('Failed to fetch full ODC data:', e);
        }

        if (odcId) odcId.value = fullODC.id;
        if (odcName) odcName.value = fullODC.name;
        if (odcCoordinates) odcCoordinates.value = formatCoordinates(fullODC.lat, fullODC.lng);
        if (odcLocation) odcLocation.value = fullODC.location;
        if (odcCapacity) odcCapacity.value = fullODC.capacity;
        if (odcUsedPorts) odcUsedPorts.value = fullODC.used_ports || 0;
        if (odcDescription) odcDescription.value = fullODC.description || '';

        if (connectedODPList) {
            connectedODPList.innerHTML = '';
            if (fullODC.connected_odps_list) {
                fullODC.connected_odps_list.forEach(odp => {
                    const div = document.createElement('div');
                    div.className = 'connected-item';
                    div.textContent = odp.name;
                    connectedODPList.appendChild(div);
                });
            }
        }

        // Populate POP/OLT/PON dropdown hierarchy and select current values
        await loadPOPsForODC();

        // Small delay to ensure DOM is updated
        await new Promise(r => setTimeout(r, 100));

        try {
            if (fullODC.source_pop_id) {
                const popSelect = document.getElementById('odcSourcePop');
                if (popSelect) {
                    console.log('Setting popSelect to:', fullODC.source_pop_id);
                    popSelect.value = fullODC.source_pop_id;
                    await loadOLTByPop();
                }
            }

            if (fullODC.source_olt_id) {
                const oltSelect = document.getElementById('odcSourceOlt');
                if (oltSelect) {
                    console.log('Setting oltSelect to:', fullODC.source_olt_id);
                    oltSelect.value = fullODC.source_olt_id;
                    await loadPONByOLT();
                }
            }

            if (fullODC.source_pon_id) {
                const ponSelect = document.getElementById('odcSourcePon');
                if (ponSelect) {
                    console.log('Setting ponSelect to:', fullODC.source_pon_id);
                    ponSelect.value = fullODC.source_pon_id;
                    // Pass current port number so it appears in dropdown during edit
                    await loadPortByPON(fullODC.source_port_number);
                }
            }

            if (fullODC.source_port_number) {
                const portSelect = document.getElementById('odcPonPort');
                if (portSelect) {
                    console.log('Setting portSelect to:', fullODC.source_port_number);
                    portSelect.value = fullODC.source_port_number;
                }
            }
        } catch (e) {
            console.error('Error populating source dropdowns:', e);
        }

        const odcModal = document.getElementById('odcModal');
        if (odcModal) odcModal.classList.add('show');
    } else if (type === 'pole') {
        const poleId = document.getElementById('poleId');
        const poleName = document.getElementById('poleName');
        const poleCoordinates = document.getElementById('poleCoordinates');
        const poleLocation = document.getElementById('poleLocation');
        const poleType = document.getElementById('poleType');
        const poleDescription = document.getElementById('poleDescription');

        if (poleId) poleId.value = device.id;
        if (poleName) poleName.value = device.name;
        if (poleCoordinates) poleCoordinates.value = formatCoordinates(device.lat, device.lng);
        if (poleLocation) poleLocation.value = device.location;
        if (poleType) poleType.value = device.jenis_tiang || '';
        if (poleDescription) poleDescription.value = device.description || '';

        const poleModalTitle = document.getElementById('poleModalTitle');
        if (poleModalTitle) poleModalTitle.textContent = 'Edit Tiang';

        const poleModal = document.getElementById('poleModal');
        if (poleModal) poleModal.classList.add('show');
    } else {
        const modalTitle = document.getElementById('modalTitle');
        const odpId = document.getElementById('odpId');
        const odpName = document.getElementById('odpName');
        const odpCoordinates = document.getElementById('odpCoordinates');
        const odpLocation = document.getElementById('odpLocation');
        const odpTotalPorts = document.getElementById('odpTotalPorts');
        const odpAvailablePorts = document.getElementById('odpAvailablePorts');
        const odpDescription = document.getElementById('odpDescription');

        if (modalTitle) modalTitle.textContent = 'Edit ODP';
        if (odpId) odpId.value = device.id;
        if (odpName) odpName.value = device.name;
        if (odpCoordinates) odpCoordinates.value = formatCoordinates(device.lat, device.lng);
        if (odpLocation) odpLocation.value = device.location;
        if (odpTotalPorts) odpTotalPorts.value = device.total_ports;
        if (odpAvailablePorts) odpAvailablePorts.value = device.available_ports;
        if (odpDescription) odpDescription.value = device.description || '';

        await populateSourceDropdown();

        const photoPreview = document.getElementById('odpPhotoPreview');
        if (photoPreview) {
            photoPreview.innerHTML = '';
            if (device.photos && device.photos.length > 0) {
                device.photos.forEach(photo => {
                    const div = document.createElement('div');
                    div.className = `photo-item${photo.is_primary ? ' primary' : ''}`;
                    div.innerHTML = `
                        <img src="${photo.url}" alt="${photo.original_name}">
                        <button type="button" class="replace-photo" onclick="replacePhoto(${photo.id}, 'odp', ${device.id})" title="Ganti foto"><i class="fas fa-sync-alt"></i></button>
                        <button type="button" class="delete-photo" onclick="deletePhoto(${photo.id}, 'odp', ${device.id})"><i class="fas fa-times"></i></button>
                        ${photo.is_primary ? '<span class="primary-badge">Utama</span>' : ''}
                    `;
                    photoPreview.appendChild(div);
                });
            }
        }

        const odpSource = document.getElementById('odpSource');
        if (odpSource && device.source_id) {
            odpSource.value = device.source_id;
            if (device.port_number_in_odc) {
                await loadODCPortsForEdit(device.source_id, device.port_number_in_odc);
            } else {
                await loadODCPortsForEdit(device.source_id);
            }
        }

        generatePortStatusInputs(device.ports);

        const odpModal = document.getElementById('odpModal');
        if (odpModal) odpModal.classList.add('show');
    }
}

async function deleteDevice(id, type) {
    if (!confirm('Yakin ingin menghapus perangkat ini?')) return;

    try {
        let url = '';
        if (type === 'odc') {
            url = `${API_BASE}/odc.php?id=${id}`;
        } else if (type === 'odp') {
            url = `${API_BASE}/odp.php?id=${id}`;
        } else if (type === 'pole') {
            url = `${API_BASE}/pole.php?id=${id}`;
        }

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

// =============================================
// SEARCH CUSTOMER
// =============================================

function searchCustomer() {
    const input = document.getElementById('customerSearchInput');
    const keyword = input?.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('customerSearchResults');

    if (!keyword) {
        if (resultsContainer) resultsContainer.innerHTML = '<div class="no-customer">Masukkan nama pelanggan</div>';
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

    if (!resultsContainer) return;

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-customer">Tidak ditemukan</div>';
        return;
    }

    let html = '';
    results.forEach(r => {
        html += `<div class="customer-result-item" onclick="highlightODP('${r.odpId}'); showDeviceInfo(devices.odp.find(d => d.id == '${r.odpId}'))">
            <div class="customer-name">${r.customerName}</div>
            <div class="customer-odp">${r.odpName} (Port ${r.portNumber})</div>
        </div>`;
    });
    resultsContainer.innerHTML = html;
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');

    setTimeout(() => {
        if (typeof map !== 'undefined' && map) {
            map.invalidateSize();
        }
    }, 300);
}


window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
};