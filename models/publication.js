const mongoose = require('mongoose')
const Schema = mongoose.Schema

const PublicationSchema = new Schema({
    docEngTitle: String,
    docTCTitle: String,
    docSCTitle: String,
    docDate: String,
    docType: String,
    docTime: String,
})

PublicationSchema.virtual('chiUrl').get(function() {
    let filepath = 'chi/' + this.docType + '/' + 
        this.docType + this.docDate + this.docTime + '.pdf'
    return filepath
})

PublicationSchema.virtual('engUrl').get(function() {
    let filepath = 'eng/' + this.docType + '/' + 
        this.docType + this.docDate + this.docTime + '.pdf'
    return filepath
})

module.exports = mongoose.model('Publication', PublicationSchema)