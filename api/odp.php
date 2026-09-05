<?php
require_once 'config.php';

// Proteksi: harus login
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch($method) {
    case 'GET':
        if ($id) {
            getODP($id);
        } else {
            getAllODP();
        }
        break;
    case 'POST':
        checkRole(['admin', 'operator']);
        createODP();
        break;
    case 'PUT':
        checkRole(['admin', 'operator']);
        updateODP($id);
        break;
    case 'DELETE':
        checkRole(['admin']);
        deleteODP($id);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getAllODP() {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            SELECT odp.*,
                   COALESCE(odc.name, odp2.name) as source_name
            FROM odp
            LEFT JOIN odc ON odp.source_id = odc.id AND odp.source_type = 'odc'
            LEFT JOIN odp odp2 ON odp.source_id = odp2.id AND odp.source_type = 'odp'
            ORDER BY odp.created_at DESC
        ");
        $stmt->execute();
        $odps = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($odps)) {
            $odpIds = array_column($odps, 'id');
            $inClause = implode(',', array_fill(0, count($odpIds), '?'));
            
            // Fetch all ports at once
            $stmt2 = $pdo->prepare("SELECT * FROM odp_ports WHERE odp_id IN ($inClause) ORDER BY odp_id, port_number");
            $stmt2->execute($odpIds);
            $allPorts = $stmt2->fetchAll(PDO::FETCH_ASSOC);
            
            $portsByOdp = [];
            foreach ($allPorts as $port) {
                $portsByOdp[$port['odp_id']][] = $port;
            }
            
            // Fetch all photos at once
            $stmt3 = $pdo->prepare("
                SELECT odp_id, id, filename, original_name, is_primary, file_size, created_at,
                       CONCAT('uploads/odp/', filename) as url
                FROM odp_photos 
                WHERE odp_id IN ($inClause) 
                ORDER BY odp_id, is_primary DESC, created_at ASC
            ");
            $stmt3->execute($odpIds);
            $allPhotos = $stmt3->fetchAll(PDO::FETCH_ASSOC);
            
            $photosByOdp = [];
            foreach ($allPhotos as $photo) {
                $photosByOdp[$photo['odp_id']][] = $photo;
            }
            
            // Merge data
            foreach ($odps as &$odp) {
                $odp['ports'] = $portsByOdp[$odp['id']] ?? [];
                
                $available = 0;
                foreach ($odp['ports'] as $port) {
                    if ($port['status'] === 'available') $available++;
                }
                $odp['available_ports'] = $available;
                
                $odp['photos'] = $photosByOdp[$odp['id']] ?? [];
            }
        }
        
        sendResponse($odps);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getODP($id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            SELECT odp.*,
                   COALESCE(odc.name, odp2.name) as source_name
            FROM odp
            LEFT JOIN odc ON odp.source_id = odc.id AND odp.source_type = 'odc'
            LEFT JOIN odp odp2 ON odp.source_id = odp2.id AND odp.source_type = 'odp'
            WHERE odp.id = ?
        ");
        $stmt->execute([$id]);
        $odp = $stmt->fetch();
        
        if ($odp) {
            // Get ports
            $stmt2 = $pdo->prepare("SELECT * FROM odp_ports WHERE odp_id = ? ORDER BY port_number");
            $stmt2->execute([$id]);
            $odp['ports'] = $stmt2->fetchAll();
            
            // Calculate available ports
            $available = 0;
            foreach ($odp['ports'] as $port) {
                if ($port['status'] === 'available') $available++;
            }
            $odp['available_ports'] = $available;
            
            // Get photos
            $stmt3 = $pdo->prepare("
                SELECT id, filename, original_name, is_primary, file_size, created_at,
                       CONCAT('uploads/odp/', filename) as url
                FROM odp_photos 
                WHERE odp_id = ? 
                ORDER BY is_primary DESC, created_at ASC
            ");
            $stmt3->execute([$id]);
            $odp['photos'] = $stmt3->fetchAll();
            
            sendResponse($odp);
        } else {
            sendResponse(['error' => 'ODP not found'], 404);
        }
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function createODP() {
    global $pdo;
    $data = getRequestData();

    $sourceId = array_key_exists('source_id', $data) && $data['source_id'] !== '' && $data['source_id'] !== null ? (int)$data['source_id'] : null;
    $sourceType = array_key_exists('source_type', $data) && $data['source_type'] !== '' && $data['source_type'] !== null ? $data['source_type'] : null;
    $portNumberInOdc = array_key_exists('port_number_in_odc', $data) && $data['port_number_in_odc'] !== '' && $data['port_number_in_odc'] !== null ? (int)$data['port_number_in_odc'] : null;

    if (!isset($data['name']) || !isset($data['lat']) || !isset($data['lng'])) {
        sendResponse(['error' => 'Missing required fields'], 400);
    }

    try {
        $pdo->beginTransaction();

        // Validasi port belum terpakai jika source_type = 'odc'
        if ($sourceType === 'odc' && $sourceId && $portNumberInOdc) {
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as total FROM odc_odp_connections 
                WHERE odc_id = ? AND port_number = ?
            ");
            $stmt->execute([$sourceId, $portNumberInOdc]);
            $result = $stmt->fetch();
            if ($result['total'] > 0) {
                sendResponse(['error' => 'Port ODC ' . $portNumberInOdc . ' sudah digunakan oleh ODP lain'], 400);
            }
        }

        // Insert ODP
        $stmt = $pdo->prepare("
            INSERT INTO odp (name, source_id, source_type, port_number_in_odc, lat, lng, location, total_ports, description, path_coordinates)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $sourceId,
            $sourceType,
            $portNumberInOdc,
            $data['lat'],
            $data['lng'],
            $data['location'] ?? '',
            $data['total_ports'] ?? 8,
            $data['description'] ?? '',
            $data['path_coordinates'] ?? null
        ]);
        
        $odp_id = $pdo->lastInsertId();
        $total_ports = $data['total_ports'] ?? 8;
        
        // Create ports
        $stmt = $pdo->prepare("
            INSERT INTO odp_ports (odp_id, port_number, status)
            VALUES (?, ?, 'available')
        ");
        for ($i = 1; $i <= $total_ports; $i++) {
            $stmt->execute([$odp_id, $i]);
        }
        
        // If connected to ODC, create connection
        if ($sourceId && $sourceType === 'odc' && $portNumberInOdc) {
            $stmt = $pdo->prepare("
                INSERT INTO odc_odp_connections (odc_id, odp_id, port_number)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE port_number = VALUES(port_number)
            ");
            $stmt->execute([$sourceId, $odp_id, $portNumberInOdc]);
            updateODCUsedPorts($sourceId);
        }
        
        $pdo->commit();
        logActivity('create', 'odp', $odp_id, 'Menambahkan ODP', null, $data);
        sendResponse(['id' => $odp_id, 'message' => 'ODP created successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updateODP($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'ID is required'], 400);
    }
    
    $data = getRequestData();
    
    try {
        $pdo->beginTransaction();
        
        // Get old source info
        $stmt = $pdo->prepare("SELECT * FROM odp WHERE id = ?");
        $stmt->execute([$id]);
        $oldData = $stmt->fetch();
        
        if (!$oldData) {
            sendResponse(['error' => 'ODP not found'], 404);
        }
        
        $newSourceId = array_key_exists('source_id', $data) ? ((string)$data['source_id'] === '' || $data['source_id'] === null ? null : (int)$data['source_id']) : $oldData['source_id'];
        $newSourceType = array_key_exists('source_type', $data) ? ((string)$data['source_type'] === '' || $data['source_type'] === null ? null : $data['source_type']) : $oldData['source_type'];
        $newPortNumberInOdc = array_key_exists('port_number_in_odc', $data) ? ((string)$data['port_number_in_odc'] === '' || $data['port_number_in_odc'] === null ? null : (int)$data['port_number_in_odc']) : $oldData['port_number_in_odc'];

        // Validasi port baru jika berubah
        if ($newSourceType === 'odc' && $newSourceId && $newPortNumberInOdc && 
            ($oldData['source_id'] != $newSourceId || $oldData['port_number_in_odc'] != $newPortNumberInOdc)) {

            $stmt = $pdo->prepare("
                SELECT COUNT(*) as total FROM odc_odp_connections 
                WHERE odc_id = ? AND port_number = ? AND odp_id != ?
            ");
            $stmt->execute([$newSourceId, $newPortNumberInOdc, $id]);
            $result = $stmt->fetch();
            if ($result['total'] > 0) {
                sendResponse(['error' => 'Port ODC ' . $newPortNumberInOdc . ' sudah digunakan oleh ODP lain'], 400);
            }
        }

        // Update ODP fields
        $fields = [];
        $values = [];

        if (isset($data['name'])) { $fields[] = "name = ?"; $values[] = $data['name']; }
        if (array_key_exists('source_id', $data)) { $fields[] = "source_id = ?"; $values[] = $newSourceId; }
        if (array_key_exists('source_type', $data)) { $fields[] = "source_type = ?"; $values[] = $newSourceType; }
        if (array_key_exists('port_number_in_odc', $data)) { $fields[] = "port_number_in_odc = ?"; $values[] = $newPortNumberInOdc; }
        if (isset($data['lat'])) { $fields[] = "lat = ?"; $values[] = $data['lat']; }
        if (isset($data['lng'])) { $fields[] = "lng = ?"; $values[] = $data['lng']; }
        if (isset($data['location'])) { $fields[] = "location = ?"; $values[] = $data['location']; }
        if (isset($data['total_ports'])) { $fields[] = "total_ports = ?"; $values[] = $data['total_ports']; }
        if (isset($data['description'])) { $fields[] = "description = ?"; $values[] = $data['description']; }
        if (isset($data['path_coordinates'])) { $fields[] = "path_coordinates = ?"; $values[] = $data['path_coordinates']; }
        
        if (!empty($fields)) {
            $values[] = $id;
            $sql = "UPDATE odp SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
        }
        
        // Handle perubahan jumlah port
        if (isset($data['total_ports'])) {
            $newTotalPorts = (int)$data['total_ports'];
            $oldTotalPorts = (int)$oldData['total_ports'];
            
            if ($newTotalPorts > $oldTotalPorts) {
                $stmt = $pdo->prepare("
                    INSERT INTO odp_ports (odp_id, port_number, status) 
                    VALUES (?, ?, 'available')
                ");
                for ($i = $oldTotalPorts + 1; $i <= $newTotalPorts; $i++) {
                    $stmt->execute([$id, $i]);
                }
            } elseif ($newTotalPorts < $oldTotalPorts) {
                $stmt = $pdo->prepare("
                    DELETE FROM odp_ports 
                    WHERE odp_id = ? AND port_number > ? AND status = 'available'
                ");
                $stmt->execute([$id, $newTotalPorts]);
            }
        }
        
        // Handle ODC connection changes
        if ($oldData['source_id'] && $oldData['source_type'] === 'odc' && (!$newSourceId || $newSourceType !== 'odc' || !$newPortNumberInOdc || $oldData['source_id'] != $newSourceId || $oldData['port_number_in_odc'] != $newPortNumberInOdc)) {
            $stmt = $pdo->prepare("DELETE FROM odc_odp_connections WHERE odc_id = ? AND odp_id = ?");
            $stmt->execute([$oldData['source_id'], $id]);
            updateODCUsedPorts($oldData['source_id']);
        }

        if ($newSourceId && $newSourceType === 'odc' && $newPortNumberInOdc) {
            $stmt = $pdo->prepare("
                INSERT INTO odc_odp_connections (odc_id, odp_id, port_number)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE port_number = VALUES(port_number)
            ");
            $stmt->execute([$newSourceId, $id, $newPortNumberInOdc]);
            updateODCUsedPorts($newSourceId);
        }
        
        // Update available_ports
        updateODPAvailablePorts($id);
        
        $pdo->commit();
        logActivity('update', 'odp', $id, 'Mengubah ODP', $oldData, $data);
        
        // Return updated ODP
        $stmt = $pdo->prepare("
            SELECT odp.*,
                   COALESCE(odc.name, odp2.name) as source_name
            FROM odp
            LEFT JOIN odc ON odp.source_id = odc.id AND odp.source_type = 'odc'
            LEFT JOIN odp odp2 ON odp.source_id = odp2.id AND odp.source_type = 'odp'
            WHERE odp.id = ?
        ");
        $stmt->execute([$id]);
        $updatedODP = $stmt->fetch();
        
        $stmt2 = $pdo->prepare("SELECT * FROM odp_ports WHERE odp_id = ? ORDER BY port_number");
        $stmt2->execute([$id]);
        $updatedODP['ports'] = $stmt2->fetchAll();
        
        $available = 0;
        foreach ($updatedODP['ports'] as $port) {
            if ($port['status'] === 'available') $available++;
        }
        $updatedODP['available_ports'] = $available;
        
        sendResponse([
            'message' => 'ODP updated successfully',
            'data' => $updatedODP
        ]);
        
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function deleteODP($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'ID is required'], 400);
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get ODC connection
        $stmt = $pdo->prepare("SELECT source_id FROM odp WHERE id = ? AND source_type = 'odc'");
        $stmt->execute([$id]);
        $odp = $stmt->fetch();
        
        if ($odp && $odp['source_id']) {
            $stmt = $pdo->prepare("DELETE FROM odc_odp_connections WHERE odp_id = ?");
            $stmt->execute([$id]);
            updateODCUsedPorts($odp['source_id']);
        }
        
        // Delete ODP
        $stmt = $pdo->prepare("DELETE FROM odp WHERE id = ?");
        $stmt->execute([$id]);
        
        $pdo->commit();
        logActivity('delete', 'odp', $id, 'Menghapus ODP', $odp, null);
        sendResponse(['message' => 'ODP deleted successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updateODPAvailablePorts($odp_id) {
    global $pdo;
    $stmt = $pdo->prepare("
        UPDATE odp 
        SET available_ports = (
            SELECT COUNT(*) FROM odp_ports 
            WHERE odp_id = ? AND status = 'available'
        )
        WHERE id = ?
    ");
    $stmt->execute([$odp_id, $odp_id]);
}

function updateODCUsedPorts($odc_id) {
    global $pdo;
    $stmt = $pdo->prepare("
        UPDATE odc 
        SET used_ports = (SELECT COUNT(*) FROM odc_odp_connections WHERE odc_id = ?)
        WHERE id = ?
    ");
    $stmt->execute([$odc_id, $odc_id]);
}
?>