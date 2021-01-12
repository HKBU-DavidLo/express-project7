const express = require('express')
const router = express.Router()
const path = require('path')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const fs = require('fs')
const Publication = require('../models/publication')
const session = require('express-session')
const mongoose = require('mongoose')
const MongoStore = require('connect-mongo')(session)
const multer = require('multer')
const multerS3 = require('multer-s3')
const aws = require('aws-sdk')

aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-northeast-2'
})

const s3 = new aws.S3()

router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())
router.use(cookieParser())

router.use(session( {
  secret: 'richwell-landrich-secret',
  store: new MongoStore({ mongooseConnection: mongoose.connection, collection: 'login' }),
  name: 'landrich-admin',
  resave: true,
  saveUninitialized: false,
  cookie: { loggedIn: null, maxAge: 60*10000 }
}))

router.use((req, res, next) => {
  if (req.query.msg === 'fail') {
    res.locals.msg = `Sorry. This page is private.`
  } else {
    res.locals.msg = ``
  }
  next()
})

function isLoggedIn(req, res, next) {
  if (req.session.loggedIn) {
    next()
  } else {
    console.log(req.session)
    res.redirect('/rw-admin?msg=fail')
  }
}

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'express-p7',
    metadata: (req, file, cb) => {
      console.log('[metadata]: ', file.fieldname)
      cb(null, { fieldName: file.fieldname })
    },
    key: (req, file, cb) => {
      console.log('[upload -> key]: ', file)
      cb(null, req.body.uploadFileName)
    }
  })
})

router.get('/', (req, res, next) => {
  res.render('login')
})

router.post('/logout', isLoggedIn, (req, res, next) => {
  req.session.destroy(function(err) {
    if (err) return res.serverErrer(err)
    return res.redirect('/rw-admin')
  })
})

router.post('/process_login', (req, res, next) => {
  const password = req.body.password
  const username = req.body.username
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PWD) {
    req.session.loggedIn = true
    console.log(req.session)
    res.render('add_post', { message: '' })
  } else {
    res.redirect('/rw-admin?msg=fail')
  }
})

router.post('/add-post', isLoggedIn, (req, res, next) => {
  let docDate = req.body.doc_date.toString().replace(/-/g, '')
  let engTitle = req.body.engTitle
  let TCTitle = req.body.TCTitle
  let SCTitle = req.body.SCTitle
  let docType = req.body.gridRadios
  let timeNow = Date.now().toString()
  let filename = `/${docType}/${docType}${docDate}${timeNow}.pdf`
  console.log(filename)
  let publication = new Publication({
    docEngTitle: engTitle,
    docTCTitle: TCTitle,
    docSCTitle: SCTitle,
    docDate: docDate,
    docType: docType,
    docTime: timeNow
  })
  publication.save()
    .then(pub => {
      console.log('publication saved')
      res.render('uploadFile', { filename: filename, language: "Chinese" })
    })
    .catch(err => {
      console.log('Cannot be saved')
      console.error(err)
    })
})

router.post('/upload-file', upload.single('file'), (req, res, next) => {
  let filename = req.body.uploadFileName.slice(4)
  console.log('[processing upload-file]: ', filename)
  res.render('uploadFile', { filename: filename, language: 'English' })
})

router.post('/upload-complete', upload.single('file'), (req, res, next) => {
  res.render('add_post', { message: 'upload documents completed' })
})

router.get('/manage', isLoggedIn, (req, res, next) => {
  res.render('manage')
})

router.get('/announcement', isLoggedIn, async (req, res, next) => {
  const announcements = await Publication.find({ docType: "ann" })
  res.render('manage_doc', { documents: announcements, title: 'Announcements' })
})

router.get('/circular', isLoggedIn, async (req, res, next) => {
  const circulars = await Publication.find({ docType: "circular" })
  res.render('manage_doc', { documents: circulars, title: 'Circulars' })
})

router.get('/financial', isLoggedIn, async (req, res, next) => {
  const financials = await Publication.find({ docType: "fin" })
  res.render('manage_doc', { documents: financials, title: 'Financial Reports' })
})

router.get('/prospectus', isLoggedIn, async (req, res, next) => {
  const prospectuses = await Publication.find({ docType: "prospectus" })
  res.render('manage_doc', { documents: prospectuses, title: 'Prospectuses' })
})

router.get('/return', isLoggedIn, async (req, res, next) => {
  const returns = await Publication.find({ docType: "return" })
  res.render('manage_doc', { documents: returns, title: 'Other Returns' })
})

router.get('/cg', isLoggedIn, async (req, res, next) => {
  const cgs = await Publication.find({ docType: "cg" })
  res.render('manage_doc', { documents: cgs, title: 'CG Documents' })
})

router.get('/delete-post/:id', isLoggedIn, async (req, res, next) => {
  const document = await Publication.findOne({ _id: req.params.id })
  res.render('delete_post', { document: document })
})

router.post('/delete-post/:id', isLoggedIn, async (req, res, next) => {
  const document = await Publication.findOne({ _id: req.params.id })
  let chiS3Params = {
    Bucket: 'express-p7',
    Key: document.chiUrl
  }
  let engS3Params = {
    Bucket: 'express-p7',
    Key: document.engUrl
  }
  s3.deleteObject(chiS3Params, function(err, data) {
    if (err) console.log(err, err.stack)
    else console.log()
  })
  s3.deleteObject(engS3Params, function(err, data) {
    if (err) console.log(err, err.stack)
    else console.log()
  })

  Publication.deleteOne({ _id: req.params.id })
    .then(result => res.render('add_post', { message: 'delete documents completed' }))
    .catch(err => console.error(err))
})

module.exports = router
