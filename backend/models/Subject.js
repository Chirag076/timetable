const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  semester: { type: Number },
  credits: { type: Number },
  isLab: { type: Boolean, default: false },
  students: { type: Number }
});

module.exports = mongoose.model('Subject', subjectSchema);
