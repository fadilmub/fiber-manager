<?php
require_once 'config.php';

requireAuth();
checkRole(['admin', 'operator']);

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'PUT':
        updatePONPort();
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function updatePONPort() {
    global $pdo;
    $data = getRequestData();
    
    if (!isset($data['pon_id']) || !isset($data['port_number'])) {
        sendResponse(['error' => 'Missing required fields: pon_id, port_number'], 400);
    }
    
    // Log incoming payload for debugging
    error_log('[pon-port] payload: ' . json_encode($data));
    
    // Basic validation
    if (!is_numeric($data['pon_id']) || !is_numeric($data['port_number'])) {
        sendResponse(['error' => 'Invalid pon_id or port_number'], 400);
    }
    
    $ponId = (int)$data['pon_id'];
    $portNumber = (int)$data['port_number'];
    
    // Ensure the target row exists before updating
    try {
        $checkStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM pon_ports WHERE pon_id = ? AND port_number = ?");
        $checkStmt->execute([$ponId, $portNumber]);
        $row = $checkStmt->fetch();
        if (!$row || $row['cnt'] == 0) {
            sendResponse(['error' => 'PON port not found'], 404);
        }
    } catch (PDOException $e) {
        error_log('[pon-port] check error: ' . $e->getMessage());
        sendResponse(['error' => 'Database error during validation'], 500);
    }
    
    try {
        // PERBAIKAN: Hapus karakter backslash yang tidak perlu
        $stmt = $pdo->prepare("
            UPDATE pon_ports 
            SET status = ?, target_odc_id = ?, description = ?, updated_at = NOW()
            WHERE pon_id = ? AND port_number = ?
        ");
        
        // Normalize inputs: ensure empty/blank target_odc_id becomes NULL
        $status = isset($data['status']) ? $data['status'] : 'available';
        $targetOdc = (isset($data['target_odc_id']) && $data['target_odc_id'] !== '' && $data['target_odc_id'] !== null) ? (int)$data['target_odc_id'] : null;
        $description = isset($data['description']) && $data['description'] !== '' ? $data['description'] : null;
        
        $stmt->execute([
            $status,
            $targetOdc,
            $description,
            $ponId,
            $portNumber
        ]);
        
        sendResponse(['message' => 'Port updated successfully']);
    } catch(PDOException $e) {
        // Log internal error for debugging
        error_log('[pon-port] update error: ' . $e->getMessage());
        sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}
?>