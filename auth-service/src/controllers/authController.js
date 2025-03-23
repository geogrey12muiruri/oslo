const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');

const redis = new Redis(process.env.REDIS_URL);

// Kafka producer setup
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  retry: {
    initialRetryTime: 500,
    retries: 15,
    maxRetryTime: 60000,
  },
});
const producer = kafka.producer();

let producerConnected = false;

const connectProducer = async () => {
  let retries = 15;
  while (retries > 0) {
    try {
      await producer.connect();
      console.log('Kafka producer connected');
      producerConnected = true;
      break;
    } catch (err) {
      console.error('Failed to connect Kafka producer:', err.message);
      retries--;
      if (retries === 0) {
        console.error('Max retries reached for producer. Proceeding without Kafka.');
        producerConnected = false;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    }
  }
};

// Start producer connection (non-blocking)
connectProducer();

// Generate and send OTP (used for registration)
const sendOTP = async (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  await redis.setex(`otp:${email}`, 300, otp); // Store OTP in Redis (expires in 5 minutes)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
  });

  await transporter.sendMail({
    to: email,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${otp}. It expires in 5 minutes.`,
  });
};

exports.register = async (req, res) => {
  const { email, password, role, tenantId } = req.body;

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, verified: false, role, tenantId },
    });

    if (role === "AUDITOR" && producerConnected) {
      try {
        await producer.send({
          topic: "user.created",
          messages: [
            {
              value: JSON.stringify({
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                createdAt: user.createdAt,
              }),
            },
          ],
        });
        console.log("user.created event published to Kafka:", user);
      } catch (err) {
        console.error("Failed to publish user.created event:", err);
      }
    }

    await sendOTP(email);
    return res.status(201).json({ message: "User registered. Please verify using the OTP sent to your email." });
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).json({ message: "Server error during registration" });
  }
};

// **VERIFY OTP**
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const storedOTP = await redis.get(`otp:${email}`);
    if (!storedOTP || storedOTP !== otp) return res.status(400).json({ message: 'Invalid or expired OTP' });

    await prisma.user.update({ where: { email }, data: { verified: true } });

    await redis.del(`otp:${email}`); // Remove OTP after successful verification

    return res.json({ message: 'Account verified successfully' });

  } catch (err) {
    console.error('Error during OTP verification:', err);
    return res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

// **LOGIN**
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // Validate the password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid credentials' });

    // Fetch tenant details
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, tenantId: user.tenantId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    // Return user details, tenant name, and tokens
    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant.name, // Include tenant name
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// **GET CURRENT USER**
exports.getCurrentUser = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, tenantId: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("Error verifying token:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
// **REFRESH TOKEN**
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const { userId } = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const storedRefreshToken = await redis.get(`refreshToken:${userId}`);
    if (refreshToken !== storedRefreshToken) return res.status(401).json({ message: 'Invalid refresh token' });

    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

    return res.json({ accessToken });

  } catch (err) {
    console.error('Error during token refresh:', err);
    return res.status(500).json({ message: 'Server error during token refresh' });
  }
};

// **LOGOUT**
exports.logout = async (req, res) => {
  const { userId } = req.body;

  try {
    await redis.del(`refreshToken:${userId}`);

    return res.json({ message: 'Logged out successfully' });

  } catch (err) {
    console.error('Error during logout:', err);
    return res.status(500).json({ message: 'Server error during logout' });
  }
};

// **FORGOT PASSWORD**
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const token = crypto.randomBytes(20).toString('hex');
    await redis.setex(`resetPasswordToken:${token}`, 3600, user.id); // Store token in Redis (expires in 1 hour)

    const resetLink = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
    });

    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Link',
      text: `Click on the link to reset your password: ${resetLink}`,
    });

    return res.json({ message: 'Password reset link sent to your email' });

  } catch (err) {
    console.error('Error during forgot password:', err);
    return res.status(500).json({ message: 'Server error during forgot password' });
  }
};

// **RESET PASSWORD**
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const userId = await redis.get(`resetPasswordToken:${token}`);
    if (!userId) return res.status(400).json({ message: 'Invalid or expired token' });

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    await redis.del(`resetPasswordToken:${token}`); // Remove token after successful password reset

    return res.json({ message: 'Password reset successfully' });

  } catch (err) {
    console.error('Error during password reset:', err);
    return res.status(500).json({ message: 'Server error during password reset' });
  }
};

// **RESEND OTP**
exports.resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: 'User not found' });

    await sendOTP(email); // Resend OTP

    return res.json({ message: 'OTP resent successfully' });

  } catch (err) {
    console.error('Error during OTP resend:', err);
    return res.status(500).json({ message: 'Server error during OTP resend' });
  }
};

// **DELETE ACCOUNT**
exports.deleteAccount = async (req, res) => {
  const { userId } = req.body;

  try {
    await prisma.user.delete({ where: { id: userId } });

    return res.json({ message: 'Account deleted successfully' });

  } catch (err) {
    console.error('Error during account deletion:', err);
    return res.status(500).json({ message: 'Server error during account deletion' });
  }
};

// **RATE LIMIT LOGIN**
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Allow 5 login attempts per IP
  message: 'Too many login attempts. Please try again later.',
});