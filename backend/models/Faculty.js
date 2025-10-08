const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: { type: String, required: true },
  subjects: [{ type: String }],
  maxHoursPerWeek: { type: Number },
  availability: [{ day: String, start: String, end: String }]
});

module.exports = mongoose.model('Faculty', facultySchema);
