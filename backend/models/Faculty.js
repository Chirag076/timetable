const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: { type: String, required: true },

  subjects: [{ type: String }],

  maxHoursPerWeek: { type: Number, default: 20 },   // total load cap (5 days × 4 hrs)
  maxHoursPerDay: { type: Number, default: 4 },     // to prevent daily overload

  availability: [{ day: String, start: String, end: String }],

  room: { type: String },                           // preferred classroom/lab (e.g., "Room101")
  department: { type: String, default: 'BCA' },     // optional grouping for large setups
});

module.exports = mongoose.model('Faculty', facultySchema);
