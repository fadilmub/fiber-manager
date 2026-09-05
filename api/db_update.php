<?php
require_once 'config.php';

try {
    // ==================== 1. UPDATE EXISTING TABLES ====================
    
    // Update odp_ports table - add new columns
    $sql1 = "ALTER TABLE `odp_ports` 
             ADD COLUMN IF NOT EXISTS `target` VARCHAR(255) NULL DEFAULT NULL AFTER `port_number`,
             ADD COLUMN IF NOT EXISTS `connection_type` ENUM('feeder','distribusi','drop') NULL DEFAULT NULL AFTER `target`,
             ADD COLUMN IF NOT EXISTS `target_port` INT(11) NULL DEFAULT NULL AFTER `connection_type`,
             ADD COLUMN IF NOT EXISTS `lat` DECIMAL(10,8) NULL DEFAULT NULL AFTER `target_port`,
             ADD COLUMN IF NOT EXISTS `lng` DECIMAL(11,8) NULL DEFAULT NULL AFTER `lat`,
             ADD COLUMN IF NOT EXISTS `onu_number` VARCHAR(50) NULL DEFAULT NULL AFTER `lng`,
             ADD COLUMN IF NOT EXISTS `modem_type` VARCHAR(100) NULL DEFAULT NULL AFTER `onu_number`,
             ADD COLUMN IF NOT EXISTS `description` TEXT NULL DEFAULT NULL AFTER `modem_type`,
             ADD COLUMN IF NOT EXISTS `has_photo` TINYINT(1) DEFAULT 0 AFTER `description`,
             ADD COLUMN IF NOT EXISTS `path_coordinates` TEXT NULL DEFAULT NULL AFTER `has_photo`";
             
    $pdo->exec($sql1);
    echo "✓ odp_ports table updated successfully.\n";

    // Update odc table - add missing columns
    $sql2 = "ALTER TABLE `odc` 
             ADD COLUMN IF NOT EXISTS `path_coordinates` LONGTEXT NULL DEFAULT NULL AFTER `updated_at`";
    $pdo->exec($sql2);
    echo "✓ odc table updated successfully.\n";

    // Update odp table - add missing columns
    $sql3 = "ALTER TABLE `odp` 
             ADD COLUMN IF NOT EXISTS `path_coordinates` LONGTEXT NULL DEFAULT NULL AFTER `lng`,
             ADD COLUMN IF NOT EXISTS `source_type` ENUM('odc','odp') NULL DEFAULT NULL AFTER `port_number_in_odc`,
             ADD COLUMN IF NOT EXISTS `port_number_in_odc` INT(11) NULL DEFAULT NULL AFTER `source_id`";
    $pdo->exec($sql3);
    echo "✓ odp table updated successfully.\n";

    // Update olt table - add missing columns
    $sql4 = "ALTER TABLE `olt` 
             ADD COLUMN IF NOT EXISTS `has_photo` TINYINT(1) DEFAULT 0 AFTER `updated_at`";
    $pdo->exec($sql4);
    echo "✓ olt table updated successfully.\n";

    // Update pop table - add missing columns
    $sql5 = "ALTER TABLE `pop` 
             ADD COLUMN IF NOT EXISTS `has_photo` TINYINT(1) DEFAULT 0 AFTER `updated_at`";
    $pdo->exec($sql5);
    echo "✓ pop table updated successfully.\n";

    // Update pole table - add jenis_tiang column if not exists
    $sql_pole = "ALTER TABLE `pole`
          ADD COLUMN IF NOT EXISTS `jenis_tiang` VARCHAR(50) DEFAULT NULL AFTER `lng`";
    $pdo->exec($sql_pole);
    echo "✓ pole table updated successfully (jenis_tiang).\n";

    // ==================== 2. CREATE NEW TABLES ====================

    // Create port_photos table
    $sql6 = "CREATE TABLE IF NOT EXISTS `port_photos` (
              `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
              `port_id` int(11) NOT NULL,
              `filename` varchar(255) NOT NULL,
              `original_name` varchar(255) NOT NULL,
              `file_size` int(11) NOT NULL,
              `is_primary` tinyint(1) DEFAULT 0,
              `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
              FOREIGN KEY (`port_id`) REFERENCES `odp_ports` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    $pdo->exec($sql6);
    echo "✓ port_photos table created successfully.\n";

    // Create odc_odp_connections table if not exists
    $sql7 = "CREATE TABLE IF NOT EXISTS `odc_odp_connections` (
              `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
              `odc_id` int(11) NOT NULL,
              `odp_id` int(11) NOT NULL,
              `port_number` int(11) DEFAULT NULL,
              `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
              UNIQUE KEY `unique_connection` (`odc_id`,`odp_id`),
              FOREIGN KEY (`odc_id`) REFERENCES `odc` (`id`) ON DELETE CASCADE,
              FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    $pdo->exec($sql7);
    echo "✓ odc_odp_connections table created successfully.\n";

    // Create login_logs table if not exists
    $sql8 = "CREATE TABLE IF NOT EXISTS `login_logs` (
              `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
              `user_id` int(11) NOT NULL,
              `login_time` timestamp NOT NULL DEFAULT current_timestamp(),
              `ip_address` varchar(45) DEFAULT NULL,
              `user_agent` text DEFAULT NULL,
              `status` enum('success','failed') DEFAULT 'success',
              FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    $pdo->exec($sql8);
    echo "✓ login_logs table created successfully.\n";

    $sql_activity = "CREATE TABLE IF NOT EXISTS `activity_logs` (
              `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
              `user_id` int(11) DEFAULT NULL,
              `action` varchar(30) NOT NULL,
              `entity_type` varchar(50) NOT NULL,
              `entity_id` int(11) DEFAULT NULL,
              `description` varchar(255) DEFAULT NULL,
              `old_values` LONGTEXT DEFAULT NULL,
              `new_values` LONGTEXT DEFAULT NULL,
              `ip_address` varchar(45) DEFAULT NULL,
              `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
              INDEX `idx_activity_created_at` (`created_at`),
              INDEX `idx_activity_entity` (`entity_type`, `entity_id`),
              FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    $pdo->exec($sql_activity);
    echo "✓ activity_logs table created successfully.\n";

    // ==================== 3. VERIFY DATA INTEGRITY ====================
    
    // Check if users table has default admin account
    $checkUser = $pdo->query("SELECT COUNT(*) FROM users WHERE username = 'admin'");
    $adminExists = $checkUser->fetchColumn();
    
    if (!$adminExists) {
        $hashedPassword = password_hash('admin123', PASSWORD_DEFAULT);
        $sql9 = "INSERT INTO `users` (`username`, `password`, `full_name`, `role`, `is_active`) 
                 VALUES ('admin', '$hashedPassword', 'Administrator', 'admin', 1)";
        $pdo->exec($sql9);
        echo "✓ Default admin account created (username: admin, password: admin123)\n";
    }

    // ==================== 4. DISPLAY SUMMARY ====================
    
    echo "\n========================================\n";
    echo "DATABASE UPDATE COMPLETED SUCCESSFULLY!\n";
    echo "========================================\n";
    echo "Tables verified/updated:\n";
    echo "  - odp_ports (enhanced)\n";
    echo "  - odc (enhanced)\n";
    echo "  - odp (enhanced)\n";
    echo "  - olt (enhanced)\n";
    echo "  - pop (enhanced)\n";
    echo "  - port_photos (new)\n";
    echo "  - odc_odp_connections (new)\n";
    echo "  - login_logs (new)\n";
    echo "========================================\n";

} catch (PDOException $e) {
    die("Database Error: " . $e->getMessage() . "\n");
}
?>