const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({path: '../config.env'});
const HOST = process.env.DB_HOST;

const conn = async () => {
      try {
            await mongoose.connect(HOST, {
                  useNewUrlParser: true,
                  useUnifiedTopology: true,
            });
            console.log('Connected to DataBase!!!');
      } catch(err) {
            console.log(err);
      }
}

module.exports =  conn;
