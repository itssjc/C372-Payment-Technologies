const petModel = require('../models/petModel');
const serviceModel = require('../models/serviceModel');
const serviceBookingModel = require('../models/serviceBookingModel');

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parsePositiveInteger(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isValidBookingDate(value, today) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return false;

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && value >= today;
}

function listServices(req, res) {
  const ownerId = req.session.user.id;

  petModel.getPetsByOwner(ownerId, (petError, pets) => {
    if (petError) {
      console.error('Unable to load pets:', petError);
      return res.status(500).send('Unable to load pets.');
    }

    serviceModel.getActiveServices((serviceError, services) => {
      if (serviceError) {
        console.error('Unable to load services:', serviceError);
        return res.status(500).send('Unable to load services.');
      }

      const requestedPetId = req.query.petId;
      const selectedPetId = pets.some(pet => String(pet.id) === requestedPetId)
        ? requestedPetId
        : '';

      return res.render('services', {
        pets,
        services,
        selectedPetId,
        today: getTodayLocalDate(),
        messages: req.flash('success'),
        errors: req.flash('error'),
        session: req.session
      });
    });
  });
}

function createBooking(req, res) {
  const body = req.body || {};
  const petId = parsePositiveInteger(body.petId);
  const serviceId = parsePositiveInteger(body.serviceId);
  const today = getTodayLocalDate();

  if (petId === null || serviceId === null || !isValidBookingDate(body.bookingDate, today)) {
    req.flash('error', 'Choose a pet, service, and valid booking date.');
    return res.redirect('/services');
  }

  serviceBookingModel.createPendingBooking(
    req.session.user.id,
    petId,
    serviceId,
    body.bookingDate,
    (error, booking) => {
      if (error) {
        console.error('Error creating service booking:', error);
        req.flash('error', 'Unable to create the booking. Please try again.');
        return res.redirect(`/services?petId=${encodeURIComponent(body.petId)}`);
      }

      if (!booking) {
        req.flash('error', 'That pet or service is unavailable for booking.');
        return res.redirect('/services');
      }

      req.flash('success', 'Booking created. Payment is pending; no payment has been processed.');
      return res.redirect('/bookings');
    }
  );
}

function listBookings(req, res) {
  serviceBookingModel.getBookingsByOwner(req.session.user.id, (error, bookings) => {
    if (error) {
      console.error('Unable to load booking history:', error);
      return res.status(500).send('Unable to load booking history.');
    }

    return res.render('bookings', {
      bookings,
      messages: req.flash('success'),
      errors: req.flash('error'),
      session: req.session
    });
  });
}

module.exports = { listServices, createBooking, listBookings };
