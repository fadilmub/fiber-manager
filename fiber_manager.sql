-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 28, 2026 at 07:58 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fiber_manager`
--

-- --------------------------------------------------------

--
-- Table structure for table `login_logs`
--

CREATE TABLE `login_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `login_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `status` enum('success','failed') DEFAULT 'success'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(30) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `old_values` longtext DEFAULT NULL,
  `new_values` longtext DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  KEY `idx_activity_created_at` (`created_at`),
  KEY `idx_activity_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `odc`
--

CREATE TABLE `odc` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `lat` decimal(10,8) NOT NULL,
  `lng` decimal(11,8) NOT NULL,
  `location` varchar(255) NOT NULL,
  `capacity` int(11) NOT NULL DEFAULT 24,
  `used_ports` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `source_type` enum('pop','olt','pon') DEFAULT NULL,
  `source_id` int(11) DEFAULT NULL,
  `pon_id` int(11) DEFAULT NULL,
  `pon_port_number` int(11) DEFAULT NULL,
  `olt_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `path_coordinates` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `odc_odp_connections`
--

CREATE TABLE `odc_odp_connections` (
  `id` int(11) NOT NULL,
  `odc_id` int(11) NOT NULL,
  `odp_id` int(11) NOT NULL,
  `port_number` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `odc_photos`
--

CREATE TABLE `odc_photos` (
  `id` int(11) NOT NULL,
  `odc_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `odp`
--

CREATE TABLE `odp` (
  `id` int(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `source_id` int(11) DEFAULT NULL,
  `port_number_in_odc` int(11) DEFAULT NULL,
  `source_type` enum('odc','odp') DEFAULT NULL,
  `lat` decimal(10,8) NOT NULL,
  `lng` decimal(11,8) NOT NULL,
  `path_coordinates` longtext DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `total_ports` int(11) NOT NULL DEFAULT 8,
  `available_ports` int(11) NOT NULL DEFAULT 8,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `odp_photos`
--

CREATE TABLE `odp_photos` (
  `id` int(11) NOT NULL,
  `odp_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `odp_ports`
--

CREATE TABLE `odp_ports` (
  `id` int(11) NOT NULL,
  `odp_id` int(11) NOT NULL,
  `port_number` int(11) NOT NULL,
  `status` enum('available','used','maintenance') DEFAULT 'available',
  `target` varchar(255) DEFAULT NULL,
  `connection_type` enum('feeder','distribusi','drop') DEFAULT NULL,
  `target_port` int(11) DEFAULT NULL,
  `lat` decimal(10,8) DEFAULT NULL,
  `lng` decimal(11,8) DEFAULT NULL,
  `onu_number` varchar(50) DEFAULT NULL,
  `modem_type` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `has_photo` tinyint(1) DEFAULT 0,
  `path_coordinates` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `olt`
--

CREATE TABLE `olt` (
  `id` int(11) NOT NULL,
  `pop_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `model` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `management_port` int(11) DEFAULT 22,
  `total_ports` int(11) DEFAULT 16,
  `total_pon_ports` int(11) DEFAULT 16,
  `used_pon_ports` int(11) DEFAULT 0,
  `lat` decimal(10,8) DEFAULT NULL,
  `lng` decimal(11,8) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `has_photo` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `olt`
--

INSERT INTO `olt` (`id`, `pop_id`, `name`, `model`, `ip_address`, `management_port`, `total_ports`, `total_pon_ports`, `used_pon_ports`, `lat`, `lng`, `location`, `description`, `created_at`, `updated_at`, `has_photo`) VALUES
(1, 1, 'test', 'test', 'test', 22, 16, 4, 0, NULL, NULL, 'test', '', '2026-06-28 04:42:58', '2026-06-28 04:42:58', 0);

-- --------------------------------------------------------

--
-- Table structure for table `olt_photos`
--

CREATE TABLE `olt_photos` (
  `id` int(11) NOT NULL,
  `olt_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `olt_ports`
--

CREATE TABLE `olt_ports` (
  `id` int(11) NOT NULL,
  `olt_id` int(11) NOT NULL,
  `port_number` int(11) NOT NULL,
  `status` enum('available','used','maintenance') DEFAULT 'available',
  `target_odc_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pole`
--

CREATE TABLE `pole` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `lat` decimal(10,8) NOT NULL,
  `lng` decimal(11,8) NOT NULL,
  `location` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `jenis_tiang` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pon`
--

CREATE TABLE `pon` (
  `id` int(11) NOT NULL,
  `olt_id` int(11) NOT NULL,
  `card_number` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `port_count` int(11) DEFAULT 8,
  `status` enum('active','inactive','maintenance') DEFAULT 'active',
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pon`
--

INSERT INTO `pon` (`id`, `olt_id`, `card_number`, `name`, `port_count`, `status`, `description`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'PON Card 1', 4, 'active', NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(2, 1, 2, 'PON Card 2', 4, 'active', NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(3, 1, 3, 'PON Card 3', 4, 'active', NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(4, 1, 4, 'PON Card 4', 4, 'active', NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58');

-- --------------------------------------------------------

--
-- Table structure for table `pon_ports`
--

CREATE TABLE `pon_ports` (
  `id` int(11) NOT NULL,
  `pon_id` int(11) NOT NULL,
  `port_number` int(11) NOT NULL,
  `status` enum('available','used','maintenance') DEFAULT 'available',
  `target_odc_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pon_ports`
--

INSERT INTO `pon_ports` (`id`, `pon_id`, `port_number`, `status`, `target_odc_id`, `description`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'used', 2, NULL, '2026-06-28 04:42:58', '2026-06-28 05:31:03'),
(2, 1, 2, 'used', 3, NULL, '2026-06-28 04:42:58', '2026-06-28 05:40:36'),
(3, 1, 3, 'used', 4, NULL, '2026-06-28 04:42:58', '2026-06-28 05:55:12'),
(4, 1, 4, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(5, 2, 1, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(6, 2, 2, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(7, 2, 3, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(8, 2, 4, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(9, 3, 1, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(10, 3, 2, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(11, 3, 3, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(12, 3, 4, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(13, 4, 1, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(14, 4, 2, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(15, 4, 3, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58'),
(16, 4, 4, 'available', NULL, NULL, '2026-06-28 04:42:58', '2026-06-28 04:42:58');

-- --------------------------------------------------------

--
-- Table structure for table `pop`
--

CREATE TABLE `pop` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `lat` decimal(10,8) NOT NULL,
  `lng` decimal(11,8) NOT NULL,
  `location` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `has_photo` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pop`
--

INSERT INTO `pop` (`id`, `name`, `code`, `lat`, `lng`, `location`, `address`, `description`, `created_at`, `updated_at`, `has_photo`) VALUES
(1, 'test', 'test', -7.03273166, 109.59323988, 'test', 'test', 'tset', '2026-06-28 04:34:16', '2026-06-28 04:34:16', 0);

-- --------------------------------------------------------

--
-- Table structure for table `pop_photos`
--

CREATE TABLE `pop_photos` (
  `id` int(11) NOT NULL,
  `pop_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `port_photos`
--

CREATE TABLE `port_photos` (
  `id` int(11) NOT NULL,
  `port_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `role` enum('admin','operator','viewer') DEFAULT 'operator',
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `phone`, `email`, `notes`, `role`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', NULL, NULL, NULL, 'admin', 1, '2026-06-28 02:50:31', '2026-04-29 05:17:32', '2026-06-28 02:50:31'),
(2, 'operator', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Operator Lapangan', NULL, NULL, NULL, 'operator', 1, '2026-05-10 06:05:02', '2026-04-29 05:17:32', '2026-05-10 06:05:02'),
(3, 'viewer', '$2y$10$MGgSxghgkLq14k7q5jnA6u6nDAQ2YKcfdE/DkL/TOrvOvuTRz7S8m', 'Viewer Only', NULL, NULL, NULL, 'viewer', 1, '2026-06-16 08:05:32', '2026-04-29 05:17:32', '2026-06-16 08:05:32'),
(4, 'fadil', '$2y$10$bYKbB0u6c5WcTi7Vu12cauf0FxEtLpfhA03HFQf1RNf02N1IMplPm', 'fadilmubarok', '085878532124', 'ffadil2208@gmail.com', 'test', 'admin', 1, '2026-06-06 09:40:18', '2026-05-10 06:07:44', '2026-06-06 09:40:18');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `login_logs`
--
ALTER TABLE `login_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `odc`
--
ALTER TABLE `odc`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_source` (`source_type`,`source_id`);

--
-- Indexes for table `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_connection` (`odc_id`,`odp_id`),
  ADD KEY `odp_id` (`odp_id`);

--
-- Indexes for table `odc_photos`
--
ALTER TABLE `odc_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `odc_id` (`odc_id`);

--
-- Indexes for table `odp`
--
ALTER TABLE `odp`
  ADD PRIMARY KEY (`id`),
  ADD KEY `source_id` (`source_id`);

--
-- Indexes for table `odp_photos`
--
ALTER TABLE `odp_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `odp_id` (`odp_id`);

--
-- Indexes for table `odp_ports`
--
ALTER TABLE `odp_ports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_odp_port` (`odp_id`,`port_number`);

--
-- Indexes for table `olt`
--
ALTER TABLE `olt`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pop_id` (`pop_id`);

--
-- Indexes for table `olt_photos`
--
ALTER TABLE `olt_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `olt_id` (`olt_id`);

--
-- Indexes for table `olt_ports`
--
ALTER TABLE `olt_ports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_olt_port` (`olt_id`,`port_number`),
  ADD KEY `olt_id` (`olt_id`),
  ADD KEY `target_odc_id` (`target_odc_id`);

--
-- Indexes for table `pole`
--
ALTER TABLE `pole`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pole_name` (`name`);

--
-- Indexes for table `pon`
--
ALTER TABLE `pon`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_olt_card` (`olt_id`,`card_number`),
  ADD KEY `olt_id` (`olt_id`);

--
-- Indexes for table `pon_ports`
--
ALTER TABLE `pon_ports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_pon_port` (`pon_id`,`port_number`),
  ADD KEY `pon_id` (`pon_id`),
  ADD KEY `target_odc_id` (`target_odc_id`);

--
-- Indexes for table `pop`
--
ALTER TABLE `pop`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pop_photos`
--
ALTER TABLE `pop_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pop_id` (`pop_id`);

--
-- Indexes for table `port_photos`
--
ALTER TABLE `port_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `port_id` (`port_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `login_logs`
--
ALTER TABLE `login_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `odc`
--
ALTER TABLE `odc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `odc_photos`
--
ALTER TABLE `odc_photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `odp`
--
ALTER TABLE `odp`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `odp_photos`
--
ALTER TABLE `odp_photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `odp_ports`
--
ALTER TABLE `odp_ports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `olt`
--
ALTER TABLE `olt`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `olt_photos`
--
ALTER TABLE `olt_photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `olt_ports`
--
ALTER TABLE `olt_ports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pole`
--
ALTER TABLE `pole`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pon`
--
ALTER TABLE `pon`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `pon_ports`
--
ALTER TABLE `pon_ports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `pop`
--
ALTER TABLE `pop`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `pop_photos`
--
ALTER TABLE `pop_photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `port_photos`
--
ALTER TABLE `port_photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `login_logs`
--
ALTER TABLE `login_logs`
  ADD CONSTRAINT `login_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  ADD CONSTRAINT `odc_odp_connections_ibfk_1` FOREIGN KEY (`odc_id`) REFERENCES `odc` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `odc_odp_connections_ibfk_2` FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `odc_photos`
--
ALTER TABLE `odc_photos`
  ADD CONSTRAINT `odc_photos_ibfk_1` FOREIGN KEY (`odc_id`) REFERENCES `odc` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `odp`
--
ALTER TABLE `odp`
  ADD CONSTRAINT `odp_ibfk_1` FOREIGN KEY (`source_id`) REFERENCES `odc` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `odp_photos`
--
ALTER TABLE `odp_photos`
  ADD CONSTRAINT `odp_photos_ibfk_1` FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `odp_ports`
--
ALTER TABLE `odp_ports`
  ADD CONSTRAINT `odp_ports_ibfk_1` FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `olt`
--
ALTER TABLE `olt`
  ADD CONSTRAINT `olt_ibfk_1` FOREIGN KEY (`pop_id`) REFERENCES `pop` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `olt_photos`
--
ALTER TABLE `olt_photos`
  ADD CONSTRAINT `olt_photos_ibfk_1` FOREIGN KEY (`olt_id`) REFERENCES `olt` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `olt_ports`
--
ALTER TABLE `olt_ports`
  ADD CONSTRAINT `olt_ports_ibfk_1` FOREIGN KEY (`olt_id`) REFERENCES `olt` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `olt_ports_ibfk_2` FOREIGN KEY (`target_odc_id`) REFERENCES `odc` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pon`
--
ALTER TABLE `pon`
  ADD CONSTRAINT `pon_ibfk_1` FOREIGN KEY (`olt_id`) REFERENCES `olt` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pon_ports`
--
ALTER TABLE `pon_ports`
  ADD CONSTRAINT `pon_ports_ibfk_1` FOREIGN KEY (`pon_id`) REFERENCES `pon` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pon_ports_ibfk_2` FOREIGN KEY (`target_odc_id`) REFERENCES `odc` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pop_photos`
--
ALTER TABLE `pop_photos`
  ADD CONSTRAINT `pop_photos_ibfk_1` FOREIGN KEY (`pop_id`) REFERENCES `pop` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `port_photos`
--
ALTER TABLE `port_photos`
  ADD CONSTRAINT `port_photos_ibfk_1` FOREIGN KEY (`port_id`) REFERENCES `odp_ports` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
