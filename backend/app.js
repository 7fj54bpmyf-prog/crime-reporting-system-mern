
require('dotenv').config();

const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');

const connectDB = require('./db');
const User = require('./user');
const Complaint = require('./complaint');
const SOS = require('./sos');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());


// ==========================================
// COMPLAINT ID GENERATOR
// ==========================================

const newComplaintId = () =>
  'CR-' +
  new Date().getFullYear() +
  '-' +
  Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();


// ==========================================
// HOME / API STATUS
// ==========================================

app.get('/', (req, res) => {
  res.json({
    message: 'Crime Reporting System API is running'
  });
});


// ==========================================
// REGISTER
// ==========================================

app.post('/api/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    const exists = await User.findOne({
      email
    });

    if (exists) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    await User.create({
      name,
      email,
      password
    });

    res.status(201).json({
      message: 'Registration successful'
    });

  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});


// ==========================================
// LOGIN
// ==========================================

app.post('/api/login', async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
      password: req.body.password
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    res.json({
      message: 'Login successful',

      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});


// ==========================================
// GET ALL USERS
// ADMIN DASHBOARD
// ==========================================

app.get('/api/users', async (req, res) => {
  try {

    const users = await User.find(
      {},
      {
        name: 1,
        email: 1,
        role: 1,
        createdAt: 1
      }
    ).sort({
      createdAt: -1
    });

    res.json(users);

  } catch (e) {

    res.status(500).json({
      message: e.message
    });

  }
});


// ==========================================
// SUBMIT COMPLAINT
// ==========================================

app.post('/api/complaints', async (req, res) => {
  try {

    const {
      userEmail,
      anonymous,
      crimeType,
      description,
      location
    } = req.body;

    if (
      !crimeType ||
      !description ||
      !location
    ) {
      return res.status(400).json({
        message: 'Complete all required fields'
      });
    }

    const complaint = await Complaint.create({

      complaintId: newComplaintId(),

      userEmail:
        anonymous
          ? null
          : userEmail,

      anonymous: !!anonymous,

      crimeType,

      description,

      location

    });

    res.status(201).json(
      complaint
    );

  } catch (e) {

    res.status(500).json({
      message: e.message
    });

  }
});


// ==========================================
// GET COMPLAINTS
// ==========================================

app.get('/api/complaints', async (req, res) => {
  try {

    const filter = req.query.email
      ? {
          userEmail: req.query.email
        }
      : {};

    const complaints =
      await Complaint
        .find(filter)
        .sort({
          createdAt: -1
        });

    res.json(
      complaints
    );

  } catch (e) {

    res.status(500).json({
      message: e.message
    });

  }
});


// ==========================================
// UPDATE COMPLAINT STATUS
// ==========================================

app.patch('/api/complaints/:id', async (req, res) => {
  try {

    const complaint =
      await Complaint.findByIdAndUpdate(

        req.params.id,

        {
          status: req.body.status
        },

        {
          new: true
        }

      );

    if (!complaint) {

      return res.status(404).json({
        message: 'Complaint not found'
      });

    }

    res.json(
      complaint
    );

  } catch (e) {

    res.status(500).json({
      message: e.message
    });

  }
});


// ==========================================
// SEND SOS
// ==========================================

app.post('/api/sos', async (req, res) => {
  try {

    const {
      userEmail,
      latitude,
      longitude
    } = req.body;

    const alert =
      await SOS.create({

        userEmail,

        latitude,

        longitude

      });

    res.status(201).json({

      message:
        'SOS recorded in system',

      alert

    });

  } catch (e) {

    res.status(500).json({
      message: e.message
    });

  }
});


// ==========================================
// GET ACTIVE SOS ALERTS
// ==========================================

app.get('/api/sos', async (req, res) => {
  try {

    const alerts =
      await SOS
        .find({
          status: 'Active'
        })
        .sort({
          createdAt: -1
        });

    res.json(
      alerts
    );

  } catch (e) {

    res.status(500).json({
      message: e.message
    });

  }
});


// ==========================================
// START SERVER
// ==========================================

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);
