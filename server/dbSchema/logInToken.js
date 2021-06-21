const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({path: '../config.env'});

const logInSchema = new mongoose.Schema({
      username: {
            type: String,
            required: true,
            min: 5,
      },
      token: {
            type: String,
            required: true,
      },
});

const logToken = new mongoose.model('logInToken', logInSchema);

module.exports = logToken;