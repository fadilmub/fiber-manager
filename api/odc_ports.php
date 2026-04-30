<?php
require_once 'config.php';
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$odc_id = isset($_GET['odc_id']) ? (int)$_GET['odc_id'] : null;
$port = isset($_GET['port']) ? (int)$_GET['port'] : null;

switch ($method) {
    case 'GET':
        getPorts($odc_id);
        break;
    case 'PUT':
        updatePort($odc_id, $port);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getPorts($odc_id) {
    global $pdo;
    if (!$odc_id) sendResponse(['error' => 'odc_id required'], 400);

    try {
        $stmt = $pdo->prepare("SELECT op.*, odp.name AS target_name 
                               FROM odc_ports op 
                               LEFT JOIN odp ON op.target_odp_id = odp.id 
                               WHERE op.odc_id = ? 
                               ORDER BY op.port_number");
        $stmt->execute([$odc_id]);
        $ports = $stmt->fetchAll();
        sendResponse($ports);
    } catch (PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updatePort($odc_id, $port) {
    global $pdo;
    if (!$odc_id || !$port) sendResponse(['error' => 'odc_id and port required'], 400);
    
    $data = getRequestData();
    
    try {
        $stmt = $pdo->prepare("UPDATE odc_ports SET status = ?, target_odp_id = ?, connection_type = ? 
                               WHERE odc_id = ? AND port_number = ?");
        $stmt->execute([
            $data['status'] ?? 'available',
            $data['target_odp_id'] ?? null,
            $data['connection_type'] ?? 'feeder',
            $odc_id,
            $port
        ]);
        sendResponse(['message' => 'Port updated']);
    } catch (PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>