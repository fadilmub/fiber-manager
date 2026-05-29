<?php
require_once 'config.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($method) {
    case 'GET':
        if ($id && $action === 'ports') {
            getPONPorts($id);
        } elseif ($id) {
            getPON($id);
        } else {
            getAllPON();
        }
        break;
    case 'POST':
        checkRole(['admin', 'operator']);
        createPON();
        break;
    case 'PUT':
        checkRole(['admin', 'operator']);
        if ($action === 'port') {
            updatePONPort();
        } else {
            updatePON($id);
        }
        break;
    case 'DELETE':
        checkRole(['admin']);
        deletePON($id);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getAllPON() {
    global $pdo;
    try {
        $stmt = $pdo->query("
            SELECT p.*, o.name as olt_name, po.name as pop_name
            FROM pon p
            JOIN olt o ON p.olt_id = o.id
            JOIN pop po ON o.pop_id = po.id
            ORDER BY po.name, o.name, p.card_number
        ");
        sendResponse($stmt->fetchAll());
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getPON($id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            SELECT p.*, o.name as olt_name, o.pop_id, po.name as pop_name
            FROM pon p
            JOIN olt o ON p.olt_id = o.id
            JOIN pop po ON o.pop_id = po.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $pon = $stmt->fetch();
        
        if ($pon) {
            sendResponse($pon);
        } else {
            sendResponse(['error' => 'PON not found'], 404);
        }
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

// =============================================
// FUNGSI GET PON PORTS - INI YANG PENTING
// =============================================
function getPONPorts($pon_id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            SELECT pp.*, 
                   odc.name as odc_name
            FROM pon_ports pp
            LEFT JOIN odc ON pp.target_odc_id = odc.id
            WHERE pp.pon_id = ?
            ORDER BY pp.port_number
        ");
        $stmt->execute([$pon_id]);
        $ports = $stmt->fetchAll();
        
        // Jika tidak ada port, buat berdasarkan port_count dari PON
        if (empty($ports)) {
            $stmt2 = $pdo->prepare("SELECT port_count FROM pon WHERE id = ?");
            $stmt2->execute([$pon_id]);
            $pon = $stmt2->fetch();
            $portCount = $pon ? $pon['port_count'] : 8;
            
            $ports = [];
            for ($i = 1; $i <= $portCount; $i++) {
                $ports[] = [
                    'port_number' => $i,
                    'status' => 'available',
                    'target_odc_id' => null,
                    'odc_name' => null,
                    'description' => null
                ];
            }
        }
        
        sendResponse($ports);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function createPON() {
    global $pdo;
    $data = getRequestData();
    
    if (!isset($data['olt_id']) || !isset($data['card_number'])) {
        sendResponse(['error' => 'Missing required fields: olt_id, card_number'], 400);
    }
    
    try {
        $pdo->beginTransaction();
        
        $portCount = $data['port_count'] ?? 8;
        
        $stmt = $pdo->prepare("
            INSERT INTO pon (olt_id, card_number, name, port_count, status, description)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['olt_id'],
            $data['card_number'],
            $data['name'] ?? "PON Card {$data['card_number']}",
            $portCount,
            $data['status'] ?? 'active',
            $data['description'] ?? ''
        ]);
        
        $pon_id = $pdo->lastInsertId();
        
        // Auto create ports
        $stmt = $pdo->prepare("
            INSERT INTO pon_ports (pon_id, port_number, status)
            VALUES (?, ?, 'available')
        ");
        for ($i = 1; $i <= $portCount; $i++) {
            $stmt->execute([$pon_id, $i]);
        }
        
        $pdo->commit();
        sendResponse(['id' => $pon_id, 'message' => 'PON created successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updatePON($id) {
    global $pdo;
    if (!$id) sendResponse(['error' => 'ID is required'], 400);
    
    $data = getRequestData();
    
    try {
        $fields = [];
        $values = [];
        $allowed = ['name', 'status', 'description'];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $values[] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            sendResponse(['error' => 'No fields to update'], 400);
        }
        
        $values[] = $id;
        $sql = "UPDATE pon SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        sendResponse(['message' => 'PON updated successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updatePONPort() {
    global $pdo;
    $data = getRequestData();
    
    if (!isset($data['pon_id']) || !isset($data['port_number'])) {
        sendResponse(['error' => 'Missing required fields: pon_id, port_number'], 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE pon_ports 
            SET status = ?, target_odc_id = ?, description = ?, updated_at = NOW()
            WHERE pon_id = ? AND port_number = ?
        ");
        $stmt->execute([
            $data['status'] ?? 'available',
            $data['target_odc_id'] ?? null,
            $data['description'] ?? null,
            $data['pon_id'],
            $data['port_number']
        ]);
        
        sendResponse(['message' => 'Port updated successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function deletePON($id) {
    global $pdo;
    if (!$id) sendResponse(['error' => 'ID is required'], 400);
    
    try {
        $stmt = $pdo->prepare("DELETE FROM pon WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(['message' => 'PON deleted successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>