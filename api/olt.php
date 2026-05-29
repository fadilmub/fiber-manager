<?php
require_once 'config.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($method) {
    case 'GET':
        if ($id && $action === 'pons') {
            getOLTPONs($id);
        } elseif ($id) {
            getOLT($id);
        } else {
            getAllOLT();
        }
        break;
    case 'POST':
        checkRole(['admin', 'operator']);
        createOLT();
        break;
    case 'PUT':
        checkRole(['admin', 'operator']);
        updateOLT($id);
        break;
    case 'DELETE':
        checkRole(['admin']);
        deleteOLT($id);
        break;
        
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getAllOLT() {
    global $pdo;
    try {
        $stmt = $pdo->query("
            SELECT o.*, p.name as pop_name
            FROM olt o
            JOIN pop p ON o.pop_id = p.id
            ORDER BY o.created_at DESC
        ");
        $olts = $stmt->fetchAll();
        
        sendResponse($olts);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
function getOLTPONs($olt_id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            SELECT p.*, 
                   (SELECT COUNT(*) FROM pon_ports WHERE pon_id = p.id) as total_ports,
                   (SELECT COUNT(*) FROM pon_ports WHERE pon_id = p.id AND status = 'used') as used_ports,
                   (SELECT COUNT(*) FROM pon_ports WHERE pon_id = p.id AND status = 'available') as available_ports
            FROM pon p
            WHERE p.olt_id = ?
            ORDER BY p.card_number
        ");
        $stmt->execute([$olt_id]);
        $pons = $stmt->fetchAll();
        
        foreach ($pons as &$pon) {
            $stmt2 = $pdo->prepare("
                SELECT * FROM pon_ports WHERE pon_id = ? ORDER BY port_number
            ");
            $stmt2->execute([$pon['id']]);
            $pon['ports'] = $stmt2->fetchAll();
        }
        
        sendResponse($pons);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getOLT($id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            SELECT o.*, p.name as pop_name, p.location as pop_location
            FROM olt o
            JOIN pop p ON o.pop_id = p.id
            WHERE o.id = ?
        ");
        $stmt->execute([$id]);
        $olt = $stmt->fetch();
        
        if ($olt) {
            // Get ports
            $stmt2 = $pdo->prepare("
                SELECT * FROM olt_ports WHERE olt_id = ? ORDER BY port_number
            ");
            $stmt2->execute([$id]);
            $ports = $stmt2->fetchAll();
            
            // Jika belum ada port, buat berdasarkan total_ports
            if (empty($ports)) {
                $totalPorts = $olt['total_ports'] ?? 16;
                $ports = [];
                for ($i = 1; $i <= $totalPorts; $i++) {
                    $ports[] = [
                        'port_number' => $i,
                        'status' => 'available',
                        'target_odc_id' => null,
                        'description' => null
                    ];
                }
            }
            
            $olt['ports'] = $ports;
            sendResponse($olt);
        } else {
            sendResponse(['error' => 'OLT not found'], 404);
        }
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function createOLT() {
    global $pdo;
    $data = getRequestData();
    
    if (!isset($data['name']) || !isset($data['pop_id'])) {
        sendResponse(['error' => 'Missing required fields: name, pop_id'], 400);
    }
    
    try {
        $pdo->beginTransaction();
        
        $totalPorts = isset($data['total_ports']) ? (int)$data['total_ports'] : 16;
        $totalPONs = isset($data['total_pon_ports']) ? (int)$data['total_pon_ports'] : 4;
        
        $stmt = $pdo->prepare("
            INSERT INTO olt (pop_id, name, model, ip_address, management_port, total_ports, total_pon_ports, location, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['pop_id'],
            $data['name'],
            $data['model'] ?? null,
            $data['ip_address'] ?? null,
            $data['management_port'] ?? 22,
            $totalPorts,
            $totalPONs,
            $data['location'] ?? '',
            $data['description'] ?? ''
        ]);
        
        $olt_id = $pdo->lastInsertId();
        
        // Auto create PON cards
        $portsPerPON = ceil($totalPorts / $totalPONs);
        $stmt = $pdo->prepare("
            INSERT INTO pon (olt_id, card_number, name, port_count, status)
            VALUES (?, ?, ?, ?, 'active')
        ");
        
        for ($i = 1; $i <= $totalPONs; $i++) {
            $stmt->execute([$olt_id, $i, "PON Card $i", $portsPerPON]);
            $pon_id = $pdo->lastInsertId();
            
            // Create ports for this PON
            $stmt2 = $pdo->prepare("
                INSERT INTO pon_ports (pon_id, port_number, status)
                VALUES (?, ?, 'available')
            ");
            for ($j = 1; $j <= $portsPerPON; $j++) {
                $stmt2->execute([$pon_id, $j]);
            }
        }
        
        $pdo->commit();
        sendResponse(['id' => $olt_id, 'message' => 'OLT created successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updateOLT($id) {
    global $pdo;
    if (!$id) sendResponse(['error' => 'ID is required'], 400);
    
    $data = getRequestData();
    
    try {
        $fields = [];
        $values = [];
        $allowed = ['name', 'model', 'ip_address', 'management_port', 'total_ports', 'location', 'description'];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $values[] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            sendResponse(['error' => 'No fields to update'], 400);
        }
        
        // Handle penambahan port jika total_ports bertambah
        if (isset($data['total_ports'])) {
            $newTotal = (int)$data['total_ports'];
            $stmt = $pdo->prepare("SELECT total_ports FROM olt WHERE id = ?");
            $stmt->execute([$id]);
            $oldTotal = (int)$stmt->fetch()['total_ports'];
            
            if ($newTotal > $oldTotal) {
                $stmt = $pdo->prepare("
                    INSERT INTO olt_ports (olt_id, port_number, status)
                    VALUES (?, ?, 'available')
                ");
                for ($i = $oldTotal + 1; $i <= $newTotal; $i++) {
                    $stmt->execute([$id, $i]);
                }
            }
        }
        
        $values[] = $id;
        $sql = "UPDATE olt SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        sendResponse(['message' => 'OLT updated successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function deleteOLT($id) {
    global $pdo;
    if (!$id) sendResponse(['error' => 'ID is required'], 400);
    
    try {
        // Hapus OLT (cascade akan menghapus ports)
        $stmt = $pdo->prepare("DELETE FROM olt WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(['message' => 'OLT deleted successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>