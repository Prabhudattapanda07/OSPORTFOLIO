const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Message = require('../models/Message');

// ===== EMAIL TRANSPORTER =====
const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
  },
});

// ===== POST /api/contact =====
// Saves message to MongoDB + sends email notification
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and message are required.',
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message is too long (max 2000 characters).',
      });
    }

    // Get IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // 1. Save to MongoDB
    const newMessage = await Message.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() || 'New message from Portfolio OS',
      message: message.trim(),
      ipAddress,
    });

    // 2. Send email notification to Prabhu
    try {
      const transporter = createTransporter();

      const mailOptions = {
        from: `"Portfolio OS 🖥️" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Send to yourself
        replyTo: email,
        subject: `📬 New message from ${name} — Portfolio OS`,
        html: `
          <div style="font-family: 'Courier New', monospace; background: #0a0a0f; color: #e8e8f0; padding: 32px; border-radius: 12px; max-width: 600px;">
            <div style="border-bottom: 2px solid #00ff88; padding-bottom: 16px; margin-bottom: 24px;">
              <h1 style="color: #00ff88; font-size: 1.4rem; margin: 0;">PrabhuOS — New Message</h1>
              <p style="color: #888899; font-size: 0.8rem; margin: 4px 0 0;">Portfolio Contact Form</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #888899; padding: 8px 0; font-size: 0.85rem; width: 80px;">From:</td>
                <td style="color: #e8e8f0; padding: 8px 0; font-size: 0.85rem;">${name}</td>
              </tr>
              <tr>
                <td style="color: #888899; padding: 8px 0; font-size: 0.85rem;">Email:</td>
                <td style="color: #00ff88; padding: 8px 0; font-size: 0.85rem;"><a href="mailto:${email}" style="color: #00ff88;">${email}</a></td>
              </tr>
              <tr>
                <td style="color: #888899; padding: 8px 0; font-size: 0.85rem;">Subject:</td>
                <td style="color: #e8e8f0; padding: 8px 0; font-size: 0.85rem;">${subject || 'No subject'}</td>
              </tr>
              <tr>
                <td style="color: #888899; padding: 8px 0; font-size: 0.85rem;">Time:</td>
                <td style="color: #e8e8f0; padding: 8px 0; font-size: 0.85rem;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
              </tr>
            </table>
            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; margin-top: 20px;">
              <p style="color: #888899; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Message:</p>
              <p style="color: #e8e8f0; font-size: 0.88rem; line-height: 1.6; margin: 0;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center;">
              <p style="color: #555566; font-size: 0.7rem; margin: 0;">PrabhuOS v2.0 — portfolio-os.vercel.app</p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      // Don't fail the whole request if email fails — message is still saved
      console.warn('⚠️ Email send failed (message still saved):', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Message received! Prabhudatta will get back to you soon.',
      id: newMessage._id,
    });

  } catch (err) {
    console.error('❌ Contact route error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.',
    });
  }
});

// ===== GET /api/contact =====
// Get all messages (for personal dashboard use)
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router;
