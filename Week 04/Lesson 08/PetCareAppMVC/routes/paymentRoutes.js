const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

router.get('/payments/prepare/:serviceId', paymentController.preparePayment);
router.post('/payments/mock/:serviceId', paymentController.createMockPayment);
router.post('/payments/bookings/:bookingId/mock', isLoggedIn, paymentController.payBooking);

module.exports = router;
