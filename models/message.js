const mongoose = require('mongoose')
const Schema = mongoose.Schema

const MessageSchema = new Schema({
    name: String,
    phone: Number,
    email: String,
    subject: String,
    content: String,
    declared: {
        type: Boolean,
        default: true
    }
})

module.exports = mongoose.model('Message', MessageSchema)