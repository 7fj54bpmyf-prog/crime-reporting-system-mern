require('dotenv').config();

const dns = require('dns');

dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
]);

const mongoose = require('mongoose');
const User = require('./user');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected.');

    const existingAdmin = await User.findOne({
      role: 'admin'
    });

    if (existingAdmin) {
      console.log(
        'Admin already exists:',
        existingAdmin.email
      );

      await mongoose.disconnect();
      process.exit(0);
    }

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@crime.com',
      password: 'Admin123',
      role: 'admin'
    });

    console.log('');
    console.log('Admin created successfully!');
    console.log('Email: admin@crime.com');
    console.log('Password: Admin123');
    console.log('ID:', admin._id);
    console.log('');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error(
      'Error creating admin:',
      error.message
    );

    process.exit(1);
  }
}

createAdmin();