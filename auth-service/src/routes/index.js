const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Example route for login
router.post('/login', authController.login);

// Example route for registration
router.post('/register', authController.register);

// Route for verifying OTP
router.post('/verify-otp', authController.verifyOTP);

// Route for resending OTP
router.post('/resend-otp', authController.resendOTP);

// Route for resetting password
router.post('/reset-password', authController.resetPassword);


// Route for refreshing token
router.post('/refresh-token', authController.refreshToken);

// Route for logout
router.post('/logout', authController.logout);

// Route for forgot password
router.post('/forgot-password', authController.forgotPassword);


// Route for deleting account
router.post('/delete-account', authController.deleteAccount);

module.exports = router;