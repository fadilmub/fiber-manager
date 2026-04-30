<?php
require_once 'config.php';
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$odp_id = isset($_GET['odp_id']) ? (int)$_GET['odp_id'] : null;
$port_number = isset($_GET['port']) ? (int)$_GET['port'] : null;

switch($method) {
    case 'PUT':
        updatePort($odp_id, $port_number);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function updatePort($odp_id, $port_number) {
    global $pdo;
    
    if (!$odp_id || !$port_number) {
        sendResponse(['error' => 'ODP ID and port number are required'], 400);
    }
    
    $data = getRequestData();
    
    try {
        $stmt = $pdo->prepare("UPDATE odp_ports SET status = ?, target = ?, connection_type = ?, target_port = ?, onu_id = ? WHERE odp_id = ? AND port_number = ?");
        $stmt->execute([
            $data['status'] ?? 'available',
            $data['target'] ?? null,
            $data['connection_type'] ?? null,
            $data['target_port'] ?? null,
            $data['onu_id'] ?? null,
            $odp_id,
            $port_number
        ]);
        
        // Update available_ports in ODP table
        $stmt2 = $pdo->prepare("
            UPDATE odp 
            SET available_ports = (
                SELECT COUNT(*) FROM odp_ports 
                WHERE odp_id = ? AND status = 'available'
            )
            WHERE id = ?
        ");
        $stmt2->execute([$odp_id, $odp_id]);
        
        sendResponse(['message' => 'Port updated successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>