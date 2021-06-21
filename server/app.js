const express = require('express')
const dotenv = require('dotenv')
const conn = require('./db')
const app = express();

app.use(express.json())
app.use('/avatar', express.static('media'))
app.use(require('./urls'))
conn();
dotenv.config({path: '../config.env'})
const PORT = process.env.PORT


app.listen(PORT, ()=>{
      console.log(`Server is running on PORT ${PORT}`)
})