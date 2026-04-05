const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  totalAllTime: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Visitor', visitorSchema);
