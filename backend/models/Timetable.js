const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    required: true
  },

  time: {
    type: String,
    required: true
  },

  subject: {
    type: String,
    required: true
  },

  faculty: {
    type: String,
    required: true
  },

  room: {
    type: String,
    required: true
  },

  batch: {
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
  },

  // Helps to avoid duplicates and debugging issues
  createdAt: { type: Date, default: Date.now }
});

// PREVENT DUPLICATES: SAME batch + day + time SHOULD NEVER REPEAT
timetableSchema.index(
  { batch: 1, day: 1, time: 1 },
  { unique: true }
);
timetableSchema.index(
  { faculty: 1, day: 1, time: 1 },
  { unique: true }
);
timetableSchema.index(
  { room: 1, day: 1, time: 1 },
  { unique: true }
);


module.exports = mongoose.model("Timetable", timetableSchema);
