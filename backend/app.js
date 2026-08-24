require('dotenv').config();

const dns = require('dns');

dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
]);

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const connectDB = require('./db');
const User = require('./user');
const Complaint = require('./complaint');
const SOS = require('./sos');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());


// ==========================================
// UPLOADS
// ==========================================

const uploadDirectory = path.join(
  __dirname,
  'uploads'
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true
  });
}

app.use(
  '/uploads',
  express.static(uploadDirectory)
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    cb(
      null,
      Date.now() + '-' + safeName
    );
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024
  }
});


// ==========================================
// COMPLAINT ID
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
// HOME
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
      password,
      role
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

    // Public registration can only create citizens.
    const safeRole =
      role === 'police'
        ? 'citizen'
        : role === 'admin'
          ? 'citizen'
          : 'citizen';

    await User.create({
      name,
      email,
      password,
      role: safeRole
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
// GET USERS
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
// CREATE POLICE USER
// ==========================================

app.post('/api/users/police', async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
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

    const police = await User.create({
      name,
      email,
      password,
      role: 'police'
    });

    res.status(201).json({
      message: 'Police account created',
      user: {
        name: police.name,
        email: police.email,
        role: police.role
      }
    });

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

    res.json(complaints);

  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});

// ==========================================
// TRACK COMPLAINT BY TRACKING ID
// ==========================================

app.get(
  '/api/complaints/track/:complaintId',
  async (req, res) => {
    try {
      const complaint =
        await Complaint.findOne({
          complaintId:
            req.params.complaintId
        });

      if (!complaint) {
        return res.status(404).json({
          message: 'Complaint not found'
        });
      }

      res.json(complaint);

    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);

// ==========================================
// UPDATE STATUS
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

    res.json(complaint);

  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});


// ==========================================
// ASSIGN OFFICER
// ==========================================

app.patch(
  '/api/complaints/:id/assign',
  async (req, res) => {
    try {
      const {
        officerEmail
      } = req.body;

      if (!officerEmail) {
        return res.status(400).json({
          message: 'Officer email is required'
        });
      }

      const officer = await User.findOne({
        email: officerEmail,
        role: 'police'
      });

      if (!officer) {
        return res.status(404).json({
          message: 'Police officer not found'
        });
      }

      const complaint =
        await Complaint.findByIdAndUpdate(
          req.params.id,

          {
            assignedOfficer:
              officer.email,

            status: 'Under Review'
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

      res.json({
        message: 'Officer assigned successfully',
        complaint
      });

    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


// ==========================================
// ACCEPT CASE
// ==========================================

app.patch(
  '/api/complaints/:id/accept',
  async (req, res) => {
    try {
      const {
        officerEmail
      } = req.body;

      const complaint =
        await Complaint.findById(
          req.params.id
        );

      if (!complaint) {
        return res.status(404).json({
          message: 'Complaint not found'
        });
      }

      if (
        complaint.assignedOfficer &&
        complaint.assignedOfficer !== officerEmail
      ) {
        return res.status(403).json({
          message: 'This case is assigned to another officer'
        });
      }

      complaint.assignedOfficer =
        officerEmail;

      complaint.acceptedAt =
        new Date();

      complaint.investigationStatus =
        'Accepted';

      complaint.status =
        'In Progress';

      await complaint.save();

      res.json({
        message: 'Case accepted',
        complaint
      });

    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


// ==========================================
// INVESTIGATION UPDATE
// ==========================================

app.post(
  '/api/complaints/:id/investigation',
  async (req, res) => {
    try {
      const {
        officerEmail,
        note
      } = req.body;

      if (!officerEmail || !note) {
        return res.status(400).json({
          message: 'Officer and investigation note are required'
        });
      }

      const complaint =
        await Complaint.findById(
          req.params.id
        );

      if (!complaint) {
        return res.status(404).json({
          message: 'Complaint not found'
        });
      }

      if (
        complaint.assignedOfficer &&
        complaint.assignedOfficer !== officerEmail
      ) {
        return res.status(403).json({
          message: 'This case is assigned to another officer'
        });
      }

      complaint.assignedOfficer =
        officerEmail;

      complaint.investigationStatus =
        'Investigating';

      complaint.status =
        'In Progress';

      complaint.investigationUpdates.push({
        note,
        officerEmail,
        createdAt: new Date()
      });

      await complaint.save();

      res.json({
        message: 'Investigation update added',
        complaint
      });

    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


// ==========================================
// COMPLETE INVESTIGATION
// ==========================================

app.patch(
  '/api/complaints/:id/complete',
  async (req, res) => {
    try {
      const {
        officerEmail,
        resolutionDetails
      } = req.body;

      const complaint =
        await Complaint.findById(
          req.params.id
        );

      if (!complaint) {
        return res.status(404).json({
          message: 'Complaint not found'
        });
      }

      if (
        complaint.assignedOfficer &&
        complaint.assignedOfficer !== officerEmail
      ) {
        return res.status(403).json({
          message: 'This case is assigned to another officer'
        });
      }

      complaint.assignedOfficer =
        officerEmail;

      complaint.investigationStatus =
        'Completed';

      complaint.resolutionDetails =
        resolutionDetails || '';

      complaint.status =
        'Resolved';

      await complaint.save();

      res.json({
        message: 'Investigation completed',
        complaint
      });

    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


// ==========================================
// UPLOAD EVIDENCE
// ==========================================

app.post(
  '/api/complaints/:id/evidence',
  upload.single('evidence'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'No evidence file uploaded'
        });
      }

      const complaint =
        await Complaint.findById(
          req.params.id
        );

      if (!complaint) {
        return res.status(404).json({
          message: 'Complaint not found'
        });
      }

      const uploadedBy =
        req.body.officerEmail ||
        req.body.uploadedBy ||
        'Unknown';

      complaint.evidence.push({
        originalName:
          req.file.originalname,

        filename:
          req.file.filename,

        path:
          '/uploads/' +
          req.file.filename,

        uploadedBy,

        uploadedAt:
          new Date()
      });

      await complaint.save();

      res.status(201).json({
        message: 'Evidence uploaded successfully',

        evidence:
          complaint.evidence[
            complaint.evidence.length - 1
          ],

        complaint
      });

    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


// ==========================================
// SOS
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
      message: 'SOS recorded in system',
      alert
    });

  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});


// ==========================================
// GET SOS
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

    res.json(alerts);

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