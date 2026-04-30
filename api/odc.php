<?php
require_once 'config.php';
requireAuth();

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
                   (SELECT COUNT(*) FROM odc_odp_connections WHERE odc_id = o.id) AS connected_odps,
                   (SELECT COUNT(*) FROM odp_ports WHERE odp_id IN 
                      (SELECT odp_id FROM odc_odp_connections WHERE odc_id = o.id) 
                      AND status = 'used') AS total_customers
            FROM odc o 
            ORDER BY o.created_at DESC
        ");
        $odcs = $stmt->fetchAll();
        
        // Untuk setiap ODC, ambil port-nya
        foreach ($odcs as &$odc) {
            $stmt2 = $pdo->prepare("SELECT op.*, odp.name AS target_name 
                                    FROM odc_ports op 
                                    LEFT JOIN odp ON op.target_odp_id = odp.id 
                                    WHERE op.odc_id = ? 
                                    ORDER BY op.port_number");
            $stmt2->execute([$odc['id']]);
            $odc['ports'] = $stmt2->fetchAll();
        }
        
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
                   (SELECT COUNT(*) FROM odc_odp_connections WHERE odc_id = o.id) as connected_odps,
                   (SELECT COUNT(*) FROM odp_ports WHERE odp_id IN 
                      (SELECT odp_id FROM odc_odp_connections WHERE odc_id = o.id) 
                      AND status = 'used') AS total_customers
            FROM odc o 
            WHERE o.id = ?
        ");
        $stmt->execute([$id]);
        $odc = $stmt->fetch();
        
        if ($odc) {
            // Ambil daftar ODP terhubung
            $stmt2 = $pdo->prepare("
                SELECT odp.id, odp.name 
                FROM odc_odp_connections coc
                JOIN odp ON coc.odp_id = odp.id
                WHERE coc.odc_id = ?
            ");
            $stmt2->execute([$id]);
            $odc['connected_odps_list'] = $stmt2->fetchAll();

            // Ambil port ODC (jika diperlukan)
            $stmt3 = $pdo->prepare("SELECT op.*, odp.name AS target_name FROM odc_ports op LEFT JOIN odp ON op.target_odp_id = odp.id WHERE op.odc_id = ? ORDER BY op.port_number");
            $stmt3->execute([$id]);
            $odc['ports'] = $stmt3->fetchAll();
            
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
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("
            INSERT INTO odc (name, lat, lng, location, capacity, pop_name, pon_port, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $data['lat'],
            $data['lng'],
            $data['location'] ?? '',
            $data['capacity'] ?? 24,
            $data['pop_name'] ?? null,
            $data['pon_port'] ?? null,
            $data['description'] ?? ''
        ]);
        
        $odc_id = $pdo->lastInsertId();
        $capacity = $data['capacity'] ?? 24;
        
        // Buat port ODC
        $stmt = $pdo->prepare("INSERT INTO odc_ports (odc_id, port_number, status) VALUES (?, ?, 'available')");
        for ($i = 1; $i <= $capacity; $i++) {
            $stmt->execute([$odc_id, $i]);
        }
        
        $pdo->commit();
        sendResponse(['id' => $odc_id, 'message' => 'ODC created successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updateODC($id) {
    global $pdo;
    if (!$id) sendResponse(['error' => 'ID is required'], 400);
    $data = getRequestData();
    
    try {
        $pdo->beginTransaction();
        
        $oldData = $pdo->query("SELECT * FROM odc WHERE id = $id")->fetch();
        if (!$oldData) sendResponse(['error' => 'ODC not found'], 404);
        
        $fields = [];
        $values = [];
        $possible = ['name','lat','lng','location','capacity','pop_name','pon_port','description'];
        foreach ($possible as $f) {
            if (isset($data[$f])) { $fields[] = "$f = ?"; $values[] = $data[$f]; }
        }
        if (!empty($fields)) {
            $values[] = $id;
            $sql = "UPDATE odc SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
        }
        
        // Sinkronisasi port ODC jika capacity berubah
        if (isset($data['capacity'])) {
            $newCap = (int)$data['capacity'];
            $oldCap = (int)$oldData['capacity'];
            
            // Hapus port available yang melebihi kapasitas baru
            $stmt = $pdo->prepare("DELETE FROM odc_ports WHERE odc_id = ? AND port_number > ? AND status = 'available'");
            $stmt->execute([$id, $newCap]);
            
            // Tambah port baru jika perlu
            $stmt = $pdo->prepare("INSERT IGNORE INTO odc_ports (odc_id, port_number, status) VALUES (?, ?, 'available')");
            for ($i = 1; $i <= $newCap; $i++) {
                $stmt->execute([$id, $i]);
            }
        }
        
        $pdo->commit();
        sendResponse(['message' => 'ODC updated successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
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
    $stmt = $pdo->prepare("UPDATE odc SET used_ports = (SELECT COUNT(*) FROM odc_odp_connections WHERE odc_id = ?) WHERE id = ?");
    $stmt->execute([$odc_id, $odc_id]);
}
?>