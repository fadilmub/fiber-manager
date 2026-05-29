<?php
require_once 'config.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($method) {
    case 'GET':
        if ($id && $action === 'olts') {
            getPOPOLTs($id);
        } elseif ($id) {
            getPOP($id);
        } else {
            getAllPOP();
        }
        break;
    case 'POST':
        checkRole(['admin', 'operator']);
        createPOP();
        break;
    case 'PUT':
        checkRole(['admin', 'operator']);
        updatePOP($id);
        break;
    case 'DELETE':
        checkRole(['admin']);
        deletePOP($id);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getAllPOP() {
    global $pdo;
    try {
        $stmt = $pdo->query("
            SELECT p.*, 
                   (SELECT COUNT(*) FROM olt WHERE pop_id = p.id) as olt_count
            FROM pop p 
            ORDER BY p.created_at DESC
        ");
        $pops = $stmt->fetchAll();
        
        sendResponse($pops);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getPOP($id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("SELECT * FROM pop WHERE id = ?");
        $stmt->execute([$id]);
        $pop = $stmt->fetch();
        
        if ($pop) {
            sendResponse($pop);
        } else {
            sendResponse(['error' => 'POP not found'], 404);
        }
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

// =============================================
// PERBAIKAN UTAMA: Fungsi getPOPOLTs
// =============================================
function getPOPOLTs($pop_id) {
    global $pdo;
    try {
        // Query ambil semua OLT berdasarkan POP ID
        $stmt = $pdo->prepare("
            SELECT o.* 
            FROM olt o
            WHERE o.pop_id = ?
            ORDER BY o.name
        ");
        $stmt->execute([$pop_id]);
        $olts = $stmt->fetchAll();
        
        // Untuk setiap OLT, ambil data portnya
        foreach ($olts as &$olt) {
            // Ambil semua port untuk OLT ini
            $stmt2 = $pdo->prepare("
                SELECT * FROM olt_ports 
                WHERE olt_id = ? 
                ORDER BY port_number
            ");
            $stmt2->execute([$olt['id']]);
            $ports = $stmt2->fetchAll();
            
            // Jika tidak ada port, buat port sesuai total_ports
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
            
            // Hitung statistik port
            $usedCount = 0;
            $availableCount = 0;
            $maintenanceCount = 0;
            
            foreach ($ports as $port) {
                if ($port['status'] === 'used') $usedCount++;
                elseif ($port['status'] === 'available') $availableCount++;
                elseif ($port['status'] === 'maintenance') $maintenanceCount++;
            }
            
            $olt['used_ports'] = $usedCount;
            $olt['available_ports'] = $availableCount;
            $olt['maintenance_ports'] = $maintenanceCount;
        }
        
        sendResponse($olts);
    } catch(PDOException $e) {
        sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function createPOP() {
    global $pdo;
    $data = getRequestData();
    
    if (!isset($data['name']) || !isset($data['lat']) || !isset($data['lng'])) {
        sendResponse(['error' => 'Missing required fields: name, lat, lng'], 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO pop (name, code, lat, lng, location, address, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $data['code'] ?? null,
            $data['lat'],
            $data['lng'],
            $data['location'] ?? '',
            $data['address'] ?? '',
            $data['description'] ?? ''
        ]);
        
        sendResponse(['id' => $pdo->lastInsertId(), 'message' => 'POP created successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updatePOP($id) {
    global $pdo;
    if (!$id) sendResponse(['error' => 'ID is required'], 400);
    
    $data = getRequestData();
    
    try {
        $fields = []; 
        $values = [];
        $allowed = ['name', 'code', 'lat', 'lng', 'location', 'address', 'description'];
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
        $sql = "UPDATE pop SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        sendResponse(['message' => 'POP updated successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function deletePOP($id) {
    global $pdo;
    if (!$id) sendResponse(['error' => 'ID is required'], 400);
    
    try {
        // Hapus semua OLT terkait (cascade akan menghapus ports juga)
        $stmt = $pdo->prepare("DELETE FROM olt WHERE pop_id = ?");
        $stmt->execute([$id]);
        
        // Hapus POP
        $stmt = $pdo->prepare("DELETE FROM pop WHERE id = ?");
        $stmt->execute([$id]);
        
        sendResponse(['message' => 'POP deleted successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>