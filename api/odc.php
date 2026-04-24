<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch($method) {
    case 'GET':
        if ($id) {
            getODC($id);
        } else {
            getAllODC();
        }
        break;
    case 'POST':
        createODC();
        break;
    case 'PUT':
        updateODC($id);
        break;
    case 'DELETE':
        deleteODC($id);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getAllODC() {
    global $pdo;
    try {
        $stmt = $pdo->query("
            SELECT o.*, 
                   (SELECT COUNT(*) FROM odc_odp_connections WHERE odc_id = o.id) as connected_odps
            FROM odc o 
            ORDER BY o.created_at DESC
        ");
        $odcs = $stmt->fetchAll();
        sendResponse($odcs);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getODC($id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            SELECT o.*, 
                   (SELECT COUNT(*) FROM odc_odp_connections WHERE odc_id = o.id) as connected_odps
            FROM odc o 
            WHERE o.id = ?
        ");
        $stmt->execute([$id]);
        $odc = $stmt->fetch();
        
        if ($odc) {
            // Get connected ODPs
            $stmt2 = $pdo->prepare("
                SELECT odp.id, odp.name 
                FROM odc_odp_connections coc
                JOIN odp ON coc.odp_id = odp.id
                WHERE coc.odc_id = ?
            ");
            $stmt2->execute([$id]);
            $odc['connected_odps_list'] = $stmt2->fetchAll();
            
            sendResponse($odc);
        } else {
            sendResponse(['error' => 'ODC not found'], 404);
        }
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function createODC() {
    global $pdo;
    $data = getRequestData();
    
    if (!isset($data['name']) || !isset($data['lat']) || !isset($data['lng'])) {
        sendResponse(['error' => 'Missing required fields'], 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO odc (name, lat, lng, location, capacity, description)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $data['lat'],
            $data['lng'],
            $data['location'] ?? '',
            $data['capacity'] ?? 24,
            $data['description'] ?? ''
        ]);
        
        $id = $pdo->lastInsertId();
        sendResponse(['id' => $id, 'message' => 'ODC created successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updateODC($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'ID is required'], 400);
    }
    
    $data = getRequestData();
    
    try {
        $fields = [];
        $values = [];
        
        if (isset($data['name'])) { $fields[] = "name = ?"; $values[] = $data['name']; }
        if (isset($data['lat'])) { $fields[] = "lat = ?"; $values[] = $data['lat']; }
        if (isset($data['lng'])) { $fields[] = "lng = ?"; $values[] = $data['lng']; }
        if (isset($data['location'])) { $fields[] = "location = ?"; $values[] = $data['location']; }
        if (isset($data['capacity'])) { $fields[] = "capacity = ?"; $values[] = $data['capacity']; }
        if (isset($data['description'])) { $fields[] = "description = ?"; $values[] = $data['description']; }
        
        if (empty($fields)) {
            sendResponse(['error' => 'No fields to update'], 400);
        }
        
        $values[] = $id;
        $sql = "UPDATE odc SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        // Update used_ports based on connections
        updateODCUsedPorts($id);
        
        sendResponse(['message' => 'ODC updated successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function deleteODC($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'ID is required'], 400);
    }
    
    try {
        $pdo->beginTransaction();
        
        // Set source_id to NULL for connected ODPs
        $stmt = $pdo->prepare("UPDATE odp SET source_id = NULL, source_type = NULL WHERE source_id = ? AND source_type = 'odc'");
        $stmt->execute([$id]);
        
        // Delete connections
        $stmt = $pdo->prepare("DELETE FROM odc_odp_connections WHERE odc_id = ?");
        $stmt->execute([$id]);
        
        // Delete ODC
        $stmt = $pdo->prepare("DELETE FROM odc WHERE id = ?");
        $stmt->execute([$id]);
        
        $pdo->commit();
        sendResponse(['message' => 'ODC deleted successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
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