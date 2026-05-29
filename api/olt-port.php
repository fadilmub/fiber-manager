<?php
require_once 'config.php';

requireAuth();
checkRole(['admin', 'operator']);

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'PUT':
        updateOLTPort();
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function updateOLTPort() {
    global $pdo;
    $data = getRequestData();
    
    if (!isset($data['olt_id']) || !isset($data['port_number'])) {
        sendResponse(['error' => 'Missing required fields'], 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE olt_ports 
            SET status = ?, target_odc_id = ?, description = ?
            WHERE olt_id = ? AND port_number = ?
        ");
        $stmt->execute([
            $data['status'] ?? 'available',
            $data['target_odc_id'] ?? null,
            $data['description'] ?? null,
            $data['olt_id'],
            $data['port_number']
        ]);
        
        sendResponse(['message' => 'Port updated successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>