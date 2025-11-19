const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  // SAME subject name allowed across morning/evening
  name: { type: String, required: true },

  semester: {
    type: Number,
    enum: [1, 3, 5],
    required: true
  },

  credits: { type: Number, required: true },

  isLab: { type: Boolean, default: false },

  students: { type: Number, default: 60 },

  // Assign subject strictly to one batch (morning/evening)
  batchAssignment: {
    type: String,
    enum: [
      "BCA 1 (M)",
      "BCA 1 (E)",
      "BCA 3 (M)",
      "BCA 3 (E)",
      "BCA 5 (M)",
      "BCA 5 (E)"
    ],
    required: true
  }
});

// 👇 Optional: Avoid exact duplicates (same subject, same batch)
subjectSchema.index({ name: 1, batchAssignment: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
