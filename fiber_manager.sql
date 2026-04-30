-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 30, 2026 at 03:04 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

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

--
-- Dumping data for table `login_logs`
--

INSERT INTO `login_logs` (`id`, `user_id`, `login_time`, `ip_address`, `user_agent`, `status`) VALUES
(1, 1, '2026-04-30 00:36:58', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'success'),
(2, 1, '2026-04-30 00:38:51', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'failed'),
(3, 1, '2026-04-30 00:38:59', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'success'),
(4, 1, '2026-04-30 00:58:16', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'success');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `odc`
--

INSERT INTO `odc` (`id`, `name`, `lat`, `lng`, `location`, `capacity`, `used_ports`, `description`, `created_at`, `updated_at`) VALUES
(1, 'ODC 1', -6.97580363, 109.65916103, 'test', 16, 5, 'test', '2026-04-23 12:19:32', '2026-04-23 15:24:16');

-- --------------------------------------------------------

--
-- Table structure for table `odc_odp_connections`
--

CREATE TABLE `odc_odp_connections` (
  `id` int(11) NOT NULL,
  `odc_id` int(11) NOT NULL,
  `odp_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `odc_odp_connections`
--

INSERT INTO `odc_odp_connections` (`id`, `odc_id`, `odp_id`, `created_at`) VALUES
(15, 1, 4, '2026-04-23 15:10:06'),
(16, 1, 2, '2026-04-23 15:10:31'),
(23, 1, 6, '2026-04-23 15:17:11'),
(25, 1, 5, '2026-04-23 15:18:53'),
(26, 1, 3, '2026-04-23 15:24:16');

-- --------------------------------------------------------

--
-- Table structure for table `odp`
--

CREATE TABLE `odp` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `source_id` int(11) DEFAULT NULL,
  `source_type` enum('odc','odp') DEFAULT NULL,
  `lat` decimal(10,8) NOT NULL,
  `lng` decimal(11,8) NOT NULL,
  `location` varchar(255) NOT NULL,
  `total_ports` int(11) NOT NULL DEFAULT 8,
  `available_ports` int(11) NOT NULL DEFAULT 8,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `odp`
--

INSERT INTO `odp` (`id`, `name`, `source_id`, `source_type`, `lat`, `lng`, `location`, `total_ports`, `available_ports`, `description`, `created_at`, `updated_at`) VALUES
(2, 'ODP 2', 1, 'odc', -6.98245253, 109.66168935, 'test', 8, 7, 'test', '2026-04-23 12:21:37', '2026-04-23 12:32:45'),
(3, 'ODP 1', 1, 'odc', -6.97877441, 109.66084820, 'asfdsa', 8, 6, 'asdf', '2026-04-23 12:30:49', '2026-04-23 15:24:13'),
(4, 'odp 3', 1, 'odc', -6.96459100, 109.64857756, 'test', 8, 7, 'test', '2026-04-23 12:39:09', '2026-04-23 14:53:41'),
(5, 'odp 4', 1, 'odc', -6.99332583, 109.62527883, 'asfd', 16, 15, 'asdf', '2026-04-23 12:51:42', '2026-04-23 15:18:53'),
(6, 'odp 4', 1, 'odc', -6.98958559, 109.63618694, 'asdf', 4, 1, 'asdf', '2026-04-23 13:16:47', '2026-04-23 15:18:15');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `odp_ports`
--

INSERT INTO `odp_ports` (`id`, `odp_id`, `port_number`, `status`, `target`, `connection_type`, `target_port`, `created_at`, `updated_at`) VALUES
(9, 2, 1, 'used', 'siti', 'drop', 6, '2026-04-23 12:21:37', '2026-04-23 12:32:45'),
(10, 2, 2, 'available', NULL, NULL, NULL, '2026-04-23 12:21:37', '2026-04-23 12:21:37'),
(11, 2, 3, 'available', NULL, NULL, NULL, '2026-04-23 12:21:37', '2026-04-23 12:21:37'),
(12, 2, 4, 'available', NULL, NULL, NULL, '2026-04-23 12:21:37', '2026-04-23 12:21:37'),
(13, 2, 5, 'available', NULL, NULL, NULL, '2026-04-23 12:21:37', '2026-04-23 12:21:37'),
(14, 2, 6, 'available', NULL, NULL, NULL, '2026-04-23 12:21:37', '2026-04-23 12:21:37'),
(15, 2, 7, 'available', NULL, NULL, NULL, '2026-04-23 12:21:37', '2026-04-23 12:21:37'),
(16, 2, 8, 'available', NULL, NULL, NULL, '2026-04-23 12:21:37', '2026-04-23 12:21:37'),
(17, 3, 1, 'used', 'jono', 'drop', 1, '2026-04-23 12:30:49', '2026-04-23 12:31:07'),
(18, 3, 2, 'used', 'yeni', 'drop', NULL, '2026-04-23 12:30:49', '2026-04-23 15:24:13'),
(19, 3, 3, 'available', NULL, NULL, NULL, '2026-04-23 12:30:49', '2026-04-23 12:30:49'),
(20, 3, 4, 'available', NULL, NULL, NULL, '2026-04-23 12:30:49', '2026-04-23 12:30:49'),
(21, 3, 5, 'available', NULL, NULL, NULL, '2026-04-23 12:30:49', '2026-04-23 12:30:49'),
(22, 3, 6, 'available', NULL, NULL, NULL, '2026-04-23 12:30:49', '2026-04-23 12:30:49'),
(23, 3, 7, 'available', NULL, NULL, NULL, '2026-04-23 12:30:49', '2026-04-23 12:30:49'),
(24, 3, 8, 'available', NULL, NULL, NULL, '2026-04-23 12:30:49', '2026-04-23 12:30:49'),
(25, 4, 1, 'available', NULL, NULL, NULL, '2026-04-23 12:39:09', '2026-04-23 12:39:09'),
(26, 4, 2, 'available', NULL, NULL, NULL, '2026-04-23 12:39:09', '2026-04-23 12:39:09'),
(27, 4, 3, 'available', NULL, NULL, NULL, '2026-04-23 12:39:09', '2026-04-23 12:39:09'),
(28, 4, 4, 'used', 'yeni', 'drop', NULL, '2026-04-23 12:39:09', '2026-04-23 14:53:41'),
(29, 4, 5, 'available', NULL, NULL, NULL, '2026-04-23 12:39:09', '2026-04-23 12:39:09'),
(30, 4, 6, 'available', NULL, NULL, NULL, '2026-04-23 12:39:09', '2026-04-23 12:39:09'),
(31, 4, 7, 'available', NULL, NULL, NULL, '2026-04-23 12:39:09', '2026-04-23 12:39:09'),
(32, 4, 8, 'available', NULL, NULL, NULL, '2026-04-23 12:39:09', '2026-04-23 12:39:09'),
(33, 5, 1, 'used', 'yanti', 'drop', NULL, '2026-04-23 12:51:42', '2026-04-23 14:32:12'),
(34, 5, 2, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(35, 5, 3, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(36, 5, 4, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(37, 5, 5, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(38, 5, 6, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(39, 5, 7, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(40, 5, 8, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(41, 5, 9, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(42, 5, 10, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(43, 5, 11, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(44, 5, 12, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(45, 5, 13, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(46, 5, 14, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(47, 5, 15, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(48, 5, 16, 'available', NULL, NULL, NULL, '2026-04-23 12:51:42', '2026-04-23 12:51:42'),
(49, 6, 1, 'used', 'yuli', 'drop', NULL, '2026-04-23 13:16:47', '2026-04-23 14:56:57'),
(50, 6, 2, 'used', 'yanto', 'drop', NULL, '2026-04-23 13:16:47', '2026-04-23 13:56:01'),
(51, 6, 3, 'used', 'yaya', 'drop', NULL, '2026-04-23 13:16:47', '2026-04-23 15:09:27'),
(52, 6, 4, 'used', 'yiyi', 'drop', NULL, '2026-04-23 13:16:47', '2026-04-23 15:09:31'),
(53, 6, 5, 'available', NULL, NULL, NULL, '2026-04-23 13:16:47', '2026-04-23 15:18:15');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('admin','operator','viewer') DEFAULT 'operator',
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `role`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin', 1, '2026-04-30 00:58:15', '2026-04-29 12:17:32', '2026-04-30 00:58:15'),
(2, 'operator', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Operator Lapangan', 'operator', 1, NULL, '2026-04-29 12:17:32', '2026-04-29 12:17:32'),
(3, 'viewer', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Viewer Only', 'viewer', 1, NULL, '2026-04-29 12:17:32', '2026-04-29 12:17:32');

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
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_connection` (`odc_id`,`odp_id`),
  ADD KEY `odp_id` (`odp_id`);

--
-- Indexes for table `odp`
--
ALTER TABLE `odp`
  ADD PRIMARY KEY (`id`),
  ADD KEY `source_id` (`source_id`);

--
-- Indexes for table `odp_ports`
--
ALTER TABLE `odp_ports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_odp_port` (`odp_id`,`port_number`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `odc`
--
ALTER TABLE `odc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `odp`
--
ALTER TABLE `odp`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `odp_ports`
--
ALTER TABLE `odp_ports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
-- Constraints for table `odp`
--
ALTER TABLE `odp`
  ADD CONSTRAINT `odp_ibfk_1` FOREIGN KEY (`source_id`) REFERENCES `odc` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `odp_ports`
--
ALTER TABLE `odp_ports`
  ADD CONSTRAINT `odp_ports_ibfk_1` FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
