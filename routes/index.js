const express = require('express')
const router = express.Router()
const Publication = require('../models/publication')
const Message = require('../models/message')
const bodyParser = require('body-parser')
let path = require('path')
const i18n = require('i18n')

router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())

i18n.configure({
  locales: ['en', 'zh_cn', 'zh_hk'],
  directory: path.join(__dirname, '..', 'i18n'),
  defaultLocale: 'zh_hk'
})

router.use(i18n.init)

router.use('/zh_hk', (req, res, next) => {
  res.setLocale('zh_hk')
  res.locals.lang = "zh_hk"
  next()
})

router.use('/en', (req, res, next) => {
  res.setLocale('en')
  res.locals.lang = "en"
  next()
})

router.use('/zh_cn', (req, res, next) => {
  res.setLocale('zh_cn')
  res.locals.lang = "zh_cn"
  next()
})

router.get('/', function(req, res, next) {
  res.redirect('/zh_hk/index')
})

router.get('/:locale/index', (req, res, next) => {
  let pageTitle = res.__('ListCo Name')
  res.render('index', { 
    pageTitle: pageTitle,
    path: '/index' })
}) 

router.get('/:locale/about', function(req, res, next) {
  let pageTitle = res.__('about')
  res.render('about', {
    pageTitle: pageTitle,
    path: '/about'
  })
})

router.get('/:locale/services', function(req, res, next) {
  let pageTitle = res.__('services')
  res.render('services', {
    pageTitle: pageTitle,
    path: '/services'
  })
})

router.get('/:locale/projects', function(req, res, next) {
  let pageTitle = res.__('projects')
  res.render('projects', {
    pageTitle: pageTitle,
    path: '/projects'
  })
})

router.get('/:locale/contact', function(req, res, next) {
  if (req.query.sent == 'ok') {
    if (req.params.locale == 'en') {
      res.locals.okmsg = 'Your message is sent, thank you'
    } else if (req.params.locale == 'zh_cn') {
      res.locals.okmsg = '您的留言已提交。'
    } else {
      res.locals.okmsg = '您的留言已發出，謝謝！'
    }
  } else {
    res.locals.okmsg = ''
  }

  let pageTitle = res.__('contact')
  res.render('contact', {
    pageTitle: pageTitle,
    path: '/contact'
  })
})

router.post('/:locale/submit-message', (req, res, next) => {
  let message = new Message({
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email,
    subject: req.body.topic,
    content: req.body.content,
    declared: req.body.declare
  })
  message.save()
    .then(pub => {
        console.log('message saved')
        res.redirect('/' + req.params.locale + '/contact?sent=ok')
    })
    .catch(err => {
        console.error(err)
    })
})

router.get('/:locale/disclaimer', function(req, res, next) {
  let pageTitle = res.__('disclaimer')
  res.render('disclaimer', {
    pageTitle: pageTitle,
    path: '/disclaimer'
  })
})

router.get('/:locale/investors', async function(req, res, next) {
  let pageTitle = res.__('investors')
  let docTitle, docUrl
  if (req.params.locale == 'en') {
    docTitle = 'docEngTitle'
    docUrl = 'engUrl'
  } else if (req.params.locale == 'zh_cn') {
    docTitle = 'docSCTitle'
    docUrl = 'chiUrl'
  } else {
    docTitle = 'docTCTitle'
    docUrl = 'chiUrl'
  }

  const announcements = await Publication.find({ docType: "ann" }).sort('docDate')
  const circulars = await Publication.find({ docType: "circular" }).sort('docDate')
  const financials = await Publication.find({ docType: "fin" }).sort('docDate')
  const prospectuses = await Publication.find({ docType: "prospectus" }).sort('docDate')
  const returns = await Publication.find({ docType: "return" }).sort('docDate')
  const cgs = await Publication.find({ docType: "cg" }).sort('docDate')

  res.render('investors', {
    pageTitle: pageTitle,
    path: '/investors',
    announcements: announcements,
    circulars: circulars,
    financials: financials,
    prospectuses: prospectuses,
    returns: returns,
    cgs: cgs,
    docTitle: docTitle,
    docUrl: docUrl
  })
})

module.exports = router
