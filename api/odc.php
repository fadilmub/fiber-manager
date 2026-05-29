<?php
require_once 'config.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($method) {
    case 'GET':
        if (isset($_GET['sources'])) {
            getAvailableSources();
        } elseif ($id && isset($_GET['ports'])) {
            getODCPorts($id);
        } elseif ($id) {
            getODC($id);
        } else {
            getAllODC();
        }
        break;
    case 'POST':
        checkRole(['admin', 'operator']);
        createODC();
        break;
    case 'PUT':
        checkRole(['admin', 'operator']);
        updateODC($id);
        break;
    case 'DELETE':
        checkRole(['admin']);
        deleteODC($id);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getAllODC() {
    global $pdo;
    try {
        $stmt = $pdo->query("SELECT o.*, 
                   (SELECT COUNT(*) FROM odc_odp_connections WHERE odc_id = o.id) as connected_odps,
                   o.capacity,
                   pop.name as source_pop_name,
                   olt.name as source_olt_name,
                   pon.card_number as source_pon_card,
                   pon.name as source_pon_name,
                   o.pon_port_number as source_port_number,
                   CONCAT(
                       COALESCE(pop.name, ''),
                       IF(olt.name IS NOT NULL, CONCAT(' → ', olt.name), ''),
                       IF(pon.card_number IS NOT NULL, CONCAT(' → PON ', pon.card_number), ''),
                       IF(o.pon_port_number IS NOT NULL, CONCAT(' → Port ', o.pon_port_number), '')
                   ) as source_path
            FROM odc o
            LEFT JOIN pop ON o.source_id = pop.id
            LEFT JOIN olt ON o.olt_id = olt.id
            LEFT JOIN pon ON o.pon_id = pon.id
            ORDER BY o.created_at DESC");
        $odcs = $stmt->fetchAll();

        foreach ($odcs as &$odc) {
            $stmt2 = $pdo->prepare("SELECT id, filename, original_name, is_primary,
                       CONCAT('uploads/odc/', filename) as url
                FROM odc_photos 
                WHERE odc_id = ? 
                ORDER BY is_primary DESC");
            $stmt2->execute([$odc['id']]);
            $odc['photos'] = $stmt2->fetchAll();

            $stmt3 = $pdo->prepare("SELECT COUNT(*) as used_ports FROM odc_odp_connections WHERE odc_id = ?");
            $stmt3->execute([$odc['id']]);
            $odc['used_ports'] = $stmt3->fetch()['used_ports'];
        }

        sendResponse($odcs);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getODC($id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("SELECT o.*, 
                   (SELECT COUNT(*) FROM odc_odp_connections WHERE odc_id = o.id) as connected_odps,
                   pop.id as source_pop_id,
                   pop.name as source_pop_name,
                   olt.id as source_olt_id,
                   olt.name as source_olt_name,
                   pon.id as source_pon_id,
                   pon.card_number as source_pon_card,
                   pon.name as source_pon_name,
                   o.pon_port_number as source_port_number,
                   CONCAT(
                       COALESCE(pop.name, ''),
                       IF(olt.name IS NOT NULL, CONCAT(' → ', olt.name), ''),
                       IF(pon.card_number IS NOT NULL, CONCAT(' → PON ', pon.card_number), ''),
                       IF(o.pon_port_number IS NOT NULL, CONCAT(' → Port ', o.pon_port_number), '')
                   ) as source_path
            FROM odc o
            LEFT JOIN pop ON o.source_id = pop.id
            LEFT JOIN olt ON o.olt_id = olt.id
            LEFT JOIN pon ON o.pon_id = pon.id
            WHERE o.id = ?");
        $stmt->execute([$id]);
        $odc = $stmt->fetch();

        if ($odc) {
            $stmt2 = $pdo->prepare("SELECT odp.id, odp.name, odp.port_number_in_odc as port_number
                FROM odc_odp_connections coc
                JOIN odp ON coc.odp_id = odp.id
                WHERE coc.odc_id = ?");
            $stmt2->execute([$id]);
            $odc['connected_odps_list'] = $stmt2->fetchAll();
            $odc['used_ports'] = count($odc['connected_odps_list']);

            $stmt3 = $pdo->prepare("SELECT id, filename, original_name, is_primary,
                       CONCAT('uploads/odc/', filename) as url
                FROM odc_photos 
                WHERE odc_id = ? 
                ORDER BY is_primary DESC");
            $stmt3->execute([$id]);
            $odc['photos'] = $stmt3->fetchAll();

            sendResponse($odc);
        } else {
            sendResponse(['error' => 'ODC not found'], 404);
        }
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getODCPorts($odc_id) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("SELECT coc.odp_id,
                   odp.name as odp_name,
                   coc.port_number as port_number
            FROM odc_odp_connections coc
            JOIN odp ON coc.odp_id = odp.id
            WHERE coc.odc_id = ?");
        $stmt->execute([$odc_id]);
        $usedPorts = $stmt->fetchAll();

        $stmt2 = $pdo->prepare("SELECT capacity FROM odc WHERE id = ?");
        $stmt2->execute([$odc_id]);
        $odc = $stmt2->fetch();
        $capacity = $odc ? $odc['capacity'] : 24;

        $usedPortMap = [];
        foreach ($usedPorts as $port) {
            $usedPortMap[$port['port_number']] = [
                'odp_id' => $port['odp_id'],
                'odp_name' => $port['odp_name']
            ];
        }

        $ports = [];
        for ($i = 1; $i <= $capacity; $i++) {
            if (isset($usedPortMap[$i])) {
                $ports[] = [
                    'port_number' => $i,
                    'status' => 'used',
                    'odp_id' => $usedPortMap[$i]['odp_id'],
                    'odp_name' => $usedPortMap[$i]['odp_name']
                ];
            } else {
                $ports[] = [
                    'port_number' => $i,
                    'status' => 'available',
                    'odp_id' => null,
                    'odp_name' => null
                ];
            }
        }

        sendResponse($ports);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getAvailableSources() {
    global $pdo;
    try {
        $sources = [
            'pops' => [],
            'olts' => [],
            'pons' => []
        ];

        $stmt = $pdo->query("SELECT id, name, code, location FROM pop ORDER BY name");
        $sources['pops'] = $stmt->fetchAll();

        $stmt = $pdo->query("SELECT o.id, o.name, o.model, p.id as pop_id, p.name as pop_name
            FROM olt o
            JOIN pop p ON o.pop_id = p.id
            ORDER BY p.name, o.name");
        $sources['olts'] = $stmt->fetchAll();

        $stmt = $pdo->query("SELECT p.id, p.card_number, p.name as pon_name, p.port_count,
                   o.id as olt_id, o.name as olt_name,
                   po.id as pop_id, po.name as pop_name
            FROM pon p
            JOIN olt o ON p.olt_id = o.id
            JOIN pop po ON o.pop_id = po.id
            WHERE p.status = 'active'
            ORDER BY po.name, o.name, p.card_number");
        $sources['pons'] = $stmt->fetchAll();

        sendResponse($sources);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function createODC() {
    global $pdo;
    $data = getRequestData();

    if (!isset($data['name']) || !isset($data['lat']) || !isset($data['lng'])) {
        sendResponse(['error' => 'Missing required fields: name, lat, lng'], 400);
    }

    if (!isset($data['pon_id']) || !isset($data['pon_port_number'])) {
        sendResponse(['error' => 'ODC harus terhubung ke PON Card dan Port tertentu'], 400);
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT status FROM pon_ports 
            WHERE pon_id = ? AND port_number = ? AND status = 'available'");
        $stmt->execute([$data['pon_id'], $data['pon_port_number']]);
        if (!$stmt->fetch()) {
            sendResponse(['error' => 'Port PON sudah tidak tersedia'], 400);
        }

        $stmt = $pdo->prepare("SELECT p.olt_id, o.pop_id 
            FROM pon p
            JOIN olt o ON p.olt_id = o.id
            WHERE p.id = ?");
        $stmt->execute([$data['pon_id']]);
        $sourceInfo = $stmt->fetch();
        $olt_id = $sourceInfo['olt_id'];
        $pop_id = $sourceInfo['pop_id'];

        $stmt = $pdo->prepare("INSERT INTO odc (name, lat, lng, location, capacity, used_ports, description, 
                           source_type, source_id, pon_id, pon_port_number, olt_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['name'],
            $data['lat'],
            $data['lng'],
            $data['location'] ?? '',
            $data['capacity'] ?? 24,
            0,
            $data['description'] ?? '',
            'pon',
            $pop_id,
            $data['pon_id'],
            $data['pon_port_number'],
            $olt_id
        ]);

        $odc_id = $pdo->lastInsertId();

        $stmt = $pdo->prepare("UPDATE pon_ports 
            SET status = 'used', target_odc_id = ?, updated_at = NOW()
            WHERE pon_id = ? AND port_number = ?");
        $stmt->execute([$odc_id, $data['pon_id'], $data['pon_port_number']]);

        $pdo->commit();
        sendResponse(['id' => $odc_id, 'message' => 'ODC created successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function updateODC($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'ID is required'], 400);
    }

    $data = getRequestData();

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM odc WHERE id = ?");
        $stmt->execute([$id]);
        $oldData = $stmt->fetch();

        if (!$oldData) {
            sendResponse(['error' => 'ODC not found'], 404);
        }

        $fields = [];
        $values = [];
        $portChanged = false;

        if (isset($data['name'])) { $fields[] = "name = ?"; $values[] = $data['name']; }
        if (isset($data['lat'])) { $fields[] = "lat = ?"; $values[] = $data['lat']; }
        if (isset($data['lng'])) { $fields[] = "lng = ?"; $values[] = $data['lng']; }
        if (isset($data['location'])) { $fields[] = "location = ?"; $values[] = $data['location']; }
        if (isset($data['capacity'])) { $fields[] = "capacity = ?"; $values[] = $data['capacity']; }
        if (isset($data['description'])) { $fields[] = "description = ?"; $values[] = $data['description']; }

        if (isset($data['pon_id']) && isset($data['pon_port_number'])) {
            $newPonId = $data['pon_id'];
            $newPonPort = $data['pon_port_number'];

            if ($newPonId != $oldData['pon_id'] || $newPonPort != $oldData['pon_port_number']) {
                $stmt = $pdo->prepare("SELECT status FROM pon_ports WHERE pon_id = ? AND port_number = ?");
                $stmt->execute([$newPonId, $newPonPort]);
                $port = $stmt->fetch();

                if (!$port) {
                    sendResponse(['error' => 'Port PON tidak ditemukan'], 400);
                }
                if ($port['status'] !== 'available') {
                    sendResponse(['error' => 'Port PON sudah tidak tersedia'], 400);
                }
                $portChanged = true;
            }

            $stmt = $pdo->prepare("SELECT p.olt_id, o.pop_id FROM pon p JOIN olt o ON p.olt_id = o.id WHERE p.id = ?");
            $stmt->execute([$newPonId]);
            $sourceInfo = $stmt->fetch();

            if (!$sourceInfo) {
                sendResponse(['error' => 'PON tidak valid'], 400);
            }

            $fields[] = "pon_id = ?"; $values[] = $newPonId;
            $fields[] = "pon_port_number = ?"; $values[] = $newPonPort;
            $fields[] = "olt_id = ?"; $values[] = $sourceInfo['olt_id'];
            $fields[] = "source_id = ?"; $values[] = $sourceInfo['pop_id'];
            $fields[] = "source_type = 'pon'";
        }

        if (empty($fields)) {
            sendResponse(['error' => 'No fields to update'], 400);
        }

        $values[] = $id;
        $sql = "UPDATE odc SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);

        if ($portChanged) {
            $stmt = $pdo->prepare("UPDATE pon_ports SET status = 'available', target_odc_id = NULL, updated_at = NOW() WHERE pon_id = ? AND port_number = ?");
            $stmt->execute([$oldData['pon_id'], $oldData['pon_port_number']]);

            $stmt = $pdo->prepare("UPDATE pon_ports SET status = 'used', target_odc_id = ?, updated_at = NOW() WHERE pon_id = ? AND port_number = ?");
            $stmt->execute([$id, $newPonId, $newPonPort]);
        }

        $pdo->commit();
        sendResponse(['message' => 'ODC updated successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function deleteODC($id) {
    global $pdo;
    if (!$id) {
        sendResponse(['error' => 'ID is required'], 400);
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT pon_id, pon_port_number FROM odc WHERE id = ?");
        $stmt->execute([$id]);
        $odc = $stmt->fetch();

        if ($odc && $odc['pon_id'] && $odc['pon_port_number']) {
            $stmt = $pdo->prepare("UPDATE pon_ports 
                SET status = 'available', target_odc_id = NULL 
                WHERE pon_id = ? AND port_number = ?");
            $stmt->execute([$odc['pon_id'], $odc['pon_port_number']]);
        }

        $stmt = $pdo->prepare("DELETE FROM odc_odp_connections WHERE odc_id = ?");
        $stmt->execute([$id]);

        $stmt = $pdo->prepare("DELETE FROM odc WHERE id = ?");
        $stmt->execute([$id]);

        $pdo->commit();
        sendResponse(['message' => 'ODC deleted successfully']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>
