const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },//F3
  capacity: { type: Number },//60
  type: { type: String, enum: ["theory", "lab"], required: true }
});

module.exports = mongoose.model('Room', roomSchema);
