<?php
// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// =============================================
// CORS HANDLING (PERBAIKAN UTAMA)
// =============================================
// Daftar origin yang diizinkan
$allowed_origins = [
    'http://localhost',
    'http://localhost:80',
    'http://127.0.0.1',
    'http://localhost/fiber-manager'
];

$origin = '';
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
} elseif (isset($_SERVER['HTTP_REFERER'])) {
    // Fallback ke referer
    $parsed = parse_url($_SERVER['HTTP_REFERER']);
    $origin = $parsed['scheme'] . '://' . $parsed['host'];
    if (isset($parsed['port'])) {
        $origin .= ':' . $parsed['port'];
    }
}

// Untuk development local, izinkan semua localhost
if ($origin && (strpos($origin, 'localhost') !== false || strpos($origin, '127.0.0.1') !== false)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Fallback untuk production
    header("Access-Control-Allow-Origin: http://localhost");
}

header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// =============================================
// DATABASE CONNECTION
// =============================================
$host = 'localhost';
$dbname = 'fiber_manager';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Connection failed: ' . $e->getMessage()]);
    exit();
}

// =============================================
// AUTH FUNCTIONS
// =============================================
function isAuthenticated() {
    return isset($_SESSION['user_id']) && isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

function requireAuth() {
    if (!isAuthenticated()) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized', 'message' => 'Silakan login terlebih dahulu']);
        exit();
    }
}

function getCurrentUser() {
    if (!isAuthenticated()) return null;
    
    global $pdo;
    try {
        $stmt = $pdo->prepare("SELECT id, username, full_name, role FROM users WHERE id = ? AND is_active = 1");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch();
    } catch(PDOException $e) {
        return null;
    }
}

function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

function getRequestData() {
    $data = json_decode(file_get_contents("php://input"), true);
    if ($data === null) {
        $data = $_POST;
    }
    return $data;
}
?>