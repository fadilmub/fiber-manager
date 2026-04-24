-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 24 Apr 2026 pada 04.21
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
(5, 'odc 1', -6.96402398, 109.64659654, '123', 8, 6, '123', '2026-04-19 08:07:29', '2026-04-24 02:04:49');

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
(15, 5, 11, '2026-04-19 09:01:10'),
(20, 5, 21, '2026-04-19 09:05:30'),
(29, 5, 10, '2026-04-19 10:01:47'),
(31, 5, 22, '2026-04-24 02:00:40'),
(32, 5, 20, '2026-04-24 02:02:17'),
(33, 5, 23, '2026-04-24 02:04:49');

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
(10, 'odp 1', 5, 'odc', -6.96732537, 109.64627467, 'safd', 8, 1, '', '2026-04-19 08:08:00', '2026-04-24 02:03:50'),
(11, 'odp 2', 5, 'odc', -6.96425827, 109.64741193, 'asdf', 8, 8, '', '2026-04-19 08:10:13', '2026-04-19 09:01:10'),
(20, 'odp 3', 5, 'odc', -6.96364418, 109.64566638, 'asdf', 8, 3, 'asdf', '2026-04-19 09:02:07', '2026-04-24 02:02:15'),
(21, 'asdf', 5, 'odc', -6.96732537, 109.64627467, 'safd', 4, 4, 'asfd', '2026-04-19 09:05:19', '2026-04-19 09:05:30'),
(22, 'asdfasdf', 5, 'odc', -6.96582813, 109.64548271, 'asdf', 8, 6, 'asdf', '2026-04-19 09:11:32', '2026-04-21 02:07:25'),
(23, 'ODP 5', 5, 'odc', -6.96639506, 109.64794844, 'asdf', 4, 0, 'asdf', '2026-04-24 02:04:40', '2026-04-24 02:05:26');

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
(85, 10, 1, 'used', 'AMujahidinRowokembu0510057@qc.net', 'drop', NULL, '2026-04-19 08:08:00', '2026-04-24 02:02:56'),
(86, 10, 2, 'used', 'AanAdyanKuripan0102026@qc.net', 'drop', NULL, '2026-04-19 08:08:00', '2026-04-24 02:03:07'),
(87, 10, 3, 'used', 'AbdaTosaran0507074@qc.net', 'drop', NULL, '2026-04-19 08:08:00', '2026-04-24 02:03:15'),
(88, 10, 4, 'used', 'AbdanNafiKranji0204024@qc.net', 'drop', NULL, '2026-04-19 08:08:00', '2026-04-24 02:03:23'),
(89, 10, 5, 'used', 'AbdulAzizAmbokembang0511033@qc.net', 'drop', NULL, '2026-04-19 08:08:00', '2026-04-24 02:03:32'),
(90, 10, 6, 'used', 'AbdulAzizRCSGardenKedungwuni0515115@qc.net', 'drop', NULL, '2026-04-19 08:08:00', '2026-04-24 02:03:41'),
(91, 10, 7, 'used', 'AbdulBasidKurikan0513050@qc.net', 'drop', NULL, '2026-04-19 08:08:00', '2026-04-24 02:03:50'),
(92, 10, 8, 'available', NULL, NULL, NULL, '2026-04-19 08:08:00', '2026-04-19 08:08:00'),
(93, 11, 1, 'available', NULL, NULL, NULL, '2026-04-19 08:10:13', '2026-04-19 08:10:13'),
(94, 11, 2, 'available', NULL, NULL, NULL, '2026-04-19 08:10:13', '2026-04-19 08:10:13'),
(95, 11, 3, 'available', NULL, NULL, NULL, '2026-04-19 08:10:13', '2026-04-19 08:10:13'),
(96, 11, 4, 'available', NULL, NULL, NULL, '2026-04-19 08:10:13', '2026-04-19 08:10:13'),
(97, 11, 5, 'available', NULL, NULL, NULL, '2026-04-19 08:10:13', '2026-04-19 08:10:13'),
(98, 11, 6, 'available', NULL, NULL, NULL, '2026-04-19 08:10:13', '2026-04-19 08:10:13'),
(99, 11, 7, 'available', NULL, NULL, NULL, '2026-04-19 08:10:13', '2026-04-19 08:10:13'),
(100, 11, 8, 'available', NULL, NULL, NULL, '2026-04-19 08:10:13', '2026-04-19 08:10:13'),
(109, 20, 1, 'used', 'andi', 'drop', NULL, '2026-04-19 09:02:07', '2026-04-24 02:01:44'),
(110, 20, 2, 'used', 'aris', 'drop', NULL, '2026-04-19 09:02:07', '2026-04-24 02:01:52'),
(111, 20, 3, 'used', 'ami', 'drop', NULL, '2026-04-19 09:02:07', '2026-04-24 02:02:01'),
(112, 20, 4, 'used', 'ani', 'drop', NULL, '2026-04-19 09:02:07', '2026-04-24 02:02:06'),
(113, 20, 5, 'used', 'yuni', 'drop', NULL, '2026-04-19 09:02:07', '2026-04-24 02:02:15'),
(114, 20, 6, 'available', NULL, NULL, NULL, '2026-04-19 09:02:07', '2026-04-19 09:02:07'),
(115, 20, 7, 'available', NULL, NULL, NULL, '2026-04-19 09:02:07', '2026-04-19 09:02:07'),
(116, 20, 8, 'available', NULL, NULL, NULL, '2026-04-19 09:02:07', '2026-04-19 09:02:07'),
(117, 21, 1, 'available', NULL, NULL, NULL, '2026-04-19 09:05:19', '2026-04-19 09:05:19'),
(118, 21, 2, 'available', NULL, NULL, NULL, '2026-04-19 09:05:19', '2026-04-19 09:05:19'),
(119, 21, 3, 'available', NULL, NULL, NULL, '2026-04-19 09:05:19', '2026-04-19 09:05:19'),
(120, 21, 4, 'available', NULL, NULL, NULL, '2026-04-19 09:05:19', '2026-04-19 09:05:19'),
(121, 22, 1, 'used', 'anti', 'drop', NULL, '2026-04-19 09:11:32', '2026-04-24 02:00:37'),
(122, 22, 2, 'used', 'anto', 'drop', NULL, '2026-04-19 09:11:32', '2026-04-24 02:00:23'),
(123, 22, 3, 'available', NULL, NULL, NULL, '2026-04-19 09:11:32', '2026-04-19 09:11:32'),
(124, 22, 4, 'available', NULL, NULL, NULL, '2026-04-19 09:11:32', '2026-04-19 09:11:32'),
(125, 22, 5, 'available', NULL, NULL, NULL, '2026-04-19 09:11:32', '2026-04-19 09:11:32'),
(126, 22, 6, 'available', NULL, NULL, NULL, '2026-04-19 09:11:32', '2026-04-19 09:11:32'),
(127, 22, 7, 'available', NULL, NULL, NULL, '2026-04-19 09:11:33', '2026-04-19 09:11:33'),
(128, 22, 8, 'available', NULL, NULL, NULL, '2026-04-19 09:11:33', '2026-04-19 09:11:33'),
(129, 23, 1, 'used', 'AbdulFatahBeringin40201065@qc.net', 'drop', NULL, '2026-04-24 02:04:40', '2026-04-24 02:05:04'),
(130, 23, 2, 'used', 'AbdulGhofurKuripan021225@qc.net', 'drop', NULL, '2026-04-24 02:04:40', '2026-04-24 02:05:10'),
(131, 23, 3, 'used', 'AbdulHakimCapgawen0509113@qc.net', 'drop', NULL, '2026-04-24 02:04:40', '2026-04-24 02:05:17'),
(132, 23, 4, 'used', 'AbdulHakimPodo0509055@qc.net', 'drop', NULL, '2026-04-24 02:04:40', '2026-04-24 02:05:25');

--
-- Indexes for dumped tables
--

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
-- Indeks untuk tabel `odp`
--
ALTER TABLE `odp`
  ADD PRIMARY KEY (`id`),
  ADD KEY `source_id` (`source_id`);

--
-- Indeks untuk tabel `odp_ports`
--
ALTER TABLE `odp_ports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_odp_port` (`odp_id`,`port_number`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `odc`
--
ALTER TABLE `odc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT untuk tabel `odp`
--
ALTER TABLE `odp`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT untuk tabel `odp_ports`
--
ALTER TABLE `odp_ports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=133;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `odc_odp_connections`
--
ALTER TABLE `odc_odp_connections`
  ADD CONSTRAINT `odc_odp_connections_ibfk_1` FOREIGN KEY (`odc_id`) REFERENCES `odc` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `odc_odp_connections_ibfk_2` FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `odp`
--
ALTER TABLE `odp`
  ADD CONSTRAINT `odp_ibfk_1` FOREIGN KEY (`source_id`) REFERENCES `odc` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `odp_ports`
--
ALTER TABLE `odp_ports`
  ADD CONSTRAINT `odp_ports_ibfk_1` FOREIGN KEY (`odp_id`) REFERENCES `odp` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
