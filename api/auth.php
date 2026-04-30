<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($action) {
    case 'login':
        if ($method === 'POST') {
            login();
        } else {
            sendResponse(['error' => 'Method not allowed'], 405);
        }
        break;
    
    case 'logout':
        if ($method === 'POST') {
            logout();
        } else {
            sendResponse(['error' => 'Method not allowed'], 405);
        }
        break;
    
    case 'me':
        if ($method === 'GET') {
            getCurrentUserInfo();
        } else {
            sendResponse(['error' => 'Method not allowed'], 405);
        }
        break;
    
    default:
        sendResponse(['error' => 'Invalid action'], 400);
}

function login() {
    global $pdo;
    $data = getRequestData();
    
    if (!isset($data['username']) || !isset($data['password'])) {
        sendResponse(['error' => 'Username dan password harus diisi'], 400);
    }
    
    $username = trim($data['username']);
    $password = $data['password'];
    
    try {
        // Cari user
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        // Log attempt
        $logStmt = $pdo->prepare("INSERT INTO login_logs (user_id, ip_address, user_agent, status) VALUES (?, ?, ?, ?)");
        
        if ($user && password_verify($password, $user['password'])) {
            // Login berhasil
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['logged_in'] = true;
            
            // Update last login
            $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $updateStmt->execute([$user['id']]);
            
            // Log success
            $logStmt->execute([
                $user['id'],
                $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                'success'
            ]);
            
            sendResponse([
                'message' => 'Login berhasil',
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'full_name' => $user['full_name'],
                    'role' => $user['role']
                ]
            ]);
        } else {
            // Login gagal - log jika user exists
            if ($user) {
                $logStmt->execute([
                    $user['id'],
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                    $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                    'failed'
                ]);
            }
            
            sendResponse(['error' => 'Username atau password salah'], 401);
        }
    } catch(PDOException $e) {
        sendResponse(['error' => 'Login failed: ' . $e->getMessage()], 500);
    }
}

function logout() {
    // Clear session
    $_SESSION = [];
    
    // Destroy session cookie
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // Destroy session
    session_destroy();
    
    sendResponse(['message' => 'Logout berhasil']);
}

function getCurrentUserInfo() {
    $user = getCurrentUser();
    if ($user) {
        sendResponse(['user' => $user]);
    } else {
        sendResponse(['error' => 'Not logged in'], 401);
    }
}
?>