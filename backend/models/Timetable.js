const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  day: String,
  time: String,
  subject: String,
  faculty: String,
  room: String
});

module.exports = mongoose.model('Timetable', timetableSchema);
