const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  day: String,
  time: String,
  subject: String,
  faculty: String,
  room: String,
  batch: String // e.g., "BCA 1 (M)" or "BCA 3 (E) - Lab 2"
});

module.exports = mongoose.model('Timetable', timetableSchema);
