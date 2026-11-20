const MockProvider = require('../services/mockPaymentProvider');
const services = require('../data/mockServices');
const serviceBookingModel = require('../models/serviceBookingModel');

function preparePayment(req, res) {
  const service = services.find(
    (item) => String(item.id) === req.params.serviceId
  );

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  return res.status(200).json({
    serviceId: service.id,
    serviceName: service.name,
    amount: service.price,
    currency: 'sgd',
    status: 'READY_FOR_PAYMENT'
  });
}

async function createMockPayment(req, res) {
  const serviceId = Number(req.params.serviceId);
  const service = services.find(item => item.id === serviceId);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const paymentRequest = {
    amount: service.price,
    currency: 'sgd',
    merchantReference: 'SERVICE-' + service.id,
    description: service.name,
    testStatus: req.body?.testStatus
  };

  // call mock provider
  const providerResult = await MockProvider.createPayment(paymentRequest);

  const bookingStatusByPayment = {
    APPROVED: 'CONFIRMED',
    PENDING: 'AWAITING_PAYMENT',
    DECLINED: 'PAYMENT_FAILED'
  };

  return res.json({
    serviceId: service.id,
    providerPaymentId: providerResult.providerPaymentId,
    merchantReference: providerResult.merchantReference,
    paymentStatus: providerResult.status,
    bookingStatus: bookingStatusByPayment[providerResult.status]
  });
}

function payBooking(req, res) {
  const bookingIdString = req.params.bookingId;
  const bookingId = Number(bookingIdString);
  if (!/^[1-9]\d*$/.test(bookingIdString) || !Number.isSafeInteger(bookingId)) {
    req.flash('error', 'Booking not found.');
    return res.redirect('/bookings');
  }

  const requestedStatus = (req.body || {}).testStatus || 'APPROVED';
  const allowedStatuses = ['APPROVED', 'PENDING', 'DECLINED'];
  if (!allowedStatuses.includes(requestedStatus)) {
    req.flash('error', 'Invalid mock payment status.');
    return res.redirect('/bookings');
  }

  serviceBookingModel.getBookingForPayment(req.session.user.id, bookingId, (lookupError, booking) => {
    if (lookupError) {
      console.error('Unable to load booking for mock payment:', lookupError);
      req.flash('error', 'Unable to process the mock payment. Please try again.');
      return res.redirect('/bookings');
    }

    if (!booking) {
      req.flash('error', 'Booking or payment not found.');
      return res.redirect('/bookings');
    }

    if (booking.payment_status === 'success') {
      req.flash('success', 'This booking has already been paid.');
      return res.redirect('/bookings');
    }

    if (!['pending', 'failed'].includes(booking.payment_status)) {
      req.flash('error', 'This booking is not available for mock payment.');
      return res.redirect('/bookings');
    }

    const paymentRequest = {
      amount: booking.booked_price,
      currency: 'sgd',
      merchantReference: 'BOOKING-' + booking.booking_id,
      description: `${booking.service_name} for ${booking.pet_name}`,
      testStatus: requestedStatus
    };

    MockProvider.createPayment(paymentRequest)
      .then((providerResult) => {
        const statusByProvider = {
          APPROVED: { paymentStatus: 'success', bookingStatus: 'confirmed' },
          PENDING: { paymentStatus: 'pending', bookingStatus: 'pending' },
          DECLINED: { paymentStatus: 'failed', bookingStatus: 'payment_failed' }
        };
        const outcome = statusByProvider[providerResult.status];
        if (!outcome) {
          console.error('Mock provider returned an unsupported status:', providerResult.status);
          req.flash('error', 'Unable to process the mock payment. Please try again.');
          return res.redirect('/bookings');
        }

        serviceBookingModel.updateMockPayment(
          req.session.user.id,
          bookingId,
          outcome.paymentStatus,
          outcome.bookingStatus,
          providerResult.providerPaymentId,
          (updateError, updatedBooking) => {
            if (updateError) {
              console.error('Unable to save mock payment result:', updateError);
              req.flash('error', 'Unable to process the mock payment. Please try again.');
              return res.redirect('/bookings');
            }

            if (!updatedBooking) {
              req.flash('error', 'Booking or pending payment not found.');
              return res.redirect('/bookings');
            }

            if (providerResult.status === 'APPROVED') {
              req.flash('success', 'Mock payment successful. Booking confirmed; no money was charged.');
            } else if (providerResult.status === 'PENDING') {
              req.flash('success', 'Mock payment is pending.');
            } else {
              req.flash('error', 'Mock payment was declined. You can try again.');
            }
            return res.redirect('/bookings');
          }
        );
      })
      .catch((error) => {
        console.error('Mock payment provider error:', error);
        req.flash('error', 'Unable to process the mock payment. Please try again.');
        return res.redirect('/bookings');
      });
  });
}

module.exports = { preparePayment, createMockPayment, payBooking };
