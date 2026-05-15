<?php
require_once 'config.php';

// Proteksi: harus login
requireAuth();

// Upload hanya untuk admin dan operator
checkRole(['admin', 'operator']);

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'POST':
        uploadPhoto();
        break;
    case 'DELETE':
        deletePhoto();
        break;
    case 'GET':
        getPhotos();
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function uploadPhoto() {
    global $pdo;
    
    $type = $_POST['type'] ?? ''; // 'odc' atau 'odp'
    $deviceId = isset($_POST['device_id']) ? (int)$_POST['device_id'] : 0;
    
    if (!in_array($type, ['odc', 'odp'])) {
        sendResponse(['error' => 'Tipe device tidak valid'], 400);
    }
    
    if (!$deviceId) {
        sendResponse(['error' => 'Device ID harus diisi'], 400);
    }
    
    // Cek apakah device exists
    $table = $type === 'odc' ? 'odc' : 'odp';
    $stmt = $pdo->prepare("SELECT id FROM $table WHERE id = ?");
    $stmt->execute([$deviceId]);
    if (!$stmt->fetch()) {
        sendResponse(['error' => 'Device tidak ditemukan'], 404);
    }
    
    // Cek jumlah foto existing
    $photoTable = $type === 'odc' ? 'odc_photos' : 'odp_photos';
    $idColumn = $type === 'odc' ? 'odc_id' : 'odp_id';
    
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM $photoTable WHERE $idColumn = ?");
    $stmt->execute([$deviceId]);
    $result = $stmt->fetch();
    $existingCount = $result['total'];
    
    $maxPhotos = 5;
    $uploadCount = count($_FILES['photos']['name'] ?? []);
    
    if ($existingCount + $uploadCount > $maxPhotos) {
        sendResponse(['error' => "Maksimal $maxPhotos foto. Saat ini sudah ada $existingCount foto."], 400);
    }
    
    // Proses upload
    if (!isset($_FILES['photos'])) {
        sendResponse(['error' => 'File foto harus diupload'], 400);
    }
    
    $uploadDir = __DIR__ . '/../uploads/' . $type . '/';
    
    // Buat folder jika belum ada
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $uploadedPhotos = [];
    $errors = [];
    
    $files = $_FILES['photos'];
    $fileCount = count($files['name']);
    
    for ($i = 0; $i < $fileCount; $i++) {
        $fileName = $files['name'][$i];
        $fileTmp = $files['tmp_name'][$i];
        $fileSize = $files['size'][$i];
        $fileError = $files['error'][$i];
        
        // Validasi error upload
        if ($fileError !== UPLOAD_ERR_OK) {
            $errors[] = "Error upload file: $fileName";
            continue;
        }
        
        // Validasi tipe file
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($fileInfo, $fileTmp);
        finfo_close($fileInfo);
        
        if (!in_array($mimeType, $allowedTypes)) {
            $errors[] = "Tipe file tidak diizinkan: $fileName (hanya JPG, PNG, GIF, WEBP)";
            continue;
        }
        
        // Validasi ukuran (max 5MB per foto)
        $maxSize = 5 * 1024 * 1024; // 5MB
        if ($fileSize > $maxSize) {
            $errors[] = "File terlalu besar: $fileName (max 5MB)";
            continue;
        }
        
        // Generate unique filename
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $newFileName = $type . '_' . $deviceId . '_' . time() . '_' . uniqid() . '.' . $extension;
        $destination = $uploadDir . $newFileName;
        
        if (move_uploaded_file($fileTmp, $destination)) {
            // Simpan ke database
            $stmt = $pdo->prepare("
                INSERT INTO $photoTable ($idColumn, filename, original_name, file_size, is_primary)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            // Foto pertama otomatis jadi primary jika belum ada foto
            $isPrimary = ($existingCount === 0 && $i === 0 && count($uploadedPhotos) === 0) ? 1 : 0;
            
            $stmt->execute([
                $deviceId,
                $newFileName,
                $fileName,
                $fileSize,
                $isPrimary
            ]);
            
            $photoId = $pdo->lastInsertId();
            $uploadedPhotos[] = [
                'id' => $photoId,
                'filename' => $newFileName,
                'original_name' => $fileName,
                'is_primary' => $isPrimary,
                'url' => 'uploads/' . $type . '/' . $newFileName
            ];
        } else {
            $errors[] = "Gagal menyimpan file: $fileName";
        }
    }
    
    $response = [
        'message' => count($uploadedPhotos) . ' foto berhasil diupload',
        'photos' => $uploadedPhotos
    ];
    
    if (!empty($errors)) {
        $response['errors'] = $errors;
    }
    
    sendResponse($response);
}

function deletePhoto() {
    global $pdo;
    
    $data = getRequestData();
    $photoId = isset($data['photo_id']) ? (int)$data['photo_id'] : 0;
    $type = $data['type'] ?? '';
    
    if (!in_array($type, ['odc', 'odp'])) {
        sendResponse(['error' => 'Tipe device tidak valid'], 400);
    }
    
    if (!$photoId) {
        sendResponse(['error' => 'Photo ID harus diisi'], 400);
    }
    
    $photoTable = $type === 'odc' ? 'odc_photos' : 'odp_photos';
    $idColumn = $type === 'odc' ? 'odc_id' : 'odp_id';
    
    try {
        // Ambil info foto
        $stmt = $pdo->prepare("SELECT * FROM $photoTable WHERE id = ?");
        $stmt->execute([$photoId]);
        $photo = $stmt->fetch();
        
        if (!$photo) {
            sendResponse(['error' => 'Foto tidak ditemukan'], 404);
        }
        
        // Hapus file fisik
        $filePath = __DIR__ . '/../uploads/' . $type . '/' . $photo['filename'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        // Hapus dari database
        $stmt = $pdo->prepare("DELETE FROM $photoTable WHERE id = ?");
        $stmt->execute([$photoId]);
        
        // Jika foto yang dihapus adalah primary, jadikan foto lain sebagai primary
        if ($photo['is_primary']) {
            $stmt = $pdo->prepare("
                UPDATE $photoTable 
                SET is_primary = 1 
                WHERE $idColumn = ? 
                ORDER BY id ASC 
                LIMIT 1
            ");
            $stmt->execute([$photo[$idColumn]]);
        }
        
        sendResponse(['message' => 'Foto berhasil dihapus']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function getPhotos() {
    global $pdo;
    
    $type = $_GET['type'] ?? '';
    $deviceId = isset($_GET['device_id']) ? (int)$_GET['device_id'] : 0;
    
    if (!in_array($type, ['odc', 'odp'])) {
        sendResponse(['error' => 'Tipe device tidak valid'], 400);
    }
    
    if (!$deviceId) {
        sendResponse(['error' => 'Device ID harus diisi'], 400);
    }
    
    $photoTable = $type === 'odc' ? 'odc_photos' : 'odp_photos';
    $idColumn = $type === 'odc' ? 'odc_id' : 'odp_id';
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, filename, original_name, file_size, is_primary, created_at,
                   CONCAT('uploads/$type/', filename) as url
            FROM $photoTable 
            WHERE $idColumn = ? 
            ORDER BY is_primary DESC, created_at ASC
        ");
        $stmt->execute([$deviceId]);
        $photos = $stmt->fetchAll();
        
        sendResponse($photos);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>