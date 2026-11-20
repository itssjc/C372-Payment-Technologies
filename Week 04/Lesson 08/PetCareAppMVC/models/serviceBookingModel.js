const connection = require('../config/db');

function createPendingBooking(ownerId, petId, serviceId, bookingDate, callback) {
  connection.getConnection((connectionError, transactionConnection) => {
    if (connectionError) return callback(connectionError);

    let completed = false;
    function finish(error, result) {
      if (completed) return;
      completed = true;
      transactionConnection.release();
      callback(error, result);
    }

    function rollback(error, result) {
      transactionConnection.rollback((rollbackError) => {
        if (rollbackError) {
          const transactionError = new Error('Booking transaction failed and rollback failed.');
          transactionError.cause = error;
          transactionError.rollbackError = rollbackError;
          completed = true;
          transactionConnection.destroy();
          return callback(transactionError);
        }
        finish(error, result);
      });
    }

    transactionConnection.beginTransaction((beginError) => {
      if (beginError) return finish(beginError);

      const bookingSql = `
        INSERT INTO service_bookings
          (pet_id, service_id, booking_date, booked_price, booking_status)
        SELECT pets.id, services.id, ?, services.price, 'pending'
        FROM pets
        JOIN services ON services.id = ?
        WHERE pets.id = ?
          AND pets.owner_id = ?
          AND services.is_active = 1
      `;
      transactionConnection.query(
        bookingSql,
        [bookingDate, serviceId, petId, ownerId],
        (bookingError, bookingResult) => {
          if (bookingError) return rollback(bookingError);
          if (bookingResult.affectedRows === 0) return rollback(null, null);
          if (bookingResult.affectedRows !== 1) {
            return rollback(new Error('Expected exactly one booking to be created.'));
          }

          const bookingId = bookingResult.insertId;
          const paymentSql = `
            INSERT INTO payments (booking_id, amount, payment_status)
            SELECT id, booked_price, 'pending'
            FROM service_bookings
            WHERE id = ?
          `;
          transactionConnection.query(paymentSql, [bookingId], (paymentError, paymentResult) => {
            if (paymentError) return rollback(paymentError);
            if (paymentResult.affectedRows !== 1) {
              return rollback(new Error('Expected exactly one payment to be created.'));
            }

            transactionConnection.commit((commitError) => {
              if (commitError) return rollback(commitError);
              finish(null, { bookingId, paymentId: paymentResult.insertId });
            });
          });
        }
      );
    });
  });
}

function getBookingsByOwner(ownerId, callback) {
  const sql = `
    SELECT
      service_bookings.id AS booking_id,
      DATE_FORMAT(service_bookings.booking_date, '%Y-%m-%d') AS booking_date,
      pets.name AS pet_name,
      services.name AS service_name,
      service_bookings.booked_price,
      service_bookings.booking_status,
      payments.payment_status,
      payments.payment_reference,
      service_bookings.created_at
    FROM service_bookings
    JOIN pets ON pets.id = service_bookings.pet_id
    JOIN services ON services.id = service_bookings.service_id
    LEFT JOIN payments ON payments.booking_id = service_bookings.id
    WHERE pets.owner_id = ?
    ORDER BY service_bookings.created_at DESC, service_bookings.id DESC
  `;
  connection.query(sql, [ownerId], callback);
}

function getBookingForPayment(ownerId, bookingId, callback) {
  const sql = `
    SELECT
      service_bookings.id AS booking_id,
      service_bookings.booked_price,
      service_bookings.booking_status,
      pets.name AS pet_name,
      services.name AS service_name,
      payments.payment_status
    FROM service_bookings
    JOIN pets ON pets.id = service_bookings.pet_id
    JOIN services ON services.id = service_bookings.service_id
    JOIN payments ON payments.booking_id = service_bookings.id
    WHERE pets.owner_id = ? AND service_bookings.id = ?
    LIMIT 1
  `;
  connection.query(sql, [ownerId, bookingId], (error, rows) => {
    if (error) return callback(error);
    return callback(null, rows[0] || null);
  });
}

function updateMockPayment(ownerId, bookingId, paymentStatus, bookingStatus, paymentReference, callback) {
  connection.getConnection((connectionError, transactionConnection) => {
    if (connectionError) return callback(connectionError);

    let completed = false;
    function finish(error, result) {
      if (completed) return;
      completed = true;
      transactionConnection.release();
      callback(error, result);
    }

    function rollback(error, result) {
      transactionConnection.rollback((rollbackError) => {
        if (rollbackError) {
          const transactionError = new Error('Mock payment update failed and rollback failed.');
          transactionError.cause = error;
          transactionError.rollbackError = rollbackError;
          completed = true;
          transactionConnection.destroy();
          return callback(transactionError);
        }
        finish(error, result);
      });
    }

    transactionConnection.beginTransaction((beginError) => {
      if (beginError) return finish(beginError);

      const paymentSql = `
        UPDATE payments
        JOIN service_bookings ON service_bookings.id = payments.booking_id
        JOIN pets ON pets.id = service_bookings.pet_id
        SET payments.payment_status = ?, payments.payment_reference = ?
        WHERE pets.owner_id = ?
          AND service_bookings.id = ?
          AND payments.payment_status IN ('pending', 'failed')
      `;
      transactionConnection.query(
        paymentSql,
        [paymentStatus, paymentReference, ownerId, bookingId],
        (paymentError, paymentResult) => {
          if (paymentError) return rollback(paymentError);
          if (paymentResult.affectedRows !== 1) return rollback(null, null);

          const bookingSql = `
            UPDATE service_bookings
            JOIN pets ON pets.id = service_bookings.pet_id
            SET service_bookings.booking_status = ?
            WHERE pets.owner_id = ? AND service_bookings.id = ?
          `;
          transactionConnection.query(
            bookingSql,
            [bookingStatus, ownerId, bookingId],
            (bookingError) => {
              if (bookingError) return rollback(bookingError);

              transactionConnection.commit((commitError) => {
                if (commitError) return rollback(commitError);
                finish(null, { bookingId, paymentStatus, bookingStatus });
              });
            }
          );
        }
      );
    });
  });
}

module.exports = {
  createPendingBooking,
  getBookingsByOwner,
  getBookingForPayment,
  updateMockPayment
};
