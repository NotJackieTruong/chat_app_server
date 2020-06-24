const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
  name: {type: String, required: true, min: 1, max: 50},
})

module.exports = mongoose.model('User', userSchema)
