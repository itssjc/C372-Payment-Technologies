-- Add Lesson 08 service-booking tables to the existing Lesson 06 petcare database.
-- This script does not drop or modify existing users, pets, or journal data.
-- Run once only, after confirming none of these tables already exist.
-- If a CREATE TABLE statement fails because a table exists, inspect its schema
-- before continuing; do not rerun this script blindly.

USE petcare;

CREATE TABLE services (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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
