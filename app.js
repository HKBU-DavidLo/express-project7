let createError = require('http-errors')
let express = require('express')
let path = require('path')
let cookieParser = require('cookie-parser')
let logger = require('morgan')
const helmet = require('helmet')
let mongoose = require('mongoose')

require('dotenv').config()


const app = express()

let indexRouter = require('./routes/index')
let adminRouter = require('./routes/admin')


let uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PWD}@cluster0.tpjgn.azure.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
    console.log("mongoose is connected")
}).catch((err) => {
    console.log('mongoose connection error', err)
})

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(helmet())
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

//i18n setup

app.use('/', indexRouter)
app.use('/rw-admin', adminRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
