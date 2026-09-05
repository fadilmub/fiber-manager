<?php
require_once 'config.php';

// Proteksi: harus login
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch($method) {
    case 'GET':
        if ($id) {
            getPole($id);
        } else {
            getAllPole();
        }
        break;
    case 'POST':
        checkRole(['admin', 'operator']);
        createPole();
        break;
    case 'PUT':
        checkRole(['admin', 'operator']);
        updatePole($id);
        break;
    case 'DELETE':
        checkRole(['admin']);
        deletePole($id);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getAllPole() {
    global $pdo;
    try {
        $stmt = $pdo->prepare("SELECT * FROM pole ORDER BY created_at DESC");
        $stmt->execute();
        $poles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendResponse($poles);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getPole($id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("SELECT * FROM pole WHERE id = ?");
        $stmt->execute([$id]);
        $pole = $stmt->fetch();
        if ($pole) {
            sendResponse($pole);
        } else {
            sendResponse(['error' => 'Pole not found'], 404);
        }
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function createPole() {
    global $pdo;
    $data = getRequestData();

    if (!isset($data['name']) || !isset($data['lat']) || !isset($data['lng'])) {
        sendResponse(['error' => 'Missing required fields: name, lat, lng'], 400);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO pole (name, lat, lng, location, description, jenis_tiang) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['name'],
            $data['lat'],
            $data['lng'],
            $data['location'] ?? '',
            $data['description'] ?? '',
            $data['jenis_tiang'] ?? null
        ]);
        $pole_id = $pdo->lastInsertId();
        logActivity('create', 'pole', $pole_id, 'Menambahkan tiang', null, $data);
        sendResponse(['id' => $pole_id, 'message' => 'Pole created successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updatePole($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'Missing pole ID'], 400);
    }

    $data = getRequestData();
    if (!isset($data['name']) || !isset($data['lat']) || !isset($data['lng'])) {
        sendResponse(['error' => 'Missing required fields: name, lat, lng'], 400);
    }

    try {
        $oldStmt = $pdo->prepare("SELECT * FROM pole WHERE id = ?");
        $oldStmt->execute([$id]);
        $oldData = $oldStmt->fetch();
        $stmt = $pdo->prepare("UPDATE pole SET name = ?, lat = ?, lng = ?, location = ?, description = ?, jenis_tiang = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([
            $data['name'],
            $data['lat'],
            $data['lng'],
            $data['location'] ?? '',
            $data['description'] ?? '',
            $data['jenis_tiang'] ?? null,
            $id
        ]);
        logActivity('update', 'pole', $id, 'Mengubah tiang', $oldData, $data);
        sendResponse(['id' => $id, 'message' => 'Pole updated successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function deletePole($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'Missing pole ID'], 400);
    }

    try {
        $oldStmt = $pdo->prepare("SELECT * FROM pole WHERE id = ?");
        $oldStmt->execute([$id]);
        $oldData = $oldStmt->fetch();
        $stmt = $pdo->prepare("DELETE FROM pole WHERE id = ?");
        $stmt->execute([$id]);
        logActivity('delete', 'pole', $id, 'Menghapus tiang', $oldData, null);
        sendResponse(['id' => $id, 'message' => 'Pole deleted successfully']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
