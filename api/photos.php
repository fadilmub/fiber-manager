<?php
require_once 'config.php';

// Proteksi: harus login
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($method) {
    case 'GET':
        if (isset($_GET['device_type']) && isset($_GET['device_id'])) {
            getPhotos($_GET['device_type'], (int)$_GET['device_id']);
        } else {
            sendResponse(['error' => 'Device type and ID required'], 400);
        }
        break;
    case 'POST':
        // Upload foto: hanya admin dan operator
        checkRole(['admin', 'operator']);
        uploadPhoto();
        break;
    case 'DELETE':
        // Hapus foto: hanya admin dan operator
        checkRole(['admin', 'operator']);
        if (isset($_GET['id'])) {
            deletePhoto((int)$_GET['id']);
        } else {
            sendResponse(['error' => 'Photo ID required'], 400);
        }
        break;
    case 'PUT':
        // Set foto utama
        checkRole(['admin', 'operator']);
        if ($action === 'set-primary' && isset($_GET['id'])) {
            setPrimaryPhoto((int)$_GET['id']);
        } else {
            sendResponse(['error' => 'Invalid action'], 400);
        }
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

function getPhotos($deviceType, $deviceId) {
    global $pdo;
    
    if (!in_array($deviceType, ['odp', 'odc'])) {
        sendResponse(['error' => 'Invalid device type'], 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM device_photos 
            WHERE device_type = ? AND device_id = ? 
            ORDER BY is_primary DESC, created_at DESC
        ");
        $stmt->execute([$deviceType, $deviceId]);
        $photos = $stmt->fetchAll();
        
        // Tambahkan URL lengkap untuk setiap foto
        foreach ($photos as &$photo) {
            $photo['url'] = getBaseUrl() . '/' . $photo['file_path'];
        }
        
        sendResponse(['photos' => $photos]);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function uploadPhoto() {
    global $pdo;
    
    // Validasi file upload
    if (!isset($_FILES['photo'])) {
        sendResponse(['error' => 'Tidak ada file yang diupload'], 400);
    }
    
    $deviceType = $_POST['device_type'] ?? '';
    $deviceId = isset($_POST['device_id']) ? (int)$_POST['device_id'] : 0;
    
    if (!in_array($deviceType, ['odp', 'odc'])) {
        sendResponse(['error' => 'Invalid device type'], 400);
    }
    
    if ($deviceId <= 0) {
        sendResponse(['error' => 'Invalid device ID'], 400);
    }
    
    $file = $_FILES['photo'];
    $fileName = $file['name'];
    $fileTmp = $file['tmp_name'];
    $fileSize = $file['size'];
    $fileError = $file['error'];
    $fileType = $file['type'];
    
    // Validasi error upload
    if ($fileError !== UPLOAD_ERR_OK) {
        sendResponse(['error' => 'Upload gagal dengan error code: ' . $fileError], 400);
    }
    
    // Validasi tipe file
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($fileType, $allowedTypes)) {
        sendResponse(['error' => 'Tipe file tidak diizinkan. Gunakan JPG, PNG, GIF, atau WebP'], 400);
    }
    
    // Validasi ukuran (max 5MB)
    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($fileSize > $maxSize) {
        sendResponse(['error' => 'Ukuran file terlalu besar. Maksimal 5MB'], 400);
    }
    
    // Generate unique filename
    $extension = pathinfo($fileName, PATHINFO_EXTENSION);
    $uniqueName = uniqid($deviceType . '_') . '_' . time() . '.' . $extension;
    
    // Tentukan folder upload
    $uploadDir = __DIR__ . '/../uploads/' . $deviceType . '/';
    
    // Buat folder jika belum ada
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $uploadPath = $uploadDir . $uniqueName;
    
    // Pindahkan file
    if (!move_uploaded_file($fileTmp, $uploadPath)) {
        sendResponse(['error' => 'Gagal menyimpan file'], 500);
    }
    
    // Generate thumbnail (opsional - resize gambar)
    createThumbnail($uploadPath, $fileType, 800); // Max width 800px
    
    // Path relatif untuk database
    $relativePath = 'uploads/' . $deviceType . '/' . $uniqueName;
    
    // Cek apakah ini foto pertama (jadikan primary)
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM device_photos WHERE device_type = ? AND device_id = ?");
    $stmt->execute([$deviceType, $deviceId]);
    $count = $stmt->fetch()['count'];
    $isPrimary = ($count == 0) ? 1 : 0;
    
    try {
        $pdo->beginTransaction();
        
        // Jika ini foto primary, reset primary lainnya
        if ($isPrimary) {
            $stmt = $pdo->prepare("UPDATE device_photos SET is_primary = 0 WHERE device_type = ? AND device_id = ?");
            $stmt->execute([$deviceType, $deviceId]);
        }
        
        // Insert ke database
        $stmt = $pdo->prepare("
            INSERT INTO device_photos (device_type, device_id, file_name, original_name, file_path, file_size, mime_type, is_primary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $deviceType,
            $deviceId,
            $uniqueName,
            $fileName,
            $relativePath,
            $fileSize,
            $fileType,
            $isPrimary
        ]);
        
        $photoId = $pdo->lastInsertId();
        
        $pdo->commit();
        
        sendResponse([
            'message' => 'Foto berhasil diupload',
            'photo' => [
                'id' => $photoId,
                'url' => getBaseUrl() . '/' . $relativePath,
                'is_primary' => $isPrimary
            ]
        ]);
    } catch(PDOException $e) {
        $pdo->rollBack();
        // Hapus file jika gagal insert
        unlink($uploadPath);
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function deletePhoto($id) {
    global $pdo;
    
    try {
        // Ambil info foto
        $stmt = $pdo->prepare("SELECT * FROM device_photos WHERE id = ?");
        $stmt->execute([$id]);
        $photo = $stmt->fetch();
        
        if (!$photo) {
            sendResponse(['error' => 'Foto tidak ditemukan'], 404);
        }
        
        // Hapus file fisik
        $filePath = __DIR__ . '/../' . $photo['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        // Hapus dari database
        $stmt = $pdo->prepare("DELETE FROM device_photos WHERE id = ?");
        $stmt->execute([$id]);
        
        // Jika foto yang dihapus adalah primary, set foto lain sebagai primary
        if ($photo['is_primary']) {
            $stmt = $pdo->prepare("
                SELECT id FROM device_photos 
                WHERE device_type = ? AND device_id = ? 
                ORDER BY created_at ASC 
                LIMIT 1
            ");
            $stmt->execute([$photo['device_type'], $photo['device_id']]);
            $newPrimary = $stmt->fetch();
            
            if ($newPrimary) {
                $stmt = $pdo->prepare("UPDATE device_photos SET is_primary = 1 WHERE id = ?");
                $stmt->execute([$newPrimary['id']]);
            }
        }
        
        sendResponse(['message' => 'Foto berhasil dihapus']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

function setPrimaryPhoto($id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM device_photos WHERE id = ?");
        $stmt->execute([$id]);
        $photo = $stmt->fetch();
        
        if (!$photo) {
            sendResponse(['error' => 'Foto tidak ditemukan'], 404);
        }
        
        // Reset semua primary untuk device ini
        $stmt = $pdo->prepare("UPDATE device_photos SET is_primary = 0 WHERE device_type = ? AND device_id = ?");
        $stmt->execute([$photo['device_type'], $photo['device_id']]);
        
        // Set foto ini sebagai primary
        $stmt = $pdo->prepare("UPDATE device_photos SET is_primary = 1 WHERE id = ?");
        $stmt->execute([$id]);
        
        sendResponse(['message' => 'Foto utama berhasil diubah']);
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

// Helper function: buat thumbnail/resize
function createThumbnail($filePath, $mimeType, $maxWidth = 800) {
    // Cek apakah GD library tersedia
    if (!extension_loaded('gd')) {
        return false;
    }
    
    // Get image dimensions
    list($width, $height) = getimagesize($filePath);
    
    // Jika gambar sudah lebih kecil dari maxWidth, skip
    if ($width <= $maxWidth) {
        return true;
    }
    
    // Calculate new dimensions
    $newWidth = $maxWidth;
    $newHeight = ($height / $width) * $maxWidth;
    
    // Create new image
    $newImage = imagecreatetruecolor($newWidth, $newHeight);
    
    // Load original image based on type
    switch ($mimeType) {
        case 'image/jpeg':
        case 'image/jpg':
            $oldImage = imagecreatefromjpeg($filePath);
            break;
        case 'image/png':
            $oldImage = imagecreatefrompng($filePath);
            imagealphablending($newImage, false);
            imagesavealpha($newImage, true);
            break;
        case 'image/gif':
            $oldImage = imagecreatefromgif($filePath);
            break;
        case 'image/webp':
            if (function_exists('imagecreatefromwebp')) {
                $oldImage = imagecreatefromwebp($filePath);
            } else {
                return false;
            }
            break;
        default:
            return false;
    }
    
    // Resize
    imagecopyresampled($newImage, $oldImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    
    // Save resized image (overwrite original)
    switch ($mimeType) {
        case 'image/jpeg':
        case 'image/jpg':
            imagejpeg($newImage, $filePath, 85);
            break;
        case 'image/png':
            imagepng($newImage, $filePath, 8);
            break;
        case 'image/gif':
            imagegif($newImage, $filePath);
            break;
        case 'image/webp':
            if (function_exists('imagewebp')) {
                imagewebp($newImage, $filePath, 85);
            }
            break;
    }
    
    // Clean up
    imagedestroy($oldImage);
    imagedestroy($newImage);
    
    return true;
}

// Helper: get base URL
function getBaseUrl() {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'];
    $path = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    // Remove 'api' from path
    $path = str_replace('/api', '', $path);
    return $protocol . $host . $path;
}
?>