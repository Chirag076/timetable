const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },

  // Subjects teacher can teach (normal + labs)
  subjects: [{ type: String, required: true }],

  maxHoursPerWeek: { type: Number, default: 20 },
  maxHoursPerDay: { type: Number, default: 4 },

  availability: [
    {
      day: { type: String, required: true },
      start: { type: String, required: true },
      end: { type: String, required: true }
    }
  ],

  // ⭐ IMPORTANT CHANGE:
  // Teacher can teach MULTIPLE batches (array instead of single string)
  batchAssignments: {
    type: [String],
    enum: [
      "BCA 1 (M)", "BCA 1 (E)",
      "BCA 3 (M)", "BCA 3 (E)",
      "BCA 5 (M)", "BCA 5 (E)"
    ],
    required: true
  },

  department: { type: String, default: "BCA" }
});

// still keep this to avoid duplicate teacher creation
facultySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Faculty", facultySchema);
