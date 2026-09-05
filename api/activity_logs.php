<?php
require_once 'config.php';

requireAuth();
checkRole(['admin']);

$limit = min(max((int)($_GET['limit'] ?? 100), 1), 500);
$page = max((int)($_GET['page'] ?? 1), 1);
$offset = ($page - 1) * $limit;
$action = trim($_GET['action'] ?? '');
$entityType = trim($_GET['entity_type'] ?? '');

$where = [];
$params = [];
if ($action !== '') {
    $where[] = 'a.action = ?';
    $params[] = $action;
}
if ($entityType !== '') {
    $where[] = 'a.entity_type = ?';
    $params[] = $entityType;
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

try {
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM activity_logs a $whereSql");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT a.id, a.action, a.entity_type, a.entity_id, a.description,
                                  a.old_values, a.new_values, a.ip_address, a.created_at,
                                  u.username, u.full_name
                           FROM activity_logs a
                           LEFT JOIN users u ON u.id = a.user_id
                           $whereSql
                           ORDER BY a.created_at DESC
                           LIMIT $limit OFFSET $offset");
    foreach ($params as $index => $param) {
        $stmt->bindValue($index + 1, $param);
    }
    $stmt->execute();

    sendResponse([
        'data' => $stmt->fetchAll(),
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'pages' => (int)ceil($total / $limit)
    ]);
} catch (PDOException $e) {
    error_log('Activity log error: ' . $e->getMessage());
    sendResponse(['error' => 'Gagal memuat log aktivitas'], 500);
}
?>
