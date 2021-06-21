const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const userSchema = new mongoose.Schema({
      name: {
            type: String,
            required: true,
      },
      email: {
            type: String,
            required: true,
      },
      username: {
            type: String,
            required: true,
            min: 5,
      },
      password: {
            type: String,
            required: true,
      },
      about: {
            type: String,
            required: true,
      },
      imagePath : {
            type: String,
      },
      otp: {
            type: String,
      },
      otpValid: {
            type: Number,
      }
});

userSchema.pre('save', async function(next) {

      if (this.isModified('password')) {
            this.password = await bcryptjs.hash(this.password, 12);
      }

      next();
});

const user = new mongoose.model('user', userSchema);

module.exports = user;