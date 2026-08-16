// =============================================
// DEKLARASI GLOBAL - HANYA SEKALI DI SINI
// =============================================
const API_BASE = window.location.origin + '/fiber-manager/api';

// Global variables
let map;
let markersLayer;
let devices = { odc: [], odp: [], pop: [], olt: [], pole: [] };
let currentEditingDevice = null;
let currentPortConfig = { deviceId: null, portNumber: null };
let odpMarkers = {};
let odpLines = {};
let odcLines = {};
let portLines = {};
let highlightedMarker = null;
let isClusteringEnabled = true;
let isLinesEnabled = true;
let baseTileLayer = null;
let selectedDeviceLines = [];

function getDeviceType(device) {
    if (!device) return 'device';

    if (typeof device.type === 'string' && ['odc', 'odp', 'pop', 'pole'].includes(device.type)) {
        return device.type;
    }

    if (devices.odc.some(d => d === device)) return 'odc';
    if (devices.odp.some(d => d === device)) return 'odp';
    if (devices.pop.some(d => d === device)) return 'pop';
    if (devices.pole.some(d => d === device)) return 'pole';

    if (devices.odc.some(d => d.id == device.id)) return 'odc';
    if (devices.odp.some(d => d.id == device.id)) return 'odp';
    if (devices.pop.some(d => d.id == device.id)) return 'pop';
    if (devices.pole.some(d => d.id == device.id)) return 'pole';

    return 'device';
}

function highlightLine(line) {
    if (!line) return;
    const style = line.originalStyle || { color: '#3182ce', weight: 2, opacity: 0.7 };
    line.setStyle({
        color: style.color,
        weight: (style.weight || 2) + 3,
        opacity: 1.0,
        dashArray: null
    });
    if (typeof line.bringToFront === 'function') {
        line.bringToFront();
    }
}

function resetLineStyle(line) {
    if (!line) return;
    if (selectedDeviceLines.includes(line)) return;
    const style = line.originalStyle || { color: '#3182ce', weight: 2, opacity: 0.7, dashArray: null };
    line.setStyle({
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        dashArray: style.dashArray
    });
}

function clearSelectedDeviceLines() {
    selectedDeviceLines.forEach(line => {
        const style = line.originalStyle || { color: '#3182ce', weight: 2, opacity: 0.7, dashArray: null };
        line.setStyle({
            color: style.color,
            weight: style.weight,
            opacity: style.opacity,
            dashArray: style.dashArray
        });
    });
    selectedDeviceLines = [];
}

function highlightLinesForDevice(device) {
    clearSelectedDeviceLines();
    if (!device) return;

    const deviceType = getDeviceType(device);
    const isODC = deviceType === 'odc';
    const isPOP = deviceType === 'pop';
    const isODP = deviceType === 'odp';

    if (isPOP) {
        Object.values(odcLines).forEach(line => {
            const odc = devices.odc.find(o => o.id == line.odcId);
            if (line.sourceId == device.id || (odc && odc.source_id == device.id)) {
                selectedDeviceLines.push(line);
            }
        });
    } else if (isODC) {
        if (odcLines[device.id]) {
            selectedDeviceLines.push(odcLines[device.id]);
        }
        Object.values(odpLines).forEach(line => {
            const odp = devices.odp.find(o => o.id == line.odpId);
            if (line.odcId == device.id || (odp && odp.source_id == device.id)) {
                selectedDeviceLines.push(line);
            }
        });
    } else if (isODP) {
        if (odpLines[device.id]) {
            selectedDeviceLines.push(odpLines[device.id]);
        }
        Object.values(portLines).forEach(line => {
            if (line.odpId == device.id) {
                selectedDeviceLines.push(line);
            }
        });
    } else if (device.port && device.odp) {
        const portKey = `${device.odp.id}_${device.port.port_number}`;
        if (portLines[portKey]) {
            selectedDeviceLines.push(portLines[portKey]);
        }
    }

    selectedDeviceLines.forEach(line => {
        highlightLine(line);
    });
}

function getDistanceToPolyline(clickLatLng, polyline) {
    if (!map) return Infinity;
    const clickPoint = map.latLngToLayerPoint(clickLatLng);
    const latlngs = polyline.getLatLngs();
    if (!latlngs || latlngs.length === 0) return Infinity;

    let minDistance = Infinity;
    const points = latlngs.map(ll => map.latLngToLayerPoint(ll));

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dist = getSqSegDist(clickPoint, p1, p2);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }

    return Math.sqrt(minDistance);
}

function getSqSegDist(p, v, w) {
    const l2 = distSq(v, w);
    if (l2 === 0) return distSq(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return distSq(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

function distSq(v, w) {
    return (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
}

function handleLineClick(e) {
    const clickLatLng = e.latlng;

    const allLines = [
        ...Object.values(odcLines),
        ...Object.values(odpLines),
        ...Object.values(portLines)
    ];

    const tolerance = 15; // pixels
    const nearbyLines = [];

    allLines.forEach(line => {
        if (!map.hasLayer(line)) return;
        const dist = getDistanceToPolyline(clickLatLng, line);
        if (dist <= tolerance) {
            nearbyLines.push({ line, dist });
        }
    });

    nearbyLines.sort((a, b) => a.dist - b.dist);

    if (nearbyLines.length === 0) return;

    if (nearbyLines.length === 1) {
        showLineDetails(nearbyLines[0].line);
        return;
    }

    let popupContent = `<div style="min-width: 250px; font-family: sans-serif;">
        <h5 style="margin: 0 0 8px 0; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #4a5568;"><i class="fas fa-project-diagram"></i> Kabel di Titik Ini (${nearbyLines.length})</h5>
        <ul style="list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto;">`;

    nearbyLines.forEach((item, index) => {
        const line = item.line;
        let label = 'Kabel';
        let iconClass = 'fa-route';
        let iconColor = '#a0aec0';
        let onClickAction = '';

        if (line.lineType === 'feeder') {
            const odc = devices.odc.find(o => o.id == line.odcId);
            label = `Feeder: POP → ODC ${odc ? odc.name : line.odcId}`;
            iconColor = '#9b59b6';
            if (odc) onClickAction = `showDeviceInfo(${JSON.stringify(odc).replace(/"/g, '&quot;')})`;
        } else if (line.lineType === 'connection') {
            const odp = devices.odp.find(o => o.id == line.odpId);
            label = `Distribusi: ODC → ODP ${odp ? odp.name : line.odpId}`;
            iconColor = '#48bb78';
            if (odp) onClickAction = `showDeviceInfo(${JSON.stringify(odp).replace(/"/g, '&quot;')})`;
        } else if (line.lineType === 'drop') {
            const odp = devices.odp.find(o => o.id == line.odpId);
            const port = odp && odp.ports ? odp.ports.find(p => p.port_number == line.portNumber) : null;
            let distance = 0;
            if (line.getLatLngs) {
                const latlngs = line.getLatLngs();
                for (let i = 0; i < latlngs.length - 1; i++) {
                    distance += map.distance(latlngs[i], latlngs[i + 1]);
                }
            }
            label = `Drop: ODP ${odp ? odp.name : line.odpId} → Port ${line.portNumber} (${port && port.target ? port.target : 'Pelanggan'})`;
            iconColor = '#3182ce';
            if (odp && port) {
                const customerData = {
                    odp: odp,
                    port: port,
                    distance: distance,
                    customerLat: parseFloat(port.lat),
                    customerLng: parseFloat(port.lng)
                };
                onClickAction = `showCustomerInfo(${JSON.stringify(customerData).replace(/"/g, '&quot;')})`;
            }
        }

        popupContent += `
            <li 
                onmouseover="window.highlightLineByIndex(${index})" 
                onmouseout="window.resetLineByIndex(${index})"
                onclick="${onClickAction}; map.closePopup();"
                style="padding: 6px 8px; margin-bottom: 4px; background: #f7fafc; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; border: 1px solid #e2e8f0; font-size: 12px;"
            >
                <i class="fas ${iconClass}" style="color: ${iconColor};"></i>
                <span style="flex: 1; font-weight: 500; color: #2d3748; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${label}</span>
                <i class="fas fa-chevron-right" style="font-size: 10px; color: #cbd5e0;"></i>
            </li>`;
    });

    popupContent += `</ul></div>`;

    window.activeNearbyLines = nearbyLines.map(item => item.line);
    window.highlightLineByIndex = function (idx) {
        if (window.activeNearbyLines && window.activeNearbyLines[idx]) {
            highlightLine(window.activeNearbyLines[idx]);
        }
    };
    window.resetLineByIndex = function (idx) {
        if (window.activeNearbyLines && window.activeNearbyLines[idx]) {
            resetLineStyle(window.activeNearbyLines[idx]);
        }
    };

    L.popup()
        .setLatLng(clickLatLng)
        .setContent(popupContent)
        .openOn(map);
}

function showLineDetails(line) {
    if (line.lineType === 'feeder') {
        const odc = devices.odc.find(o => o.id == line.odcId);
        if (odc) showDeviceInfo(odc);
    } else if (line.lineType === 'connection') {
        const odp = devices.odp.find(o => o.id == line.odpId);
        if (odp) showDeviceInfo(odp);
    } else if (line.lineType === 'drop') {
        const odp = devices.odp.find(o => o.id == line.odpId);
        const port = odp && odp.ports ? odp.ports.find(p => p.port_number == line.portNumber) : null;
        if (odp && port) {
            const customerData = {
                odp: odp,
                port: port,
                distance: 0,
                customerLat: parseFloat(port.lat),
                customerLng: parseFloat(port.lng)
            };
            if (line.getLatLngs) {
                const latlngs = line.getLatLngs();
                let distance = 0;
                for (let i = 0; i < latlngs.length - 1; i++) {
                    distance += map.distance(latlngs[i], latlngs[i + 1]);
                }
                customerData.distance = distance;
            }
            showCustomerInfo(customerData);
        }
    }
}

function addLineHoverHandlers(line) {
    line.on('mouseover', () => highlightLine(line));
    line.on('mouseout', () => resetLineStyle(line));
    line.on('click', handleLineClick);
}

function toggleMapType() {
    const cb = document.getElementById('toggleMapType');
    const isSatellite = cb ? cb.checked : true;
    // Save setting
    localStorage.setItem('toggleMapType', isSatellite);

    if (baseTileLayer && map) {
        map.removeLayer(baseTileLayer);
    }

    const url = isSatellite ? 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}' : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    baseTileLayer = L.tileLayer(url, {
        attribution: '© Google',
        maxZoom: 22,
        maxNativeZoom: 20
    }).addTo(map);

    baseTileLayer.bringToBack();
}

function toggleMapClustering() {
    const cb = document.getElementById('toggleClustering');
    isClusteringEnabled = cb ? cb.checked : true;
    // Save setting
    localStorage.setItem('toggleClustering', isClusteringEnabled);
    refreshMapMarkers();
}

function toggleMapLines() {
    const cb = document.getElementById('toggleLines');
    isLinesEnabled = cb ? cb.checked : true;
    // Save setting
    localStorage.setItem('toggleLines', isLinesEnabled);
    refreshMapMarkers();
}

// =============================================
// FUNGSI-FUNGSI MAP
// =============================================

// Initialize map
function initMap() {
    // Load saved map view settings
    const savedCenter = localStorage.getItem('mapCenter');
    const savedZoom = localStorage.getItem('mapZoom');
    const defaultCenter = [-6.966409024897329, 109.6469502011238];
    const defaultZoom = 13;
    const center = savedCenter ? JSON.parse(savedCenter) : defaultCenter;
    const zoom = savedZoom ? parseInt(savedZoom) : defaultZoom;
    map = L.map('map', { preferCanvas: true }).setView(center, zoom);
    // Google Satellite (lyrs=s) atau Mode Standar (lyrs=m)
    // Determine map type (satellite or roadmap) from saved setting.
    // If no setting is saved, default to satellite (true).
    const storedMapType = localStorage.getItem('toggleMapType');
    const isSatellite = storedMapType === null ? true : storedMapType === 'true';
    const url = isSatellite ? 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}' : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    baseTileLayer = L.tileLayer(url, {
        attribution: '© Google',
        maxZoom: 22,
        maxNativeZoom: 20
    }).addTo(map);
    baseTileLayer.bringToBack();

    // Restore toggle checkbox states
    // Restore toggle checkbox states and global flags
    const cbMapType = document.getElementById('toggleMapType');
    if (cbMapType) cbMapType.checked = isSatellite;
    const cbClustering = document.getElementById('toggleClustering');
    if (cbClustering) {
        const clusteringChecked = localStorage.getItem('toggleClustering') !== 'false';
        cbClustering.checked = clusteringChecked;
        isClusteringEnabled = clusteringChecked;
    }
    const cbLines = document.getElementById('toggleLines');
    if (cbLines) {
        const linesChecked = localStorage.getItem('toggleLines') !== 'false';
        cbLines.checked = linesChecked;
        isLinesEnabled = linesChecked;
    }

    // Persist map movement (center & zoom)
    map.on('moveend', function () {
        const c = map.getCenter();
        localStorage.setItem('mapCenter', JSON.stringify({ lat: c.lat, lng: c.lng }));
        localStorage.setItem('mapZoom', map.getZoom());
    });

    markersLayer = L.layerGroup().addTo(map);

    // Inisialisasi Marker Cluster untuk performa tinggi
    if (typeof L.markerClusterGroup !== 'undefined') {
        window.markerClusterGroup = L.markerClusterGroup({
            disableClusteringAtZoom: 18,
            maxClusterRadius: 50
        }).addTo(map);
    }

    // Inisialisasi dukungan Drag & Drop
    initDragAndDropSupport();

    map.on('click', function () {
        clearSelectedDeviceLines();
    });

    const updateTooltipVisibility = () => {
        const currentZoom = map.getZoom();
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            if (currentZoom >= 16) {
                mapContainer.classList.remove('hide-marker-tooltip-labels');
            } else {
                mapContainer.classList.add('hide-marker-tooltip-labels');
            }
        }
    };

    map.on('zoomend', updateTooltipVisibility);
    setTimeout(updateTooltipVisibility, 500);
}

// Inisialisasi dukungan Drag & Drop dari Pojok Peta
function initDragAndDropSupport() {
    const dragItems = document.querySelectorAll('.drag-item');
    dragItems.forEach(item => {
        item.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', this.dataset.type);
            this.classList.add('dragging');
        });

        item.addEventListener('dragend', function () {
            this.classList.remove('dragging');
        });
    });

    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    mapContainer.addEventListener('dragover', function (e) {
        e.preventDefault(); // Diperlukan agar event drop bisa ditrigger
        e.dataTransfer.dropEffect = 'copy';
    });

    mapContainer.addEventListener('drop', function (e) {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (type === 'odp' || type === 'odc' || type === 'pole') {
            // Konversi koordinat drop event ke objek LatLng Leaflet
            const latlng = map.mouseEventToLatLng(e);
            if (latlng && typeof handleMapDeviceDrop === 'function') {
                handleMapDeviceDrop(type, latlng);
            }
        }
    });
}

function extractGoogleMapsCoordinates(input) {
    if (typeof input !== 'string') return null;

    const value = input.trim();
    if (!value) return null;

    const googlePatterns = [
        /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,|\/|\?|&|$)/i,
        /[?&](?:q|center|destination|daddr|saddr|origin)=([^&]+)/i,
        /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
        /(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
    ];

    for (const pattern of googlePatterns) {
        const match = value.match(pattern);
        if (!match) continue;

        let lat = null;
        let lng = null;

        if (pattern.source.includes('!3d')) {
            lat = parseFloat(match[1]);
            lng = parseFloat(match[2]);
        } else if (pattern.source.includes('[?&](?:q|center|destination|daddr|saddr|origin)')) {
            const raw = decodeURIComponent(match[1]).replace(/\+/g, ' ');
            const direct = raw.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
            if (!direct) continue;
            lat = parseFloat(direct[1]);
            lng = parseFloat(direct[2]);
        } else if (pattern.source.includes('@')) {
            lat = parseFloat(match[1]);
            lng = parseFloat(match[2]);
        } else {
            const normalized = match[0].replace(/[^0-9.,-]/g, '');
            const parts = normalized.split(',');
            if (parts.length < 2) continue;
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
        }

        if (isNaN(lat) || isNaN(lng)) continue;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
        return { lat, lng };
    }

    return null;
}

// Parse coordinate string to lat/lng
function parseCoordinates(coordString) {
    if (typeof coordString !== 'string') return null;

    const value = coordString.trim();
    if (!value) return null;

    const googleCoords = extractGoogleMapsCoordinates(value);
    if (googleCoords) {
        return googleCoords;
    }

    const cleaned = value.replace(/\s+/g, '');
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

async function resolveGoogleMapsShortLink(rawUrl) {
    const url = rawUrl.trim();
    if (!/maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.|google\.[^\s]+\/maps/i.test(url)) {
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/resolve_google_maps.php?url=${encodeURIComponent(url)}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
            return null;
        }

        return { lat: data.lat, lng: data.lng };
    } catch (error) {
        console.error('Failed to resolve Google Maps short link:', error);
        return null;
    }
}

async function autoConvertCoordinateField(field) {
    if (!field || typeof field.value !== 'string') return;

    const raw = field.value.trim();
    if (!raw) return;

    const directCoords = parseCoordinates(raw);
    if (directCoords) {
        const hasGoogleMapsLink = /google\.|maps\.app|maps\.google|goo\.gl|maps\?q|@-?\d+\./i.test(raw);
        if (hasGoogleMapsLink) {
            field.value = formatCoordinates(directCoords.lat, directCoords.lng);
        }
        return;
    }

    if (/maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^\s]+\/maps/i.test(raw)) {
        const resolved = await resolveGoogleMapsShortLink(raw);
        if (resolved) {
            field.value = formatCoordinates(resolved.lat, resolved.lng);
        }
    }
}

function attachCoordinateAutoFill() {
    document.querySelectorAll('input[id$="Coordinates"]').forEach(field => {
        field.addEventListener('blur', function () {
            autoConvertCoordinateField(this);
        });

        field.addEventListener('paste', function () {
            setTimeout(() => autoConvertCoordinateField(this), 50);
        });

        field.addEventListener('input', function () {
            const raw = this.value.trim();
            if (!raw) return;
            if (/google\.|maps\.app|maps\.google|goo\.gl|maps\?q|@-?\d+\./i.test(raw)) {
                setTimeout(() => autoConvertCoordinateField(this), 50);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    attachCoordinateAutoFill();
});

let coordinatePickerTargetId = null;
let coordinatePickerMap = null;
let coordinatePickerMarker = null;
let coordinatePickerHiddenModals = [];

function setCoordinateField(fieldId, latlng) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.value = formatCoordinates(latlng.lat, latlng.lng);
}

function startCoordinatePicker(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) {
        alert('Field koordinat tidak ditemukan: ' + fieldId);
        return;
    }

    coordinatePickerTargetId = fieldId;
    const modal = document.getElementById('coordinatePickerModal');
    if (!modal) {
        alert('Modal pemilih koordinat tidak ditemukan.');
        return;
    }

    // Hide any other open modals so picker modal sits on top and no background modal gets corrupted
    coordinatePickerHiddenModals = [];
    document.querySelectorAll('.modal.show').forEach(m => {
        if (m.id && m.id !== 'coordinatePickerModal') {
            coordinatePickerHiddenModals.push(m.id);
            m.classList.remove('show');
        }
    });

    modal.classList.add('show');
    setTimeout(() => {
        if (coordinatePickerMap) {
            coordinatePickerMap.invalidateSize();
        }
    }, 100);

    if (!coordinatePickerMap) {
        const center = map ? map.getCenter() : L.latLng(-6.966409024897329, 109.6469502011238);
        const zoom = map ? map.getZoom() : 13;
        coordinatePickerMap = L.map('coordinatePickerMap').setView(center, zoom);
        L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            attribution: '© Google',
            maxZoom: 22,
            maxNativeZoom: 20
        }).addTo(coordinatePickerMap);
        coordinatePickerMap.on('click', function (e) {
            setCoordinateField(coordinatePickerTargetId, e.latlng);
            addCoordinatePickerMarker(e.latlng, 'Koordinat dipilih');
            closeCoordinatePicker();
        });
    } else {
        coordinatePickerMap.invalidateSize();
        if (map) {
            coordinatePickerMap.setView(map.getCenter(), map.getZoom());
        }
    }

    const currentCoords = parseCoordinates(field.value);
    if (currentCoords) {
        addCoordinatePickerMarker(currentCoords, 'Koordinat saat ini');
        coordinatePickerMap.setView(currentCoords, 17);
    }
}

function addCoordinatePickerMarker(latlng, label) {
    if (!coordinatePickerMap) return;
    if (coordinatePickerMarker) {
        coordinatePickerMap.removeLayer(coordinatePickerMarker);
        coordinatePickerMarker = null;
    }
    coordinatePickerMarker = L.marker(latlng).addTo(coordinatePickerMap);
    coordinatePickerMarker.bindPopup(label).openPopup();
}

function closeCoordinatePicker() {
    const modal = document.getElementById('coordinatePickerModal');
    if (modal) modal.classList.remove('show');
    coordinatePickerTargetId = null;
    // restore any modals that were hidden when picker opened
    if (coordinatePickerHiddenModals && coordinatePickerHiddenModals.length) {
        coordinatePickerHiddenModals.forEach(id => {
            const m = document.getElementById(id);
            if (m) m.classList.add('show');
        });
        coordinatePickerHiddenModals = [];
    }
}

function useCurrentLocation(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) {
        alert('Field koordinat tidak ditemukan: ' + fieldId);
        return;
    }
    if (!navigator.geolocation) {
        alert('Geolocation tidak didukung oleh browser Anda.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const latlng = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            setCoordinateField(fieldId, latlng);

            if (coordinatePickerMap && document.getElementById('coordinatePickerModal')?.classList.contains('show')) {
                addCoordinatePickerMarker(latlng, 'Lokasi saat ini');
                coordinatePickerMap.setView(latlng, 17);
            } else if (map) {
                if (coordinatePickerMarker) {
                    map.removeLayer(coordinatePickerMarker);
                    coordinatePickerMarker = null;
                }
                coordinatePickerMarker = L.marker(latlng).addTo(map);
                coordinatePickerMarker.bindPopup('Lokasi saat ini').openPopup();
                map.setView(latlng, 17);
            }
        },
        function (error) {
            alert('Tidak dapat mengambil lokasi saat ini: ' + error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

async function searchAndZoom() {
    const input = document.getElementById('searchCoordinate');
    if (!input) return;

    const rawValue = input.value.trim();
    if (!rawValue) {
        alert('Masukkan koordinat atau link Google Maps terlebih dahulu');
        return;
    }

    let coords = parseCoordinates(rawValue);
    if (!coords && /maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^\s]+\/maps|maps\.google\./i.test(rawValue)) {
        coords = await resolveGoogleMapsShortLink(rawValue);
    }

    if (!coords) {
        alert('Format koordinat tidak valid!\n\nGunakan format: latitude, longitude\nContoh: -6.963707888562949, 109.64706473647041\nAtau paste link Google Maps');
        return;
    }

    if (rawValue !== formatCoordinates(coords.lat, coords.lng)) {
        input.value = formatCoordinates(coords.lat, coords.lng);
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

// Load devices from API - HANYA SATU DEKLARASI
async function loadDevices() {
    try {
        const [odcRes, odpRes, popRes, oltRes, poleRes] = await Promise.all([
            fetchWithAuth(`${API_BASE}/odc.php`),
            fetchWithAuth(`${API_BASE}/odp.php`),
            fetchWithAuth(`${API_BASE}/pop.php`),
            fetchWithAuth(`${API_BASE}/olt.php`),
            fetchWithAuth(`${API_BASE}/pole.php`)
        ]);

        if (!odcRes || !odpRes || !popRes || !oltRes || !poleRes) return;

        const odcData = await odcRes.json();
        const odpData = await odpRes.json();
        const popData = await popRes.json();
        const oltData = await oltRes.json();
        const poleData = await poleRes.json();

        devices.odc = Array.isArray(odcData) ? odcData : [];
        devices.odp = Array.isArray(odpData) ? odpData : [];
        devices.pop = Array.isArray(popData) ? popData : [];
        devices.olt = Array.isArray(oltData) ? oltData : [];
        devices.pole = Array.isArray(poleData) ? poleData : [];

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

function getODPStatus(available, total) {
    if (total === 0) return 'full';
    const percentage = (available / total) * 100;
    if (available === 0) return 'full';
    if (percentage < 20) return 'critical';
    if (percentage <= 50) return 'warning';
    return 'normal';
}

function getColorFilter(status) {
    switch (status) {
        case 'normal': return 'none';
        case 'warning': return 'hue-rotate(-30deg) saturate(2) brightness(1.1)';
        case 'critical': return 'hue-rotate(140deg) saturate(3) brightness(0.9)';
        case 'full': return 'grayscale(1) brightness(0.6)';
        default: return 'none';
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'normal': return '#48bb78';
        case 'warning': return '#ecc94b';
        case 'critical': return '#f56565';
        case 'full': return '#718096';
        default: return '#48bb78';
    }
}

// =============================================
// FUNGSI ICON
// =============================================

function createPOPIcon() {
    return L.divIcon({
        html: `
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 50%; border: 3px solid #9b59b6; box-shadow: 0 3px 8px rgba(155, 89, 182, 0.4); transition: transform 0.2s ease;">
                <i class="fas fa-building" style="color: #9b59b6; font-size: 16px;"></i>
            </div>
        `,
        className: 'pop-marker-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
}

function drawFeederLine(odc, sourceLatLng) {
    let latlngs = [];

    if (odc.path_coordinates) {
        try {
            latlngs = JSON.parse(odc.path_coordinates);
        } catch (e) {
            latlngs = [sourceLatLng, [parseFloat(odc.lat), parseFloat(odc.lng)]];
        }
    } else {
        latlngs = [sourceLatLng, [parseFloat(odc.lat), parseFloat(odc.lng)]];
    }

    // Kabel Feeder: garis solid ungu tebal 4px
    const line = L.polyline(latlngs, {
        color: '#9b59b6',
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round'
    }).addTo(markersLayer);

    line.originalStyle = { color: '#9b59b6', weight: 4, opacity: 0.9, dashArray: null };
    line.lineType = 'feeder';
    line.odcId = odc.id;
    line.sourceId = odc.source_id;
    line.oltId = odc.olt_id;

    addLineHoverHandlers(line);

    let distance = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
        distance += map.distance(latlngs[i], latlngs[i + 1]);
    }

    line.bindTooltip(`Kabel Feeder (POP → ODC ${odc.name}): ${Math.round(distance)} Meter`, { sticky: true });
    odcLines[odc.id] = line;
}

function createODCIcon() {
    return L.divIcon({
        html: `<div style="width: 40px; height: 40px; background-image: url('assets/icons/odc-icon.png'); background-size: contain; background-repeat: no-repeat; background-position: center; filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.3));"></div>`,
        className: 'custom-marker-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
}

function createODPIcon(availablePorts = null, totalPorts = null) {
    let status = 'normal';
    if (availablePorts !== null && totalPorts !== null) {
        status = getODPStatus(availablePorts, totalPorts);
    }
    const borderColor = getStatusColor(status);

    return L.divIcon({
        html: `
            <div style="position: relative; width: 36px; height: 36px;">
                <img src="assets/icons/odp-icon.png" style="width: 32px; height: 32px; filter: ${getColorFilter(status)} drop-shadow(2px 2px 3px rgba(0,0,0,0.3));" alt="ODP">
                <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 12px; height: 12px; background: ${borderColor}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>
            </div>
        `,
        className: 'custom-marker-icon',
        iconSize: [36, 40],
        iconAnchor: [18, 40],
        popupAnchor: [0, -40]
    });
}

function createPoleIcon() {
    return L.divIcon({
        html: `
            <div style="position: relative; width: 32px; height: 40px; display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="36" viewBox="0 0 24 36" style="filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.3));">
                    <!-- Pole (vertical line) -->
                    <rect x="10" y="4" width="4" height="28" fill="#8B7355" stroke="#654321" stroke-width="1"/>
                    <!-- Crossbar at top -->
                    <rect x="6" y="6" width="12" height="2" fill="#8B7355" stroke="#654321" stroke-width="1"/>
                    <!-- Cap/Top -->
                    <circle cx="12" cy="4" r="3" fill="#CD5C5C" stroke="#9B4444" stroke-width="1"/>
                </svg>
            </div>
        `,
        className: 'pole-marker-icon',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
    });
}

// =============================================
// REFRESH MAP MARKERS
// =============================================

function refreshMapMarkers() {
    markersLayer.clearLayers();
    if (window.markerClusterGroup) {
        window.markerClusterGroup.clearLayers();
    }
    odpMarkers = {};
    odpLines = {};
    odcLines = {};

    // 1. Render POP Markers
    if (devices.pop) {
        devices.pop.forEach(pop => {
            const lat = parseFloat(pop.lat);
            const lng = parseFloat(pop.lng);
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return; // Lewati koordinat tidak valid
            }
            const marker = L.marker([lat, lng], { icon: createPOPIcon() }).addTo(markersLayer);
            marker.on('click', () => {
                highlightLinesForDevice(pop);
            });
            marker.bindTooltip(pop.name, {
                permanent: true,
                direction: 'top',
                className: 'marker-tooltip-label',
                offset: [0, -20]
            });
            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <h4 style="margin: 0 0 10px 0; color: #9b59b6;"><i class="fas fa-building"></i> ${pop.name}</h4>
                    <p style="margin: 4px 0;"><strong>Tipe:</strong> POP (Point of Presence)</p>
                    <p style="margin: 4px 0;"><strong>Kode:</strong> ${pop.code || '-'}</p>
                    <p style="margin: 4px 0;"><strong>Lokasi:</strong> ${pop.location || '-'}</p>
                    <p style="margin: 4px 0;"><strong>Alamat:</strong> ${pop.address || '-'}</p>
                    <p style="margin: 4px 0;"><strong>Total OLT:</strong> ${pop.olt_count || 0}</p>
                </div>
            `);
        });
    }

    // 2. Render ODC Markers & Feeder Lines
    devices.odc.forEach(odc => {
        const marker = L.marker([parseFloat(odc.lat), parseFloat(odc.lng)], { icon: createODCIcon() }).addTo(markersLayer);
        marker.bindTooltip(odc.name, {
            permanent: true,
            direction: 'top',
            className: 'marker-tooltip-label',
            offset: [0, -40]
        });
        marker.bindPopup(createPopupContent(odc));
        marker.on('click', (e) => {
            if (window.mapSelectionCallback && typeof window.mapSelectionCallback === 'function') {
                try {
                    window.mapSelectionCallback(odc);
                } catch (err) {
                    console.error('mapSelectionCallback error:', err);
                }
            } else {
                showDeviceInfo(odc);
            }
        });

        // Gambar Kabel Feeder dari OLT/POP ke ODC ini
        let sourceLatLng = null;

        // Cari koordinat OLT terlebih dahulu (jika ada dan valid)
        if (odc.olt_id && devices.olt) {
            const olt = devices.olt.find(o => o.id == odc.olt_id);
            if (olt && olt.lat && olt.lng) {
                const oltLat = parseFloat(olt.lat);
                const oltLng = parseFloat(olt.lng);
                if (!isNaN(oltLat) && !isNaN(oltLng) && oltLat >= -90 && oltLat <= 90 && oltLng >= -180 && oltLng <= 180) {
                    sourceLatLng = [oltLat, oltLng];
                }
            }
        }

        // Jika OLT tidak berkoordinat, cari koordinat POP induknya
        if (!sourceLatLng && odc.source_id && devices.pop) {
            const pop = devices.pop.find(p => p.id == odc.source_id);
            if (pop) {
                const popLat = parseFloat(pop.lat);
                const popLng = parseFloat(pop.lng);
                if (!isNaN(popLat) && !isNaN(popLng) && popLat >= -90 && popLat <= 90 && popLng >= -180 && popLng <= 180) {
                    sourceLatLng = [popLat, popLng];
                }
            }
        }

        if (sourceLatLng && isLinesEnabled) {
            drawFeederLine(odc, sourceLatLng);
        }
    });

    // 3. Render Pole Markers
    devices.pole.forEach(pole => {
        const marker = L.marker([parseFloat(pole.lat), parseFloat(pole.lng)], { icon: createPoleIcon() });
        marker.bindTooltip(pole.name, {
            permanent: true,
            direction: 'top',
            className: 'marker-tooltip-label',
            offset: [0, -40]
        });
        if (window.markerClusterGroup && isClusteringEnabled) {
            marker.addTo(window.markerClusterGroup);
        } else {
            marker.addTo(markersLayer);
        }
        marker.bindPopup(createPopupContent(pole));
        marker.on('click', () => showDeviceInfo(pole));
    });

    // 4. Render ODP Markers & Distribution Lines
    devices.odp.forEach(odp => {
        const icon = createODPIcon(odp.available_ports, odp.total_ports);
        const marker = L.marker([parseFloat(odp.lat), parseFloat(odp.lng)], { icon: icon });
        marker.bindTooltip(odp.name, {
            permanent: true,
            direction: 'top',
            className: 'marker-tooltip-label',
            offset: [0, -40]
        });
        if (window.markerClusterGroup && isClusteringEnabled) {
            marker.addTo(window.markerClusterGroup);
        } else {
            marker.addTo(markersLayer);
        }
        marker.bindPopup(createPopupContent(odp));
        marker.on('click', () => showDeviceInfo(odp));
        odpMarkers[odp.id] = marker;

        if (odp.source_id && odp.source_type === 'odc') {
            const source = devices.odc.find(d => d.id == odp.source_id);
            if (source && isLinesEnabled) {
                drawConnectionLine(odp, source);
            }
        }

        // Render Customer (Port) Markers & Drop Wire Lines
        if (odp.ports && odp.ports.length > 0) {
            odp.ports.forEach(port => {
                if (port.status === 'used' && port.lat && port.lng) {
                    const cLat = parseFloat(port.lat);
                    const cLng = parseFloat(port.lng);
                    if (!isNaN(cLat) && !isNaN(cLng) && cLat >= -90 && cLat <= 90 && cLng >= -180 && cLng <= 180) {
                        // Create customer marker
                        const customerIcon = L.divIcon({
                            html: '<div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 50%; border: 2px solid #3182ce; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-home" style="color: #3182ce; font-size: 12px;"></i></div>',
                            className: 'customer-marker-icon',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12],
                            popupAnchor: [0, -12]
                        });

                        const customerMarker = L.marker([cLat, cLng], { icon: customerIcon });
                        customerMarker.bindTooltip(port.target || 'Pelanggan', {
                            permanent: true,
                            direction: 'top',
                            className: 'marker-tooltip-label',
                            offset: [0, -15]
                        });
                        if (window.markerClusterGroup && isClusteringEnabled) {
                            customerMarker.addTo(window.markerClusterGroup);
                        } else {
                            customerMarker.addTo(markersLayer);
                        }

                        // Prepare path coordinates - check if custom path exists
                        let latlngs = [];
                        if (port.path_coordinates) {
                            try {
                                latlngs = JSON.parse(port.path_coordinates);
                            } catch (e) {
                                latlngs = [[parseFloat(odp.lat), parseFloat(odp.lng)], [cLat, cLng]];
                            }
                        } else {
                            latlngs = [[parseFloat(odp.lat), parseFloat(odp.lng)], [cLat, cLng]];
                        }

                        // Calculate total distance
                        let distance = 0;
                        for (let i = 0; i < latlngs.length - 1; i++) {
                            distance += map.distance(latlngs[i], latlngs[i + 1]);
                        }

                        // Store customer data for side panel display
                        const customerData = {
                            odp: odp,
                            port: port,
                            distance: distance,
                            customerLat: cLat,
                            customerLng: cLng
                        };
                        customerMarker.on('click', () => showCustomerInfo(customerData));

                        // Add button to popup only if user is admin or operator
                        const currentUser = window.currentUser;
                        const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'operator');
                        const portKey = `${odp.id}_${port.port_number}`;
                        const editButtonHtml = canEdit ? `<button onclick="togglePortPathEdit('${portKey}')" id="btnEditPortPath-${portKey}" style="width: 100%; margin-top: 10px; padding: 8px; background: #3182ce; color: white; border: none; border-radius: 3px; cursor: pointer; transition: 0.3s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="fas fa-route"></i> Edit Jalur Kabel</button>` : '';

                        customerMarker.bindPopup(`
                            <div style="min-width: 200px;">
                                <h4 style="margin: 0 0 10px 0; color: #3182ce;"><i class="fas fa-user"></i> ${port.target || 'Pelanggan'}</h4>
                                <p style="margin: 4px 0;"><strong>ODP:</strong> ${odp.name}</p>
                                <p style="margin: 4px 0;"><strong>Port:</strong> ${port.port_number}</p>
                                ${port.onu_number ? `<p style="margin: 4px 0;"><strong>ONU/SN:</strong> ${port.onu_number}</p>` : ''}
                                ${port.modem_type ? `<p style="margin: 4px 0;"><strong>Modem:</strong> ${port.modem_type}</p>` : ''}
                                <p style="margin: 4px 0; font-size: 11px; color: #718096;">Koord: ${cLat.toFixed(6)}, ${cLng.toFixed(6)}</p>
                                ${editButtonHtml}
                            </div>
                        `);

                        if (isLinesEnabled) {
                            // Draw line to customer (Kabel Drop / Drop Wire)
                            const line = L.polyline(latlngs, {
                                color: '#3182ce',
                                weight: 2,
                                opacity: 0.7,
                                dashArray: '4, 4'
                            }).addTo(markersLayer);

                            line.bindTooltip(`Kabel Drop: ${port.target || 'Pelanggan'} (Port ${port.port_number}) - ${Math.round(distance)}m`, { sticky: true });

                            // Store line reference for editing
                            line.originalStyle = { color: '#3182ce', weight: 2, opacity: 0.7, dashArray: '4, 4' };
                            line.lineType = 'drop';
                            line.portKey = portKey;
                            line.odpId = odp.id;
                            line.portNumber = port.port_number;
                            portLines[portKey] = line;

                            addLineHoverHandlers(line);
                        }
                    }
                }
            });
        }
    });
}

function drawConnectionLine(odp, source) {
    let latlngs = [];

    if (odp.path_coordinates) {
        try {
            latlngs = JSON.parse(odp.path_coordinates);
        } catch (e) {
            latlngs = [[parseFloat(odp.lat), parseFloat(odp.lng)], [parseFloat(source.lat), parseFloat(source.lng)]];
        }
    } else {
        latlngs = [[parseFloat(odp.lat), parseFloat(odp.lng)], [parseFloat(source.lat), parseFloat(source.lng)]];
    }

    const line = L.polyline(latlngs, { color: '#48bb78', weight: 3, opacity: 0.8, dashArray: '5, 5' }).addTo(markersLayer);

    line.originalStyle = { color: '#48bb78', weight: 3, opacity: 0.8, dashArray: '5, 5' };
    line.lineType = 'connection';
    line.odpId = odp.id;
    line.odcId = odp.source_id;

    addLineHoverHandlers(line);

    let distance = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
        distance += map.distance(latlngs[i], latlngs[i + 1]);
    }

    line.bindTooltip(`Jarak Kabel: ${Math.round(distance)} Meter`, { sticky: true });
    odpLines[odp.id] = line;
}

function togglePathEdit(odpId) {
    const line = odpLines[odpId];
    if (!line) return;

    const btn = document.getElementById(`btnEditPath-${odpId}`);

    if (line.pm && line.pm.enabled()) {
        line.pm.disable();
        const newLatLngs = line.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);
        const pathJson = JSON.stringify(newLatLngs);

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        fetchWithAuth(`${API_BASE}/odp.php?id=${odpId}`, {
            method: 'PUT',
            body: JSON.stringify({ path_coordinates: pathJson })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                alert('Jalur kabel berhasil disimpan!');
                loadDevices();
            })
            .catch(err => {
                console.error(err);
                alert('Gagal menyimpan jalur kabel: ' + err.message);
                btn.innerHTML = '<i class="fas fa-route"></i> Edit Jalur Kabel';
                btn.disabled = false;
            });
    } else if (line.pm) {
        Object.values(odpLines).forEach(l => {
            if (l.pm && l.pm.enabled()) {
                l.pm.disable();
                const b = document.getElementById(`btnEditPath-${l.odpId}`);
                if (b) {
                    b.innerHTML = '<i class="fas fa-route"></i> Edit Jalur Kabel';
                    b.style.background = '#ed8936';
                }
            }
        });

        Object.values(odcLines).forEach(l => {
            if (l.pm && l.pm.enabled()) {
                l.pm.disable();
                const b = document.getElementById(`btnEditOdcPath-${l.odcId}`);
                if (b) {
                    b.innerHTML = '<i class="fas fa-route"></i> Edit Jalur ODC';
                    b.style.background = '#9b59b6';
                }
            }
        });

        line.pm.enable({ allowSelfIntersection: true, preventMarkerRemoval: false });
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Jalur';
        btn.style.background = '#48bb78';
        map.fitBounds(line.getBounds(), { padding: [50, 50] });
    }
}

function toggleODCPathEdit(odcId) {
    const line = odcLines[odcId];
    if (!line) return;

    const btn = document.getElementById(`btnEditOdcPath-${odcId}`);

    if (line.pm && line.pm.enabled()) {
        line.pm.disable();
        const newLatLngs = line.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);
        const pathJson = JSON.stringify(newLatLngs);

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        fetchWithAuth(`${API_BASE}/odc.php?id=${odcId}`, {
            method: 'PUT',
            body: JSON.stringify({ path_coordinates: pathJson })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                alert('Jalur kabel ODC berhasil disimpan!');
                loadDevices();
            })
            .catch(err => {
                console.error(err);
                alert('Gagal menyimpan jalur kabel ODC: ' + err.message);
                btn.innerHTML = '<i class="fas fa-route"></i> Edit Jalur ODC';
                btn.disabled = false;
            });
    } else if (line.pm) {
        Object.values(odpLines).forEach(l => {
            if (l.pm && l.pm.enabled()) {
                l.pm.disable();
                const b = document.getElementById(`btnEditPath-${l.odpId}`);
                if (b) {
                    b.innerHTML = '<i class="fas fa-route"></i> Edit Jalur Kabel';
                    b.style.background = '#ed8936';
                }
            }
        });

        Object.values(odcLines).forEach(l => {
            if (l.pm && l.pm.enabled()) {
                l.pm.disable();
                const b = document.getElementById(`btnEditOdcPath-${l.odcId}`);
                if (b) {
                    b.innerHTML = '<i class="fas fa-route"></i> Edit Jalur ODC';
                    b.style.background = '#9b59b6';
                }
            }
        });

        line.pm.enable({ allowSelfIntersection: true, preventMarkerRemoval: false });
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Jalur';
        btn.style.background = '#48bb78';
        map.fitBounds(line.getBounds(), { padding: [50, 50] });
    }
}

function togglePortPathEdit(portKey) {
    const line = portLines[portKey];
    if (!line) return;

    const btn = document.getElementById(`btnEditPortPath-${portKey}`);

    if (line.pm && line.pm.enabled()) {
        line.pm.disable();
        const newLatLngs = line.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);
        const pathJson = JSON.stringify(newLatLngs);

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        fetchWithAuth(`${API_BASE}/ports.php?odp_id=${line.odpId}&port=${line.portNumber}`, {
            method: 'PUT',
            body: JSON.stringify({ path_coordinates: pathJson })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                alert('Jalur kabel pelanggan berhasil disimpan!');
                loadDevices();
            })
            .catch(err => {
                console.error(err);
                alert('Gagal menyimpan jalur kabel pelanggan: ' + err.message);
                btn.innerHTML = '<i class="fas fa-route"></i> Edit Jalur Kabel';
                btn.disabled = false;
            });
    } else if (line.pm) {
        // Disable other editing modes first
        Object.values(odpLines).forEach(l => {
            if (l.pm && l.pm.enabled()) {
                l.pm.disable();
                const b = document.getElementById(`btnEditPath-${l.odpId}`);
                if (b) {
                    b.innerHTML = '<i class="fas fa-route"></i> Edit Jalur Kabel';
                    b.style.background = '#ed8936';
                }
            }
        });

        Object.values(odcLines).forEach(l => {
            if (l.pm && l.pm.enabled()) {
                l.pm.disable();
                const b = document.getElementById(`btnEditOdcPath-${l.odcId}`);
                if (b) {
                    b.innerHTML = '<i class="fas fa-route"></i> Edit Jalur ODC';
                    b.style.background = '#9b59b6';
                }
            }
        });

        Object.values(portLines).forEach(l => {
            if (l.pm && l.pm.enabled() && l.portKey !== portKey) {
                l.pm.disable();
                const b = document.getElementById(`btnEditPortPath-${l.portKey}`);
                if (b) {
                    b.innerHTML = '<i class="fas fa-route"></i> Edit Jalur Kabel';
                    b.style.background = '#3182ce';
                }
            }
        });

        line.pm.enable({ allowSelfIntersection: true, preventMarkerRemoval: false });
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Jalur';
        btn.style.background = '#48bb78';
        map.fitBounds(line.getBounds(), { padding: [50, 50] });
    }
}

function createPopupContent(device) {
    const deviceType = getDeviceType(device);
    const isODC = deviceType === 'odc';
    const isODP = deviceType === 'odp';
    const isPole = deviceType === 'pole';
    const type = isODC ? 'ODC' : isODP ? 'ODP' : isPole ? 'POLE' : 'DEVICE';
    const currentUser = window.currentUser;
    const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'operator');

    let content = `<div style="min-width: 220px;"><h4 style="margin: 0 0 10px 0;">${device.name}</h4><p><strong>Tipe:</strong> ${type}</p><p><strong>Lokasi:</strong> ${device.location}</p><p><strong>Koordinat:</strong> ${parseFloat(device.lat).toFixed(8)}, ${parseFloat(device.lng).toFixed(8)}</p>`;

    if (isODC) {
        content += `<p><strong>Kapasitas:</strong> ${device.capacity} Port</p><p><strong>Terpakai:</strong> ${device.used_ports || 0} Port</p><p><strong>ODP Terhubung:</strong> ${device.connected_odps || 0}</p>`;
    } else if (isODP) {
        const available = device.available_ports || 0;
        const total = device.total_ports || 0;
        const percentage = total > 0 ? Math.round((available / total) * 100) : 0;
        let statusText = '', statusColor = '';
        if (available === 0) { statusText = '⚠️ PENUH'; statusColor = '#e53e3e'; }
        else if (percentage < 20) { statusText = '🔴 Kritis'; statusColor = '#f565e5'; }
        else if (percentage <= 50) { statusText = '🟡 Hampir Penuh'; statusColor = '#ecc94b'; }
        else { statusText = '🟢 Normal'; statusColor = '#48bb78'; }
        content += `<p><strong>Sumber:</strong> ${device.source_name || 'Tidak ada'}</p><p><strong>Total Port:</strong> ${total}</p><p style="color: ${statusColor}; font-weight: bold;">Status: ${statusText} (${available} tersedia)</p>`;
    } else if (isPole) {
        content += `<p><strong>Lokasi:</strong> ${device.location || '-'}</p><p><strong>Keterangan:</strong> ${device.description || '-'}</p>`;
    } else {
        const available = device.available_ports || 0;
        const total = device.total_ports || 0;
        const percentage = total > 0 ? Math.round((available / total) * 100) : 0;
        let statusText = '', statusColor = '';
        if (available === 0) { statusText = '⚠️ PENUH'; statusColor = '#e53e3e'; }
        else if (percentage < 20) { statusText = '🔴 Kritis'; statusColor = '#f56565'; }
        else if (percentage <= 50) { statusText = '🟡 Hampir Penuh'; statusColor = '#ecc94b'; }
        else { statusText = '🟢 Normal'; statusColor = '#48bb78'; }
        content += `<p><strong>Sumber:</strong> ${device.source_name || 'Tidak ada'}</p><p><strong>Total Port:</strong> ${total}</p><p style="color: ${statusColor}; font-weight: bold;">Status: ${statusText} (${available} tersedia)</p>`;
    }

    if (canEdit) {
        content += `<button onclick="editDevice('${device.id}', '${type.toLowerCase()}')" style="margin-top: 10px; padding: 5px 10px; background: #4299e1; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteDevice('${device.id}', '${type.toLowerCase()}')" style="margin-top: 10px; padding: 5px 10px; background: #f56565; color: white; border: none; border-radius: 3px; cursor: pointer;"><i class="fas fa-trash"></i> Hapus</button>`;
    }
    content += `</div>`;
    return content;
}

// =============================================
// SHOW DEVICE INFO PANEL - FIXED (async)
// =============================================

async function showDeviceInfo(device) {
    highlightLinesForDevice(device);
    const panel = document.getElementById('infoPanel');
    const title = document.getElementById('infoTitle');
    const content = document.getElementById('infoContent');

    const deviceType = getDeviceType(device);
    const isODC = deviceType === 'odc';
    const isODP = deviceType === 'odp';
    const isPole = deviceType === 'pole';
    const currentUser = window.currentUser;
    const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'operator');

    title.textContent = device.name;

    let html = `<div class="device-detail"><p><strong>Tipe:</strong> ${isODC ? 'ODC' : isODP ? 'ODP' : isPole ? 'POLE' : 'DEVICE'}</p><p><strong>ID:</strong> ${device.id}</p><p><strong>Lokasi:</strong> ${device.location}</p><p><strong>Koordinat:</strong> ${parseFloat(device.lat).toFixed(8)}, ${parseFloat(device.lng).toFixed(8)}</p>`;

    html += `
<p><strong>Dibuat:</strong> ${device.created_at ? new Date(device.created_at).toLocaleString() : ''}</p>
<p><strong>Terakhir diedit:</strong> ${device.updated_at ? new Date(device.updated_at).toLocaleString() : ''}</p>
`;
    if (isODC) {
        let distanceHtml = '';
        if (odcLines[device.id]) {
            const line = odcLines[device.id];
            let distance = 0;
            const latlngs = line.getLatLngs();
            for (let i = 0; i < latlngs.length - 1; i++) {
                distance += map.distance(latlngs[i], latlngs[i + 1]);
            }
            distanceHtml = `<div style="background: #f7fafc; padding: 10px; border-radius: 5px; margin: 10px 0; border: 1px solid #e2e8f0;"><p style="margin: 0 0 5px 0;"><strong><i class="fas fa-route"></i> Jarak Kabel Feeder:</strong> ${Math.round(distance)} Meter</p>${canEdit ? `<button onclick="toggleODCPathEdit('${device.id}')" id="btnEditOdcPath-${device.id}" style="width: 100%; padding: 8px; background: #9b59b6; color: white; border: none; border-radius: 3px; cursor: pointer; transition: 0.3s; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="fas fa-route"></i> Edit Jalur ODC</button>` : ''}</div>`;
        }

        let portsHtml = `${distanceHtml}<p><strong>Kapasitas Port:</strong> ${device.capacity}</p><p><strong>Port Terpakai:</strong> ${device.used_ports || 0}</p><p><strong>Port Tersedia:</strong> ${device.capacity - (device.used_ports || 0)}</p><hr><h4>🔌 Status Port ODC</h4><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(45px, 1fr)); gap: 6px; margin-top: 10px;">`;

        let portDetails = [];
        try {
            const portRes = await fetch(`${API_BASE}/odc.php?id=${device.id}&ports=true`, { credentials: 'include' });
            if (portRes.ok) {
                portDetails = await portRes.json();
            }
        } catch (e) {
            console.error('Failed to load port details', e);
        }

        for (let i = 1; i <= device.capacity; i++) {
            const portDetail = portDetails.find(p => p.port_number === i);
            let status = 'available', odpName = '', odpId = null;
            if (portDetail) {
                status = portDetail.status;
                odpName = portDetail.odp_name || '';
                odpId = portDetail.odp_id;
            }
            let bgColor = '#c6f6d5';
            let titleAttr = `Port ${i}: Tersedia`;
            let onclickAttr = '';
            if (status === 'used') {
                bgColor = '#fed7d7';
                titleAttr = `Port ${i}: Digunakan oleh ${odpName}`;
                if (odpId) onclickAttr = `onclick="highlightODP(${odpId})"`;
            } else if (status === 'maintenance') {
                bgColor = '#fefcbf';
                titleAttr = `Port ${i}: Maintenance`;
            }
            portsHtml += `<div style="padding: 6px 2px; text-align: center; background: ${bgColor}; border-radius: 5px; font-size: 11px; font-weight: bold; cursor: ${status === 'used' ? 'pointer' : 'default'}; border: 1px solid #ccc; transition: transform 0.2s;" title="${titleAttr}" ${onclickAttr}>${i}${status === 'used' ? '<i class="fas fa-link" style="font-size: 8px; margin-left: 2px;"></i>' : ''}</div>`;
        }
        portsHtml += `</div>`;
        if ((device.used_ports || 0) > 0) {
            portsHtml += `<p style="margin-top: 10px; font-size: 12px; color: #718096;"><i class="fas fa-info-circle"></i> Klik nomor port yang berwarna merah untuk melihat ODP terkait</p>`;
        }
        html += portsHtml;
        html += renderPhotoGallery(device, 'odc');
    } else if (isPole) {
        html += `<p><strong>Lokasi:</strong> ${device.location || '-'}</p><p><strong>Keterangan:</strong> ${device.description || '-'}</p>`;
        html += renderPhotoGallery(device, 'pole');
    } else {
        const available = device.available_ports || 0;
        const total = device.total_ports || 0;
        const used = total - available;
        const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
        let statusColor = '#48bb78', statusText = 'Normal';
        let distanceHtml = '';

        if (available === 0) { statusColor = '#e53e3e'; statusText = '⚠️ PENUH - Tidak ada port tersedia'; }
        else if (percentage > 80) { statusColor = '#f56565'; statusText = '🔴 Kritis - Segera perlu ODP tambahan'; }
        else if (percentage > 50) { statusColor = '#ecc94b'; statusText = '🟡 Hampir Penuh - Monitor penggunaan'; }
        else { statusColor = '#48bb78'; statusText = '🟢 Normal - Port masih banyak tersedia'; }

        if (device.source_id && odpLines[device.id]) {
            const line = odpLines[device.id];
            let distance = 0;
            const latlngs = line.getLatLngs();
            for (let i = 0; i < latlngs.length - 1; i++) {
                distance += map.distance(latlngs[i], latlngs[i + 1]);
            }
            distanceHtml = `<div style="background: #f7fafc; padding: 10px; border-radius: 5px; margin: 10px 0; border: 1px solid #e2e8f0;"><p style="margin: 0 0 5px 0;"><strong><i class="fas fa-route"></i> Jarak Kabel:</strong> ${Math.round(distance)} Meter</p>${canEdit ? `<button onclick="togglePathEdit('${device.id}')" id="btnEditPath-${device.id}" style="width: 100%; padding: 8px; background: #ed8936; color: white; border: none; border-radius: 3px; cursor: pointer; transition: 0.3s; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="fas fa-route"></i> Edit Jalur Kabel</button>` : ''}</div>`;
        }

        html += `<p><strong>Sumber ODC:</strong> ${device.source_name || 'Tidak terhubung'}</p>${distanceHtml}<p><strong>Total Port:</strong> ${total}</p><div style="margin: 10px 0;"><div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span><strong>Port Terpakai:</strong> ${used} dari ${total}</span><span style="color: ${statusColor}; font-weight: bold;">${percentage}%</span></div><div style="background: #e2e8f0; border-radius: 10px; height: 20px; overflow: hidden;"><div style="width: ${percentage}%; height: 100%; background: ${statusColor}; border-radius: 10px; transition: width 0.5s ease;"></div></div><p style="color: ${statusColor}; font-weight: bold; margin-top: 5px;">${statusText}</p></div><hr><h4>📋 Daftar Pelanggan Terhubung</h4>`;

        if (device.ports && device.ports.length > 0) {
            const usedPorts = device.ports.filter(p => p.status === 'used' && p.target);
            if (usedPorts.length > 0) {
                html += `<table class="customer-table"><thead><tr><th>Port</th><th>Nama Pelanggan</th><th>Status</th></tr></thead><tbody>`;
                usedPorts.forEach(port => {
                    html += `<tr><td>${port.port_number}</td><td>${port.target}</td><td>${port.status === 'used' ? 'Aktif' : port.status}</td></tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-message">Belum ada pelanggan terhubung</p>`;
            }
            const maintenancePorts = device.ports.filter(p => p.status === 'maintenance');
            if (maintenancePorts.length > 0) {
                html += `<p><strong>Port Maintenance:</strong> ${maintenancePorts.map(p => p.port_number).join(', ')}</p>`;
            }
        }

        html += `<p style="margin-top:10px;"><strong>Status Port:</strong></p><div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">`;
        if (device.ports) {
            device.ports.forEach(port => {
                let bgColor = '#c6f6d5';
                if (port.status === 'used') bgColor = '#fed7d7';
                else if (port.status === 'maintenance') bgColor = '#fefcbf';
                html += `<div style="padding: 5px; text-align: center; background: ${bgColor}; border-radius: 3px; font-size: 12px; cursor: pointer;" onclick="configurePort(${port.port_number}, ${device.id})" title="Port ${port.port_number}: ${port.status === 'used' ? port.target : port.status}">${port.port_number}</div>`;
            });
        }
        html += `</div>`;
        html += renderPhotoGallery(device, 'odp');
    }

    if (device.description) {
        html += `<p><strong>Keterangan:</strong> ${device.description}</p>`;
    }

    html += `<div style="margin-top: 15px;"><button onclick="editDevice('${device.id}', '${isODC ? 'odc' : 'odp'}')" class="btn-icon btn-edit"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteDevice('${device.id}', '${isODC ? 'odc' : 'odp'}')" class="btn-icon btn-delete"><i class="fas fa-trash"></i> Hapus</button></div></div>`;

    content.innerHTML = html;
    panel.classList.add('show');
}

function showCustomerInfo(customerData) {
    highlightLinesForDevice(customerData);
    const panel = document.getElementById('infoPanel');
    const title = document.getElementById('infoTitle');
    const content = document.getElementById('infoContent');

    const { odp, port, distance, customerLat, customerLng } = customerData;
    const currentUser = window.currentUser;
    const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'operator');
    const portKey = `${odp.id}_${port.port_number}`;

    title.textContent = port.target || 'Pelanggan';

    let html = `<div class="device-detail">
        <p style="margin: 0 0 10px 0;"><strong><i class="fas fa-user"></i> Nama Pelanggan:</strong> ${port.target || 'Tidak Tersedia'}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #48bb78; font-weight: bold;">✓ Aktif</span></p>
        <hr>
        <h4 style="margin: 10px 0 8px 0;"><i class="fas fa-sitemap"></i> Terhubung Ke</h4>
        <p style="margin: 4px 0; padding: 8px; background: #f7fafc; border-left: 3px solid #3182ce; border-radius: 3px;">
            <strong>ODP:</strong> ${odp.name}<br>
            <strong>Port:</strong> ${port.port_number}<br>
            <strong>Lokasi ODP:</strong> ${odp.location}
        </p>
        <hr>
        <h4 style="margin: 10px 0 8px 0;"><i class="fas fa-map-pin"></i> Informasi Lokasi</h4>
        <p style="margin: 4px 0;"><strong>Koordinat Pelanggan:</strong></p>
        <p style="margin: 4px 0; padding: 6px; background: #f7fafc; border-radius: 3px; font-family: monospace; font-size: 12px;">${customerLat.toFixed(8)}, ${customerLng.toFixed(8)}</p>
        <p style="margin: 8px 0 4px 0;"><strong>Jarak Kabel Drop:</strong></p>
        <p style="margin: 4px 0; padding: 8px; background: #3182ce; color: white; border-radius: 3px; font-weight: bold; text-align: center;">⟶ ${Math.round(distance)} Meter</p>
        <hr>`;

    if (port.onu_number || port.modem_type || port.connection_type) {
        html += `<h4 style="margin: 10px 0 8px 0;"><i class="fas fa-microchip"></i> Perangkat</h4>`;
        if (port.onu_number) {
            html += `<p style="margin: 4px 0;"><strong>ONU/SN:</strong> ${port.onu_number}</p>`;
        }
        if (port.modem_type) {
            html += `<p style="margin: 4px 0;"><strong>Jenis Modem:</strong> ${port.modem_type}</p>`;
        }
        if (port.connection_type) {
            html += `<p style="margin: 4px 0;"><strong>Jenis Koneksi:</strong> ${port.connection_type}</p>`;
        }
        html += `<hr>`;
    }

    if (port.description) {
        html += `<h4 style="margin: 10px 0 8px 0;"><i class="fas fa-sticky-note"></i> Keterangan</h4>
        <p style="margin: 4px 0; padding: 8px; background: #fffaf0; border-left: 3px solid #ed8936; border-radius: 3px;">${port.description}</p>
        <hr>`;
    }

    if (port.has_photo == 1 && port.id) {
        html += `<h4 style="margin: 10px 0 8px 0;"><i class="fas fa-camera"></i> Foto Pelanggan</h4>
        <div id="customerPhotoPreview-${port.id}" class="photo-preview" style="margin: 10px 0; display: flex; flex-wrap: wrap; gap: 8px; min-height: 50px;">
            <div style="width: 100%; text-align: center; color: #718096; font-size: 12px; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Memuat foto...</div>
        </div>
        <hr>`;

        // Fetch photos asynchronously
        setTimeout(() => {
            fetch(`${API_BASE}/upload.php?type=port&device_id=${port.id}`)
                .then(res => res.json())
                .then(photos => {
                    const container = document.getElementById(`customerPhotoPreview-${port.id}`);
                    if (!container) return;
                    if (photos && photos.length > 0) {
                        let photoHtml = '';
                        photos.forEach(photo => {
                            photoHtml += `<img src="${photo.url}" alt="Foto Pelanggan" onclick="openLightbox('${photo.url}')" style="cursor:pointer; max-width: 80px; max-height: 80px; border-radius: 4px; border: 1px solid #ccc; object-fit: cover;">`;
                        });
                        container.innerHTML = photoHtml;
                    } else {
                        container.innerHTML = '<div style="width: 100%; text-align: center; color:#718096; font-size: 12px; padding: 10px;">Tidak ada foto.</div>';
                    }
                })
                .catch(err => {
                    const container = document.getElementById(`customerPhotoPreview-${port.id}`);
                    if (container) container.innerHTML = '<div style="width: 100%; text-align: center; color:red; font-size: 12px; padding: 10px;">Gagal memuat foto.</div>';
                });
        }, 100);
    }

    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">`;

    if (canEdit) {
        html += `<button onclick="togglePortPathEdit('${portKey}')" id="btnEditPortPath-${portKey}" style="padding: 8px; background: #3182ce; color: white; border: none; border-radius: 3px; cursor: pointer; transition: 0.3s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fas fa-route"></i> Edit Jalur
        </button>`;
    }

    html += `<button onclick="highlightODP(${odp.id})" style="padding: 8px; background: #48bb78; color: white; border: none; border-radius: 3px; cursor: pointer; transition: 0.3s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <i class="fas fa-map"></i> Ke ODP
    </button>`;

    if (canEdit) {
        html += `<button onclick="configurePort(${port.port_number}, ${odp.id})" style="padding: 8px; background: #ed8936; color: white; border: none; border-radius: 3px; cursor: pointer; transition: 0.3s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; grid-column: span 2;">
            <i class="fas fa-user-edit"></i> Edit Pelanggan
        </button>`;
    }

    html += `</div></div>`;

    content.innerHTML = html;
    panel.classList.add('show');
}

function hideInfoPanel() {
    document.getElementById('infoPanel').classList.remove('show');
}

function zoomToDevice(lat, lng) {
    map.setView([parseFloat(lat), parseFloat(lng)], 17);
}

function highlightODP(odpId) {
    if (highlightedMarker) {
        const odp = devices.odp.find(d => d.id == odpId);
        if (odp) {
            highlightedMarker.setIcon(createODPIcon(odp.available_ports, odp.total_ports));
        }
        highlightedMarker = null;
    }

    const marker = odpMarkers[odpId];
    if (!marker) return;

    const odp = devices.odp.find(d => d.id == odpId);
    const available = odp ? odp.available_ports : 0;
    const total = odp ? odp.total_ports : 0;
    const status = odp ? getODPStatus(available, total) : 'normal';
    const borderColor = getStatusColor(status);

    const highlightIcon = L.divIcon({
        html: `<div style="position: relative; width: 48px; height: 48px;"><img src="assets/icons/odp-icon.png" style="width: 44px; height: 44px; filter: ${getColorFilter(status)} drop-shadow(0 0 10px ${borderColor}); animation: pulse 1.5s infinite;" alt="ODP"><div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 16px; height: 16px; background: ${borderColor}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px ${borderColor};"></div></div>`,
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
            }
            highlightedMarker = null;
        }
    }, 8000);
}

let filteredDevicesList = [];
let currentDeviceRenderIndex = 0;
const DEVICES_PER_PAGE = 50;

function refreshDeviceList() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

    const allDevices = [
        ...devices.odc.map(d => ({ ...d, type: 'odc' })),
        ...devices.odp.map(d => ({ ...d, type: 'odp' })),
        ...devices.pole.map(d => ({ ...d, type: 'pole' }))
    ];

    filteredDevicesList = allDevices.filter(device => {
        if (activeFilter !== 'all' && device.type !== activeFilter) return false;
        if (searchTerm && !device.name.toLowerCase().includes(searchTerm) && !device.location.toLowerCase().includes(searchTerm)) return false;
        return true;
    });

    currentDeviceRenderIndex = 0;
    const container = document.getElementById('deviceList');
    if (container) container.innerHTML = '';

    renderMoreDevices();
}

function renderMoreDevices() {
    const container = document.getElementById('deviceList');
    if (!container) return;

    const loadMoreBtn = document.getElementById('loadMoreDevicesBtn');
    if (loadMoreBtn) loadMoreBtn.remove();

    const currentUser = window.currentUser;
    const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'operator');

    const endIndex = Math.min(currentDeviceRenderIndex + DEVICES_PER_PAGE, filteredDevicesList.length);

    for (let i = currentDeviceRenderIndex; i < endIndex; i++) {
        const device = filteredDevicesList[i];

        const div = document.createElement('div');
        div.className = `device-item ${device.type}`;
        div.onclick = () => {
            showDeviceInfo(device);
            zoomToDevice(device.lat, device.lng);
            handleDeviceClickMobile();
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
            actionsHtml = `<div class="device-actions"><button class="btn-icon btn-edit" onclick="event.stopPropagation(); editDevice('${device.id}', '${device.type}')"><i class="fas fa-edit"></i></button><button class="btn-icon btn-delete" onclick="event.stopPropagation(); deleteDevice('${device.id}', '${device.type}')"><i class="fas fa-trash"></i></button></div>`;
        }

        div.innerHTML = `<div class="device-header"><span class="device-name">${device.name} ${statusIndicator}</span><span class="device-type">${device.type.toUpperCase()}</span></div><div class="device-info">${infoHtml}</div><div class="device-info">${device.location}</div>${actionsHtml}`;
        container.appendChild(div);
    }

    currentDeviceRenderIndex = endIndex;

    if (currentDeviceRenderIndex < filteredDevicesList.length) {
        const btnContainer = document.createElement('div');
        btnContainer.id = 'loadMoreDevicesBtn';
        btnContainer.style.textAlign = 'center';
        btnContainer.style.padding = '10px';

        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.width = '100%';
        btn.textContent = `Muat Lebih Banyak (${filteredDevicesList.length - currentDeviceRenderIndex} tersisa)`;
        btn.onclick = renderMoreDevices;

        btnContainer.appendChild(btn);
        container.appendChild(btnContainer);
    }
}

// =============================================
// SIDEBAR TOGGLE FUNCTIONS
// =============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
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
    setTimeout(() => { if (typeof map !== 'undefined' && map) map.invalidateSize(); }, 350);
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleMap = document.getElementById('sidebarToggleMap');
    if (!sidebar) return;
    sidebar.classList.remove('open');
    sidebar.classList.add('closed');
    if (overlay) overlay.classList.remove('active');
    if (window.innerWidth <= 768 && toggleMap) toggleMap.style.display = 'block';
    setTimeout(() => { if (typeof map !== 'undefined' && map) map.invalidateSize(); }, 350);
}

function handleDeviceClickMobile() {
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

window.addEventListener('resize', function () {
    const toggleMap = document.getElementById('sidebarToggleMap');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    if (window.innerWidth > 768) {
        sidebar.classList.remove('closed', 'open');
        if (toggleMap) toggleMap.style.display = 'none';
        if (overlay) overlay.classList.remove('active');
    } else {
        if (!sidebar.classList.contains('open') && toggleMap) toggleMap.style.display = 'block';
    }
    setTimeout(() => { if (typeof map !== 'undefined' && map) map.invalidateSize(); }, 350);
});