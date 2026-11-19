
CREATE DATABASE IF NOT EXISTS petcare
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE petcare;

-- Drop child tables first
DROP TABLE IF EXISTS journal;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password CHAR(64) NOT NULL,          -- SHA-256 hash (64 characters)
  name VARCHAR(100) NOT NULL,
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE pets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id INT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(80) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  image VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pets_owner_id (owner_id),
  CONSTRAINT fk_pets_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE journal (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pet_id INT UNSIGNED NOT NULL,
  activity VARCHAR(120) NOT NULL,
  notes TEXT NULL,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_journal_pet_id (pet_id),
  INDEX idx_journal_entry_date (entry_date),
  CONSTRAINT fk_journal_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Sample users
-- Plain passwords:
-- admin1 / admin123
-- amy / user123
-- ben / user123
-- clara / user123
INSERT INTO users (id, username, password, name, role) VALUES
(1, 'admin1', SHA2('admin123', 256), 'Hannah Admin', 'admin'),
(2, 'amy',    SHA2('user123', 256),  'Amy Tan',      'user'),
(3, 'ben',    SHA2('user123', 256),  'Ben Lim',      'user'),
(4, 'clara',  SHA2('user123', 256),  'Clara Ng',     'user');

-- Sample pets (image names aligned with your public/images folder)
INSERT INTO pets (id, owner_id, name, species, breed, age, image) VALUES
(1, 1, 'Chester', 'Dog', 'Pomeranian', 3, '1751953011050_chester.jpg'),
(2, 2, 'Hammy',   'Hamster', 'Syrian', 1, '1751905564825_hammy.jpg'),
(3, 3, 'Molly',   'Dog', 'West Highland Terrier', 4, 'molly.jpg'),
(4, 3, 'Mochi',   'Dog', 'Maltese', 2, 'Mochi.png'),
(5, 4, 'Mira',    'Cat', 'Ragdoll', 5, 'mira.jpg');

-- Sample journal entries
INSERT INTO journal (pet_id, activity, notes, entry_date) VALUES
(1, 'Morning Walk', '30-minute walk at the park', '2026-08-10'),
(1, 'Grooming', 'Brushed coat and trimmed nails', '2026-08-11'),
(2, 'Cage Cleaning', 'Replaced bedding and cleaned wheel', '2026-08-09'),
(2, 'Feeding', 'Gave sunflower mix and fresh water', '2026-08-11'),
(3, 'Vet Visit', 'Annual check-up completed', '2026-08-08'),
(3, 'Playtime', 'Played fetch in the living room', '2026-08-12'),
(4, 'Litter Box', 'Cleaned litter and changed liner', '2026-08-10'),
(4, 'Napping', 'Slept most of the afternoon', '2026-08-12'),
(5, 'Walk', 'Short evening walk', '2026-08-07'),
(5, 'Bath', 'Mild shampoo bath and dry', '2026-08-11');

-- C372 Week 04 Lesson 08: extend the existing Lesson 06 database.
-- Prerequisite: petcare already contains the Lesson 06 users, pets, and journal.
-- Run this script ONCE in MySQL Workbench against your own development database.
-- It preserves existing users, pets, and journals; it does not reset any tables.
-- Do not run the full Lesson 06 or Lesson 08 db.sql again: those scripts drop tables.
--
-- If any of the three new tables already exists, STOP and inspect its schema.
-- Do not ignore table-exists errors or continue to the catalogue insert.
-- MySQL CREATE TABLE statements commit independently: a failed run may leave
-- some new tables created. Inspect the result before attempting a rerun.

USE petcare;

-- Current catalogue prices are in Singapore dollars.
CREATE TABLE services (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Store the service price at booking time, independently of later price changes.
CREATE TABLE service_bookings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pet_id INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  booking_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  booked_price DECIMAL(10,2) NOT NULL,
  booking_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_service_bookings_pet_id (pet_id),
  INDEX idx_service_bookings_service_id (service_id),
  CONSTRAINT fk_service_bookings_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_service_bookings_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- A pending payment record does not mean money has been collected.
CREATE TABLE payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_reference VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_booking_id (booking_id),
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES service_bookings(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT INTO services (name, price, is_active) VALUES
('Basic Bath', 25.00, 1),
('Full Grooming', 55.00, 1),
('Nail Trimming', 15.00, 1),
('Health Check-up', 40.00, 1),
('Vaccination', 35.00, 1),
('Dental Cleaning', 60.00, 1),
('Pet Daycare (Full Day)', 45.00, 1),
('Pet Sitting (Per Visit)', 30.00, 1);

-- Verify: eight active services; no sample bookings or payments are inserted.
SELECT id, name, price, is_active FROM services ORDER BY id;
SELECT COUNT(*) AS booking_count FROM service_bookings;
SELECT COUNT(*) AS payment_count FROM payments;

-- Clara and Mira are inherited from the supplied Lesson 06 seed data.
-- This query should show that Mira belongs to Clara if those samples remain.
SELECT u.username, p.id AS pet_id, p.name AS pet_name, p.species
FROM users AS u
JOIN pets AS p ON p.owner_id = u.id
WHERE u.username = 'clara' AND p.name = 'Mira';
