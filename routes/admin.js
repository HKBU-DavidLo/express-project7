const express = require('express')
const router = express.Router()
const path = require('path')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const formidable = require('formidable')
const fs = require('fs')
const Publication = require('../models/publication')
const session = require('express-session')
const mongoose = require('mongoose')
const MongoStore = require('connect-mongo')(session)
const aws = require('aws-sdk')

aws.config.region = 'ap-northeast-2'
const S3_BUCKET = process.env.S3_BUCKET

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
    res.render('add_post')
  } else {
    res.redirect('/rw-admin?msg=fail')
  }
})

////////// TESTING //////////////////
router.get('/test', (req, res, next) => {
  res.render('add_post')
})
////////// TESTING //////////////////

router.post('/add-post', isLoggedIn, (req, res, next) => {
  const form = new formidable.IncomingForm()
  form.uploadDir = path.join(__dirname, '..', 'public', 'ir')
  let docDate, engTitle, TCTitle, SCTitle, docType
  const s3 = new aws.S3()

  form.parse(req, function(err, fields, files) {
      let formObj = JSON.parse(JSON.stringify(fields))
      docDate = formObj.doc_date.replace(/-/g, '')
      engTitle = formObj.engTitle
      TCTitle = formObj.TCTitle
      SCTitle = formObj.SCTitle
      docType = formObj.gridRadios
      let newfileNames = []
      let timeNow = Date.now().toString()
      newfileNames.push(path.join('chi', docType, docType + docDate + timeNow + '.pdf'))
      newfileNames.push(path.join('eng', docType, docType + docDate + timeNow + '.pdf'))
      //newfileNames.push('chi/' + docType + '/' + docType + docDate + timeNow + '.pdf')
      //newfileNames.push('eng/' + docType + '/' + docType + docDate + timeNow + '.pdf')
      let oldPaths = []
      oldPaths.push(JSON.parse(JSON.stringify(files)).chi_file.path)
      oldPaths.push(JSON.parse(JSON.stringify(files)).eng_file.path)
      for (let i=0; i<2; i++) {
          fs.rename(oldPaths[i], path.join(form.uploadDir, newfileNames[i]), (err) => {
              if (err) throw err
          })
      }

      
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
          })
          .catch(err => {
              console.error(err)
          })
      res.send('done')
  })
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

router.post('/delete-post/:id', isLoggedIn, (req, res, next) => {
  Publication.deleteOne({ _id: req.params.id })
    .then(result => res.send('document deleted'))
    .catch(err => console.error(err))
})

module.exports = router
