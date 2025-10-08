const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number },
  type: { type: String } // theory or lab
});

module.exports = mongoose.model('Room', roomSchema);
