-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 15 Bulan Mei 2026 pada 10.04
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.1.25

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
-- Struktur dari tabel `login_logs`
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
-- Dumping data untuk tabel `login_logs`
--

INSERT INTO `login_logs` (`id`, `user_id`, `login_time`, `ip_address`, `user_agent`, `status`) VALUES
(1, 1, '2026-04-30 00:36:58', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'success'),
(2, 1, '2026-04-30 00:38:51', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'failed'),
(3, 1, '2026-04-30 00:38:59', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'success'),
(4, 1, '2026-04-30 00:58:16', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'success'),
(5, 1, '2026-05-09 11:15:05', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(6, 1, '2026-05-09 11:30:26', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'success'),
(7, 1, '2026-05-09 11:30:34', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'success'),
(8, 1, '2026-05-09 11:30:57', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'success'),
(9, 1, '2026-05-09 11:31:25', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'success'),
(10, 1, '2026-05-09 11:31:37', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'success'),
(11, 1, '2026-05-09 11:32:54', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'failed'),
(12, 1, '2026-05-09 11:33:00', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'failed'),
(13, 1, '2026-05-09 11:33:03', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'success'),
(14, 1, '2026-05-10 12:57:37', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(15, 1, '2026-05-10 12:57:42', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(16, 1, '2026-05-10 13:03:35', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(17, 2, '2026-05-10 13:05:02', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(18, 3, '2026-05-10 13:05:14', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(19, 3, '2026-05-10 13:05:19', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(20, 3, '2026-05-10 13:05:22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(21, 1, '2026-05-10 13:06:54', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(22, 4, '2026-05-10 13:08:07', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(23, 4, '2026-05-10 13:08:14', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(24, 1, '2026-05-10 13:08:26', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(25, 4, '2026-05-10 13:09:30', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(26, 3, '2026-05-10 13:14:09', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(27, 4, '2026-05-15 03:13:00', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(28, 4, '2026-05-15 03:13:04', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(29, 4, '2026-05-15 03:13:06', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(30, 4, '2026-05-15 03:13:10', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(31, 4, '2026-05-15 03:13:15', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(32, 4, '2026-05-15 03:13:19', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'failed'),
(33, 1, '2026-05-15 03:13:26', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(34, 1, '2026-05-15 03:55:19', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 'success'),
(35, 4, '2026-05-15 08:01:22', '192.168.32.46', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36', 'success');

-- --------------------------------------------------------

--
-- Struktur dari tabel `odc`
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
-- Dumping data untuk tabel `odc`
--

INSERT INTO `odc` (`id`, `name`, `lat`, `lng`, `location`, `capacity`, `used_ports`, `description`, `created_at`, `updated_at`) VALUES
(1, 'ODC 1', -6.97580363, 109.65916103, 'test', 16, 6, 'test', '2026-04-23 12:19:32', '2026-05-15 04:51:45');

-- --------------------------------------------------------

--
-- Struktur dari tabel `odc_odp_connections`
--

CREATE TABLE `odc_odp_connections` (
  `id` int(11) NOT NULL,
  `odc_id` int(11) NOT NULL,
  `odp_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `odc_odp_connections`
--

INSERT INTO `odc_odp_connections` (`id`, `odc_id`, `odp_id`, `created_at`) VALUES
(15, 1, 4, '2026-04-23 15:10:06'),
(16, 1, 2, '2026-04-23 15:10:31'),
(23, 1, 6, '2026-04-23 15:17:11'),
(25, 1, 5, '2026-04-23 15:18:53'),
(26, 1, 3, '2026-04-23 15:24:16'),
(29, 1, 7, '2026-05-15 04:51:45');

-- --------------------------------------------------------

--
-- Struktur dari tabel `odc_photos`
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

--
-- Dumping data untuk tabel `odc_photos`
--

INSERT INTO `odc_photos` (`id`, `odc_id`, `filename`, `original_name`, `file_size`, `is_primary`, `created_at`) VALUES
(1, 1, 'odc_1_1778817358_6a06994eeac1a.jpeg', 'WhatsApp Image 2026-05-05 at 11.22.43.jpeg', 310615, 1, '2026-05-15 03:55:58'),
(2, 1, 'odc_1_1778817359_6a06994f03924.jpeg', 'WhatsApp Image 2026-05-05 at 11.22.19.jpeg', 378714, 0, '2026-05-15 03:55:59'),
(3, 1, 'odc_1_1778817359_6a06994f0e017.jpeg', 'WhatsApp Image 2026-05-05 at 11.21.57.jpeg', 367123, 0, '2026-05-15 03:55:59'),
(4, 1, 'odc_1_1778817359_6a06994f2833b.png', 'ISOLIR & MAINTENANCE (8).png', 252182, 0, '2026-05-15 03:55:59'),
(5, 1, 'odc_1_1778817359_6a06994f302b0.png', 'ISOLIR & MAINTENANCE (7).png', 249787, 0, '2026-05-15 03:55:59');

-- --------------------------------------------------------

--
-- Struktur dari tabel `odp`
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
-- Dumping data untuk tabel `odp`
--

INSERT INTO `odp` (`id`, `name`, `source_id`, `source_type`, `lat`, `lng`, `location`, `total_ports`, `available_ports`, `description`, `created_at`, `updated_at`) VALUES
(2, 'ODP 2', 1, 'odc', -6.98245253, 109.66168935, 'test', 8, 7, 'test', '2026-04-23 12:21:37', '2026-04-23 12:32:45'),
(3, 'ODP 1', 1, 'odc', -6.97877441, 109.66084820, 'asfdsa', 8, 6, 'asdf', '2026-04-23 12:30:49', '2026-04-23 15:24:13'),
(4, 'odp 3', 1, 'odc', -6.96459100, 109.64857756, 'test', 8, 7, 'test', '2026-04-23 12:39:09', '2026-04-23 14:53:41'),
(5, 'odp 4', 1, 'odc', -6.99332583, 109.62527883, 'asfd', 16, 15, 'asdf', '2026-04-23 12:51:42', '2026-04-23 15:18:53'),
(6, 'odp 4', 1, 'odc', -6.98958559, 109.63618694, 'asdf', 4, 1, 'asdf', '2026-04-23 13:16:47', '2026-04-23 15:18:15'),
(7, 'odp', 1, 'odc', -6.96055146, 109.65533203, '-6.960551455441808, 109.65533203142573', 8, 1, '', '2026-05-10 13:06:06', '2026-05-15 04:52:22');

-- --------------------------------------------------------

--
-- Struktur dari tabel `odp_photos`
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

--
-- Dumping data untuk tabel `odp_photos`
--

INSERT INTO `odp_photos` (`id`, `odp_id`, `filename`, `original_name`, `file_size`, `is_primary`, `created_at`) VALUES
(1, 7, 'odp_7_1778817383_6a069967a93be.jpeg', 'WhatsApp Image 2026-05-04 at 11.11.34.jpeg', 119163, 1, '2026-05-15 03:56:23'),
(2, 7, 'odp_7_1778817383_6a069967b8a09.png', 'ISOLIR & MAINTENANCE (6).png', 197225, 0, '2026-05-15 03:56:23'),
(3, 7, 'odp_7_1778817383_6a069967c11e2.jpeg', 'WhatsApp Image 2026-05-03 at 19.15.14.jpeg', 89117, 0, '2026-05-15 03:56:23'),
(4, 7, 'odp_7_1778817383_6a069967dd50e.jpeg', 'WhatsApp Image 2026-05-03 at 19.11.18.jpeg', 75535, 0, '2026-05-15 03:56:23');

-- --------------------------------------------------------

--
-- Struktur dari tabel `odp_ports`
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
-- Dumping data untuk tabel `odp_ports`
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
(53, 6, 5, 'available', NULL, NULL, NULL, '2026-04-23 13:16:47', '2026-04-23 15:18:15'),
(71, 7, 1, 'used', 'anto', 'drop', NULL, '2026-05-10 13:06:06', '2026-05-15 04:51:17'),
(72, 7, 2, 'used', 'anti', 'drop', NULL, '2026-05-10 13:06:06', '2026-05-15 04:51:22'),
(73, 7, 3, 'used', 'andi', 'drop', NULL, '2026-05-10 13:06:06', '2026-05-15 04:51:26'),
(74, 7, 4, 'used', 'aris', 'drop', NULL, '2026-05-10 13:06:06', '2026-05-15 04:51:32'),
(75, 7, 5, 'used', 'ami', 'drop', NULL, '2026-05-10 13:06:06', '2026-05-15 04:51:36'),
(76, 7, 6, 'used', 'andi', 'drop', NULL, '2026-05-10 13:06:06', '2026-05-15 04:51:42'),
(77, 7, 7, 'used', 'andi', 'drop', NULL, '2026-05-10 13:06:06', '2026-05-15 04:52:07'),
(78, 7, 8, 'available', NULL, NULL, NULL, '2026-05-10 13:06:06', '2026-05-15 04:52:22');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
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
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `phone`, `email`, `notes`, `role`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', NULL, NULL, NULL, 'admin', 1, '2026-05-15 03:55:19', '2026-04-29 12:17:32', '2026-05-15 03:55:19'),
(2, 'operator', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Operator Lapangan', NULL, NULL, NULL, 'operator', 1, '2026-05-10 13:05:02', '2026-04-29 12:17:32', '2026-05-10 13:05:02'),
(3, 'viewer', '$2y$10$MGgSxghgkLq14k7q5jnA6u6nDAQ2YKcfdE/DkL/TOrvOvuTRz7S8m', 'Viewer Only', NULL, NULL, NULL, 'viewer', 1, '2026-05-10 13:14:09', '2026-04-29 12:17:32', '2026-05-15 08:01:07'),
(4, 'fadil', '$2y$10$bYKbB0u6c5WcTi7Vu12cauf0FxEtLpfhA03HFQf1RNf02N1IMplPm', 'fadilmubarok', '085878532124', 'ffadil2208@gmail.com', 'test', 'admin', 1, '2026-05-15 08:01:22', '2026-05-10 13:07:44', '2026-05-15 08:01:22');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `login_logs`
--
ALTER TABLE `login_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `odc`
--
ALTER TABLE `odc`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_connection` (`odc_id`,`odp_id`),
  ADD KEY `odp_id` (`odp_id`);

--
-- Indeks untuk tabel `odc_photos`
--
ALTER TABLE `odc_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `odc_id` (`odc_id`);

--
-- Indeks untuk tabel `odp`
--
ALTER TABLE `odp`
  ADD PRIMARY KEY (`id`),
  ADD KEY `source_id` (`source_id`);

--
-- Indeks untuk tabel `odp_photos`
--
ALTER TABLE `odp_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `odp_id` (`odp_id`);

--
-- Indeks untuk tabel `odp_ports`
--
ALTER TABLE `odp_ports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_odp_port` (`odp_id`,`port_number`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `login_logs`
--
ALTER TABLE `login_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT untuk tabel `odc`
--
ALTER TABLE `odc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT untuk tabel `odc_photos`
--
ALTER TABLE `odc_photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `odp`
--
ALTER TABLE `odp`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `odp_photos`
--
ALTER TABLE `odp_photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `odp_ports`
--
ALTER TABLE `odp_ports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `login_logs`
--
ALTER TABLE `login_logs`
  ADD CONSTRAINT `login_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  ADD CONSTRAINT `odc_odp_connections_ibfk_1` FOREIGN KEY (`odc_id`) REFERENCES `odc` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `odc_odp_connections_ibfk_2` FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `odc_photos`
--
ALTER TABLE `odc_photos`
  ADD CONSTRAINT `odc_photos_ibfk_1` FOREIGN KEY (`odc_id`) REFERENCES `odc` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `odp`
--
ALTER TABLE `odp`
  ADD CONSTRAINT `odp_ibfk_1` FOREIGN KEY (`source_id`) REFERENCES `odc` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `odp_photos`
--
ALTER TABLE `odp_photos`
  ADD CONSTRAINT `odp_photos_ibfk_1` FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `odp_ports`
--
ALTER TABLE `odp_ports`
  ADD CONSTRAINT `odp_ports_ibfk_1` FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
