const express = require('express')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const router = express.Router()
const User = require('./dbSchema/userSchema')
const logToken = require('./dbSchema/logInToken')
const jwToken = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const storage = multer.diskStorage({
      destination: function (req, file, cb) {
            cb(null, __dirname + '/media/')
      },

      filename: function (req, file, cb) {
            const d = (new Date(Date.now()).toISOString()).replace(/:/g, '-')
            cb(null, file.fieldname + '_' + d + '_' + file.originalname)
      }
})

const fileFilter = (req, file, cb) => {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true)
      } else {
            cb(null, false)
      }
}

const upload =  multer({ storage: storage, fileFilter: fileFilter })

const otpGenerator = () => {
      const digits = '0123456789'
      let OTP = ''

      for (let i = 0; i < 6; i++) {
            OTP += digits[Math.floor(Math.random() * 10)]
      }
      return OTP
}

const decrypt = (enc) => {

      if (!enc) {
            return null
      }
      
      try {
            const data = jwToken.verify(enc, process.env.KEY)
            return data
      } catch {
            return null
      }
}

router.post('/login', async (req, res) => {

      try {
            const data = decrypt(req.body.data);

            if (!data) {
                  return res.status(422).json({"error": "Invalid Data"})
            }

            const {username, password, iat} = data

            if (!username || !password || !iat || !validator.isAlphanumeric(username)) {
                  return res.status(422).json({"error": "Fill form properly"})
            }

            const user = await User.findOne({username: username})
            
            if (user) {
                  const flag = await bcryptjs.compare(password, user.password)
                  
                  if (flag) {
                        const log = await logToken.findOne({username: username})
                        const token = await log.token
                        
                        res.cookie("auth", token, {
                              expires: new Date(Date.now() + 30*3600000*24),
                              httpOnly: true
                        })
                        console.log('hello')
                        return res.status(202).json({"data": jwToken.sign({"username": username, "token": token}, process.env.KEY)})
                  } else {
                        return res.status(422).json({"error": "Wrong Credentials"})
                  }
            } else {
                  return res.status(422).json({"error": "Wrong Credentials"})
            }

      } catch {
            return res.status(422).json({"error": "Some Error Encountered"})
      }
})


router.post('/register', upload.single('avatar'), async (req, res) => {

      try {
            const data = decrypt(req.body.data)
            
            if (!data) {
                  return res.status(422).json({"error": "Invalid Data"})
            }

            const {name, email, username, password, about, iat} = data

            if (!name || !email || !username || !password || !about || !iat || !validator.isEmail(email) || !validator.isAlphanumeric(username)) {
                  return res.status(422).json({"error": "Form not filled properly"})
            }
            
            const ue1 = await User.findOne({email: email})
            const ue2 = await User.findOne({username: username})
            
            if (ue1 || ue2) {
                  return res.status(422).json({"error": "Username or Email is already registered"})
            }

            let imgPath;
            
            if (!req.file) {
                  imgPath = path.join(__dirname, path.join('media', 'avatar_default.png'))
            } else {
                  imgPath = req.file.path
            }

            const obj = new User({
                  name, email, username, password, about, imagePath: imgPath
            })

            const token = jwToken.sign({_id: email}, process.env.KEY)

            const obj_1 = new logToken({
                  username: username,
                  token: token,
            })
            
            await obj.save()
            await obj_1.save()
      
            return res.status(201).json({"message":"Account Created Successfully"})
      } catch {
            return res.status(422).json({"error": "Some Error Encountered"})
      }
      
})

router.delete('/data', async(req, res) => {

      try {
            const data = decrypt(req.body.data);
            
            if (!data || !data.token) {
                  return res.status(422).json({"error": "Invalid Data"})
            }

            const log = await logToken.findOne({token: data.token})
            const username = await log.username
            let img = await User.findOne({username: username})
            img = img.imagePath
            
            if (!img.includes('avatar_default.png')) {
                  
                  const imgP = './media/' + path.parse(img).base

                  fs.unlink(imgP, () => {
                        return
                  })
            }

            await logToken.deleteOne({username: username})
            await User.deleteOne({username: username})

            return res.status(202).json({"message": "Account Deleted Successfully"})
      } catch {
            return res.status(422).json({"error": "Some Error Encountered"})
      }

})

router.get('/data', async (req, res) => {
      const username = req.query.username
      const user = await User.findOne({username: username})

      if (user) {
            const obj = {
                  name: user.name,
                  username: user.username,
                  email: user.email,
                  about: user.about,
                  profileImg: user.imagePath
            }

            const encrypt = jwToken.sign(obj, process.env.KEY)

            return res.status(200).json({"data": encrypt})
      } else {
            return res.status(422).json({"error": "Wrong Username"})
      }
})

router.put('/data', upload.single('avatar'), async (req, res) => {
      
      try {
            const data = decrypt(req.body.data);
            
            if (!data) {
                  return res.status(422).json({"error": "Invalid Data"})
            }

            const { token, usernameN, about, iat } = data

            if (!token || !about || !usernameN || !iat) {
                  return res.status(404).json({"error": "No data received"})
            }

            if (!validator.isAlphanumeric(usernameN)) {
                  return res.status(422).json({"error": "Fill form properly"})
            }

            const check = await logToken.findOne({username: usernameN})
            const log = await logToken.findOne({token: token})
            const username = await log.username
            
            if (check && username != usernameN) {
                  return res.status(422).json({"error": "Username is already taken"})
            }

            if (req.file) {
                  let img = await User.findOne({username: username})
                  img = img.imagePath
                  
                  if (!img.includes('avatar_default.png')) {
                        
                        const imgP = './media/' + path.parse(img).base

                        fs.unlink(imgP, () => {
                              return
                        })
                  }

                  await User.updateOne({username:username}, {$set:{imgPath: req.file.path}})
            }

            await User.updateOne({username:username}, {$set:{username:usernameN, about:about}})
            await logToken.updateOne({username:username}, {$set:{username:usernameN}})

            return res.status(202).json({"message": "Account Updated Successfully"})
      } catch {
            return res.status(422).json({"error": "Some Error Encountered"})
      }
})

router.get('/otp', async(req, res) => {
      
      try {
            const data = decrypt(req.body.data);
            
            if (!data) {
                  return res.status(422).json({"error": "Invalid Data"})
            }

            const { token, iat } = data

            if (!token || !iat) {
                  return res.status(404).json({"error": "No data received"})
            }

            let user;

            if (validator.isEmail(token)) {
                  user = await User.findOne({email:token})
            } else if (validator.isAlphanumeric(token)) {
                  user = await User.findOne({username:token})
            } else {
                  return res.status(404).json({"error": "False Data"})
            }

            if (!user) {
                  return res.status(422).json({"err": "Invalid Data"})
            }

            const otp = otpGenerator()

            await User.updateOne({username:user.username}, {$set: {otp: otp, otpValid: Date.now()}})
            return res.status(201).json({"message" : "OTP Sent Successfully"})
      } catch {
            return res.status(422).json({"error": "Some Error Encountered"})
      }
})

router.post('/forget', async(req, res) => {

      try {
            const data = decrypt(req.body.data);
            
            if (!data) {
                  return res.status(422).json({"error": "Invalid Data"})
            }

            const { cere, otp, password, iat } = data;

            if (!cere || !otp || !password || !iat) {
                  return res.status(404).json({"error": "No data received"})
            }
            
            if (otp.length != 6) {
                  return res.status(404).json({"error": "False Data"})
            }

            let user;

            if (validator.isEmail(cere)) {
                  user = await User.findOne({email:cere})
            } else if (validator.isAlphanumeric(cere)) {
                  user = await User.findOne({username:cere})
            } else {
                  return res.status(404).json({"error": "False Data"})
            }
            
            const otp_v = await user.otp
            let t = (Date.now() - user.otpValid)/60000

            if (t > 15) {
                  return res.status(404).json({"error": "OTP expired"})
            }


            if (otp == otp_v) {
                  const passN = await bcryptjs.hash(password, 12);
                  await User.updateOne({username: user.username}, {$set:{password: passN, otp: "$%@#)@#($"}})
                  return res.status(201).json({"message": "Password Changed Successfully"})
            } else {
                  return res.status(422).json({"error" : "User Not Verified"})
            }

      } catch {
            return res.status(422).json({"error": "Some Error Encountered"})
      }
})


router.put('/forget', async(req, res) => {
      try {
            const data = decrypt(req.body.data);
            
            if (!data) {
                  return res.status(422).json({"error": "Invalid Data"})
            }

            const { token, oPass, nPass, iat } = data;

            if (!token || !oPass || !nPass || !iat) {
                  return res.status(422).json({"err": "Invalid Data"})
            }

            const log = await logToken.findOne({token: token})
            const user = await User.findOne({username: await log.username}) 

            if (!user) {
                  return res.status(422).json({"err": "Invalid Data"})
            }

            const flag = await bcryptjs.compare(oPass, user.password)

            if (flag) {
                  const encryptPass = await bcryptjs.hash(nPass, 12);
                  await User.updateOne({username: user.username}, {$set:{password: encryptPass}})
                  return res.status(202).json({"message": "Password Changed Successfully"})
            } else {
                  return res.status(422).json({"err": "Invalid Data"})
            }
      } catch {
            return res.status(422).json({"error": "Some Error Encountered"})
      }
})

router.post('/encrypt', (req, res) => {
      return res.status(200).json({data: jwToken.sign(req.body, process.env.KEY)})

})

router.post('/decrypt', (req, res) => {
      return res.status(200).json({data: jwToken.decode(req.body.data, process.env.KEY)})
})

router.all('*', (req, res) => {
      res.status(404).send('<h1 style="text-align:center;margin-top:40px">😐😐😐YOU ARE NOT ALLOWED VISIT THIS PAGE!!!😐😐😐</h1>')
})

module.exports = router