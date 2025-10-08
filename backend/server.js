const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Import API routes
const apiRoutes = require('./routes/api');

// Use API routes
app.use('/api', apiRoutes);

// Test route
app.get('/', (req, res) => res.send("Backend Running"));
app.use(cors({ origin: "http://localhost:5173" })); // frontend URL
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
