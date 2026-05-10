<?php
require_once 'config.php';

// Proteksi: hanya admin yang bisa akses
requireAuth();
checkRole(['admin']);
 
$currentUser = getCurrentUser();
if (!$currentUser || $currentUser['role'] !== 'admin') {
    sendResponse(['error' => 'Forbidden', 'message' => 'Hanya admin yang dapat mengelola user'], 403);
}


$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($method) {
    case 'GET':
        if ($id) {
            getUser($id);
        } else {
            getAllUsers();
        }
        break;
    case 'POST':
        createUser();
        break;
    case 'PUT':
        if ($action === 'reset-password') {
            resetPassword($id);
        } else {
            updateUser($id);
        }
        break;
    case 'DELETE':
        deleteUser($id);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getAllUsers() {
    global $pdo;
    try {
        $stmt = $pdo->query("
            SELECT id, username, full_name, email, phone, role, is_active, 
                   last_login, created_at, updated_at
            FROM users 
            ORDER BY created_at DESC
        ");
        $users = $stmt->fetchAll();
        sendResponse($users);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getUser($id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            SELECT id, username, full_name, email, phone, role, is_active, 
                   last_login, created_at, updated_at
            FROM users 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        
        if ($user) {
            sendResponse($user);
        } else {
            sendResponse(['error' => 'User not found'], 404);
        }
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function createUser() {
    global $pdo;
    $data = getRequestData();
    
    // Validasi
    if (empty($data['username']) || empty($data['password']) || empty($data['full_name'])) {
        sendResponse(['error' => 'Username, password, dan nama lengkap harus diisi'], 400);
    }
    
    if (strlen($data['username']) < 3) {
        sendResponse(['error' => 'Username minimal 3 karakter'], 400);
    }
    
    if (strlen($data['password']) < 6) {
        sendResponse(['error' => 'Password minimal 6 karakter'], 400);
    }
    
    try {
        // Cek username sudah ada atau belum
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$data['username']]);
        if ($stmt->fetch()) {
            sendResponse(['error' => 'Username sudah digunakan'], 400);
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO users (username, password, full_name, email, phone, role, is_active, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['username'],
            password_hash($data['password'], PASSWORD_DEFAULT),
            $data['full_name'],
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['role'] ?? 'operator',
            $data['is_active'] ?? 1,
            $data['notes'] ?? null
        ]);
        
        $id = $pdo->lastInsertId();
        sendResponse(['id' => $id, 'message' => 'User berhasil ditambahkan']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updateUser($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'ID is required'], 400);
    }
    
    $data = getRequestData();
    
    try {
        // Cek user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            sendResponse(['error' => 'User tidak ditemukan'], 404);
        }
        
        // Cek username unique jika diubah
        if (isset($data['username'])) {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
            $stmt->execute([$data['username'], $id]);
            if ($stmt->fetch()) {
                sendResponse(['error' => 'Username sudah digunakan'], 400);
            }
        }
        
        // Proteksi: tidak bisa mengubah role sendiri
        $currentUser = getCurrentUser();
        if ($currentUser['id'] == $id && isset($data['role']) && $data['role'] !== 'admin') {
            sendResponse(['error' => 'Anda tidak dapat mengubah role sendiri'], 400);
        }
        
        $fields = [];
        $values = [];
        
        $allowedFields = ['username', 'full_name', 'email', 'phone', 'role', 'is_active', 'notes'];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $values[] = $data[$field];
            }
        }
        
        // Jika password diisi, update password juga
        if (!empty($data['password'])) {
            if (strlen($data['password']) < 6) {
                sendResponse(['error' => 'Password minimal 6 karakter'], 400);
            }
            $fields[] = "password = ?";
            $values[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        if (empty($fields)) {
            sendResponse(['error' => 'No fields to update'], 400);
        }
        
        $values[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        sendResponse(['message' => 'User berhasil diupdate']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function resetPassword($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'ID is required'], 400);
    }
    
    $data = getRequestData();
    
    if (empty($data['new_password'])) {
        sendResponse(['error' => 'Password baru harus diisi'], 400);
    }
    
    if (strlen($data['new_password']) < 6) {
        sendResponse(['error' => 'Password minimal 6 karakter'], 400);
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([password_hash($data['new_password'], PASSWORD_DEFAULT), $id]);
        
        sendResponse(['message' => 'Password berhasil direset']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function deleteUser($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'ID is required'], 400);
    }
    
    // Cek tidak bisa menghapus diri sendiri
    $currentUser = getCurrentUser();
    if ($currentUser['id'] == $id) {
        sendResponse(['error' => 'Anda tidak dapat menghapus akun sendiri'], 400);
    }
    
    try {
        // Cek user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            sendResponse(['error' => 'User tidak ditemukan'], 404);
        }
        
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        
        sendResponse(['message' => 'User berhasil dihapus']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>