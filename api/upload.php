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
    
<<<<<<< HEAD
    $type = $_POST['type'] ?? ''; // 'odc' atau 'odp'
    $deviceId = isset($_POST['device_id']) ? (int)$_POST['device_id'] : 0;
    
    if (!in_array($type, ['odc', 'odp'])) {
=======
    $type = $_POST['type'] ?? ''; // 'pop', 'olt', 'odc', 'odp'
    $deviceId = isset($_POST['device_id']) ? (int)$_POST['device_id'] : 0;
    
    if (!in_array($type, ['pop', 'olt', 'odc', 'odp'])) {
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
        sendResponse(['error' => 'Tipe device tidak valid'], 400);
    }
    
    if (!$deviceId) {
        sendResponse(['error' => 'Device ID harus diisi'], 400);
    }
    
<<<<<<< HEAD
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
    
=======
    // =============================================
    // FIX 1: Mapping tabel untuk semua tipe
    // =============================================
    $tableMap = [
        'pop' => [
            'table' => 'pop',
            'photo_table' => 'pop_photos',
            'id_column' => 'pop_id',
            'upload_dir' => 'pop'
        ],
        'olt' => [
            'table' => 'olt',
            'photo_table' => 'olt_photos',
            'id_column' => 'olt_id',
            'upload_dir' => 'olt'
        ],
        'odc' => [
            'table' => 'odc',
            'photo_table' => 'odc_photos',
            'id_column' => 'odc_id',
            'upload_dir' => 'odc'
        ],
        'odp' => [
            'table' => 'odp',
            'photo_table' => 'odp_photos',
            'id_column' => 'odp_id',
            'upload_dir' => 'odp'
        ]
    ];
    
    $map = $tableMap[$type];
    $mainTable = $map['table'];
    $photoTable = $map['photo_table'];
    $idColumn = $map['id_column'];
    $uploadSubDir = $map['upload_dir'];
    
    // =============================================
    // FIX 2: Cek apakah device exists (untuk semua tipe)
    // =============================================
    $stmt = $pdo->prepare("SELECT id FROM $mainTable WHERE id = ?");
    $stmt->execute([$deviceId]);
    if (!$stmt->fetch()) {
        sendResponse(['error' => ucfirst($type) . ' tidak ditemukan'], 404);
    }
    
    // =============================================
    // FIX 3: Cek jumlah foto existing (pakai mapping)
    // =============================================
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
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
    
<<<<<<< HEAD
    $uploadDir = __DIR__ . '/../uploads/' . $type . '/';
=======
    // =============================================
    // FIX 4: Gunakan uploadSubDir untuk folder
    // =============================================
    $uploadDir = __DIR__ . '/../uploads/' . $uploadSubDir . '/';
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
    
    // Buat folder jika belum ada
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $uploadedPhotos = [];
    $errors = [];
    
    $files = $_FILES['photos'];
    $fileCount = count($files['name']);
    
<<<<<<< HEAD
=======
    // =============================================
    // FIX 5: Tambahkan validasi tambahan
    // =============================================
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
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
        
<<<<<<< HEAD
        // Validasi tipe file
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
=======
        // Validasi ekstensi file
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if (!in_array($extension, $allowedExtensions)) {
            $errors[] = "Ekstensi file tidak diizinkan: $fileName (hanya " . implode(', ', $allowedExtensions) . ")";
            continue;
        }
        
        // Validasi tipe MIME
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
        $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($fileInfo, $fileTmp);
        finfo_close($fileInfo);
        
<<<<<<< HEAD
        if (!in_array($mimeType, $allowedTypes)) {
=======
        if (!in_array($mimeType, $allowedMimeTypes)) {
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
            $errors[] = "Tipe file tidak diizinkan: $fileName (hanya JPG, PNG, GIF, WEBP)";
            continue;
        }
        
        // Validasi ukuran (max 5MB per foto)
        $maxSize = 5 * 1024 * 1024; // 5MB
        if ($fileSize > $maxSize) {
            $errors[] = "File terlalu besar: $fileName (max 5MB)";
            continue;
        }
        
<<<<<<< HEAD
        // Generate unique filename
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $newFileName = $type . '_' . $deviceId . '_' . time() . '_' . uniqid() . '.' . $extension;
=======
        // Generate unique filename dengan timestamp dan random
        $timestamp = time();
        $random = bin2hex(random_bytes(8));
        $newFileName = $type . '_' . $deviceId . '_' . $timestamp . '_' . $random . '.' . $extension;
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
        $destination = $uploadDir . $newFileName;
        
        if (move_uploaded_file($fileTmp, $destination)) {
            // Simpan ke database
            $stmt = $pdo->prepare("
<<<<<<< HEAD
                INSERT INTO $photoTable ($idColumn, filename, original_name, file_size, is_primary)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            // Foto pertama otomatis jadi primary jika belum ada foto
            $isPrimary = ($existingCount === 0 && $i === 0 && count($uploadedPhotos) === 0) ? 1 : 0;
=======
                INSERT INTO $photoTable ($idColumn, filename, original_name, file_size, is_primary, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            
            // Foto pertama otomatis jadi primary jika belum ada foto
            $isPrimary = ($existingCount === 0 && count($uploadedPhotos) === 0) ? 1 : 0;
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
            
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
<<<<<<< HEAD
                'is_primary' => $isPrimary,
                'url' => 'uploads/' . $type . '/' . $newFileName
=======
                'file_size' => $fileSize,
                'is_primary' => (bool)$isPrimary,
                'url' => 'uploads/' . $uploadSubDir . '/' . $newFileName,
                'created_at' => date('Y-m-d H:i:s')
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
            ];
        } else {
            $errors[] = "Gagal menyimpan file: $fileName";
        }
    }
    
<<<<<<< HEAD
    $response = [
        'message' => count($uploadedPhotos) . ' foto berhasil diupload',
        'photos' => $uploadedPhotos
=======
    // =============================================
    // FIX 6: Update has_photo flag di tabel utama (opsional)
    // =============================================
    if (count($uploadedPhotos) > 0) {
        $stmt = $pdo->prepare("UPDATE $mainTable SET has_photo = 1 WHERE id = ?");
        $stmt->execute([$deviceId]);
    }
    
    $response = [
        'success' => true,
        'message' => count($uploadedPhotos) . ' foto berhasil diupload',
        'photos' => $uploadedPhotos,
        'total_photos' => $existingCount + count($uploadedPhotos)
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
    ];
    
    if (!empty($errors)) {
        $response['errors'] = $errors;
<<<<<<< HEAD
=======
        $response['success'] = false;
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
    }
    
    sendResponse($response);
}

function deletePhoto() {
    global $pdo;
    
    $data = getRequestData();
    $photoId = isset($data['photo_id']) ? (int)$data['photo_id'] : 0;
    $type = $data['type'] ?? '';
    
<<<<<<< HEAD
    if (!in_array($type, ['odc', 'odp'])) {
=======
    if (!in_array($type, ['pop', 'olt', 'odc', 'odp'])) {
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
        sendResponse(['error' => 'Tipe device tidak valid'], 400);
    }
    
    if (!$photoId) {
        sendResponse(['error' => 'Photo ID harus diisi'], 400);
    }
    
<<<<<<< HEAD
    $photoTable = $type === 'odc' ? 'odc_photos' : 'odp_photos';
    $idColumn = $type === 'odc' ? 'odc_id' : 'odp_id';
=======
    // =============================================
    // Mapping untuk delete
    // =============================================
    $tableMap = [
        'pop' => ['photo_table' => 'pop_photos', 'main_table' => 'pop', 'id_column' => 'pop_id', 'dir' => 'pop'],
        'olt' => ['photo_table' => 'olt_photos', 'main_table' => 'olt', 'id_column' => 'olt_id', 'dir' => 'olt'],
        'odc' => ['photo_table' => 'odc_photos', 'main_table' => 'odc', 'id_column' => 'odc_id', 'dir' => 'odc'],
        'odp' => ['photo_table' => 'odp_photos', 'main_table' => 'odp', 'id_column' => 'odp_id', 'dir' => 'odp']
    ];
    
    $map = $tableMap[$type];
    $photoTable = $map['photo_table'];
    $mainTable = $map['main_table'];
    $idColumn = $map['id_column'];
    $uploadDir = $map['dir'];
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
    
    try {
        // Ambil info foto
        $stmt = $pdo->prepare("SELECT * FROM $photoTable WHERE id = ?");
        $stmt->execute([$photoId]);
        $photo = $stmt->fetch();
        
        if (!$photo) {
            sendResponse(['error' => 'Foto tidak ditemukan'], 404);
        }
        
<<<<<<< HEAD
        // Hapus file fisik
        $filePath = __DIR__ . '/../uploads/' . $type . '/' . $photo['filename'];
=======
        $deviceId = $photo[$idColumn];
        
        // Hapus file fisik
        $filePath = __DIR__ . '/../uploads/' . $uploadDir . '/' . $photo['filename'];
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        // Hapus dari database
        $stmt = $pdo->prepare("DELETE FROM $photoTable WHERE id = ?");
        $stmt->execute([$photoId]);
        
<<<<<<< HEAD
        // Jika foto yang dihapus adalah primary, jadikan foto lain sebagai primary
        if ($photo['is_primary']) {
=======
        // Cek sisa foto
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM $photoTable WHERE $idColumn = ?");
        $stmt->execute([$deviceId]);
        $remaining = $stmt->fetch()['total'];
        
        // Jika tidak ada foto tersisa, update has_photo = 0
        if ($remaining == 0) {
            $stmt = $pdo->prepare("UPDATE $mainTable SET has_photo = 0 WHERE id = ?");
            $stmt->execute([$deviceId]);
        }
        
        // Jika foto yang dihapus adalah primary, jadikan foto lain sebagai primary
        if ($photo['is_primary'] && $remaining > 0) {
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
            $stmt = $pdo->prepare("
                UPDATE $photoTable 
                SET is_primary = 1 
                WHERE $idColumn = ? 
                ORDER BY id ASC 
                LIMIT 1
            ");
<<<<<<< HEAD
            $stmt->execute([$photo[$idColumn]]);
        }
        
        sendResponse(['message' => 'Foto berhasil dihapus']);
=======
            $stmt->execute([$deviceId]);
        }
        
        sendResponse(['message' => 'Foto berhasil dihapus', 'remaining_photos' => $remaining]);
>>>>>>> bd6fc695b17ca18c58fef33726a98132a135ac5b
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