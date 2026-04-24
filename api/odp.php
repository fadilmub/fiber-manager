<?php
require_once 'config.php';

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
        createODP();
        break;
    case 'PUT':
        updateODP($id);
        break;
    case 'DELETE':
        deleteODP($id);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getAllODP() {
    global $pdo;
    try {
        $stmt = $pdo->query("
            SELECT odp.*,
                   COALESCE(odc.name, odp2.name) as source_name
            FROM odp
            LEFT JOIN odc ON odp.source_id = odc.id AND odp.source_type = 'odc'
            LEFT JOIN odp odp2 ON odp.source_id = odp2.id AND odp.source_type = 'odp'
            ORDER BY odp.created_at DESC
        ");
        $odps = $stmt->fetchAll();
        
        // Get ports for each ODP
        foreach ($odps as &$odp) {
            $stmt2 = $pdo->prepare("SELECT * FROM odp_ports WHERE odp_id = ? ORDER BY port_number");
            $stmt2->execute([$odp['id']]);
            $odp['ports'] = $stmt2->fetchAll();
            
            // Calculate available ports
            $available = 0;
            foreach ($odp['ports'] as $port) {
                if ($port['status'] === 'available') $available++;
            }
            $odp['available_ports'] = $available;
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
    
    if (!isset($data['name']) || !isset($data['lat']) || !isset($data['lng'])) {
        sendResponse(['error' => 'Missing required fields'], 400);
    }
    
    try {
        $pdo->beginTransaction();
        
        // Insert ODP
        $stmt = $pdo->prepare("
            INSERT INTO odp (name, source_id, source_type, lat, lng, location, total_ports, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $data['source_id'] ?? null,
            $data['source_type'] ?? null,
            $data['lat'],
            $data['lng'],
            $data['location'] ?? '',
            $data['total_ports'] ?? 8,
            $data['description'] ?? ''
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
        if (isset($data['source_id']) && $data['source_type'] === 'odc') {
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO odc_odp_connections (odc_id, odp_id)
                VALUES (?, ?)
            ");
            $stmt->execute([$data['source_id'], $odp_id]);
            updateODCUsedPorts($data['source_id']);
        }
        
        $pdo->commit();
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
        
        // Update ODP fields
        $fields = [];
        $values = [];
        
        if (isset($data['name'])) { $fields[] = "name = ?"; $values[] = $data['name']; }
        if (isset($data['source_id'])) { $fields[] = "source_id = ?"; $values[] = $data['source_id']; }
        if (isset($data['source_type'])) { $fields[] = "source_type = ?"; $values[] = $data['source_type']; }
        if (isset($data['lat'])) { $fields[] = "lat = ?"; $values[] = $data['lat']; }
        if (isset($data['lng'])) { $fields[] = "lng = ?"; $values[] = $data['lng']; }
        if (isset($data['location'])) { $fields[] = "location = ?"; $values[] = $data['location']; }
        if (isset($data['total_ports'])) { $fields[] = "total_ports = ?"; $values[] = $data['total_ports']; }
        if (isset($data['description'])) { $fields[] = "description = ?"; $values[] = $data['description']; }
        
        if (!empty($fields)) {
            $values[] = $id;
            $sql = "UPDATE odp SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
        }
        
        // =============================================
        // HANDLE PERUBAHAN JUMLAH PORT
        // =============================================
        if (isset($data['total_ports'])) {
            $newTotalPorts = (int)$data['total_ports'];
            $oldTotalPorts = (int)$oldData['total_ports'];
            
            if ($newTotalPorts > $oldTotalPorts) {
                // Tambah port baru (status available)
                $stmt = $pdo->prepare("
                    INSERT INTO odp_ports (odp_id, port_number, status) 
                    VALUES (?, ?, 'available')
                ");
                for ($i = $oldTotalPorts + 1; $i <= $newTotalPorts; $i++) {
                    $stmt->execute([$id, $i]);
                }
            } 
            elseif ($newTotalPorts < $oldTotalPorts) {
                // Hapus port berlebih - HANYA yang statusnya 'available'
                // Port yang 'used' atau 'maintenance' tidak dihapus
                $stmt = $pdo->prepare("
                    DELETE FROM odp_ports 
                    WHERE odp_id = ? 
                    AND port_number > ? 
                    AND status = 'available'
                ");
                $stmt->execute([$id, $newTotalPorts]);
                
                // Update port_number untuk port yang tersisa jika perlu
                // (Tidak diperlukan karena port_number adalah nilai tetap)
            }
        }
        
        // Handle ODC connection changes
        if ($oldData['source_id'] && $oldData['source_type'] === 'odc') {
            $stmt = $pdo->prepare("DELETE FROM odc_odp_connections WHERE odc_id = ? AND odp_id = ?");
            $stmt->execute([$oldData['source_id'], $id]);
            updateODCUsedPorts($oldData['source_id']);
        }
        
        if (isset($data['source_id']) && $data['source_type'] === 'odc') {
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO odc_odp_connections (odc_id, odp_id)
                VALUES (?, ?)
            ");
            $stmt->execute([$data['source_id'], $id]);
            updateODCUsedPorts($data['source_id']);
        }
        
        // Update available_ports based on port statuses
        updateODPAvailablePorts($id);
        
        $pdo->commit();
        
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
        
        // Get ports
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
        
        // Delete connections
        if ($odp && $odp['source_id']) {
            $stmt = $pdo->prepare("DELETE FROM odc_odp_connections WHERE odp_id = ?");
            $stmt->execute([$id]);
            updateODCUsedPorts($odp['source_id']);
        }
        
        // Set source_id to NULL for ODPs connected to this ODP
        $stmt = $pdo->prepare("UPDATE odp SET source_id = NULL, source_type = NULL WHERE source_id = ? AND source_type = 'odp'");
        $stmt->execute([$id]);
        
        // Delete ODP (cascade deletes ports)
        $stmt = $pdo->prepare("DELETE FROM odp WHERE id = ?");
        $stmt->execute([$id]);
        
        $pdo->commit();
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