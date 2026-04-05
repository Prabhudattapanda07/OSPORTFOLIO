const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');

// ===== POST /api/visitors/ping =====
// Called when someone loads the portfolio — logs the visit
router.post('/ping', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Upsert today's visitor record
    const record = await Visitor.findOneAndUpdate(
      { date: today },
      {
        $inc: { count: 1 },
        $setOnInsert: { date: today },
      },
      { upsert: true, new: true }
    );

    // Get total all-time count
    const totalResult = await Visitor.aggregate([
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);
    const totalAllTime = totalResult[0]?.total || 0;

    res.json({
      success: true,
      today: record.count,
      total: totalAllTime,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== GET /api/visitors/stats =====
// Get visitor stats — last 7 days + total
router.get('/stats', async (req, res) => {
  try {
    const last7Days = await Visitor.find()
      .sort({ date: -1 })
      .limit(7);

    const totalResult = await Visitor.aggregate([
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);

    res.json({
      success: true,
      last7Days,
      totalAllTime: totalResult[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
