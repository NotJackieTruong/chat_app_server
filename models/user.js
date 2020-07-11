const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
  _id: {type: Schema.Types.ObjectId, required: true},
  name: {type: String, required: true, min: 1, max: 50},
  representPhoto: {type: String, required: false, default: 'rgb(200, 200, 200)'}
})

module.exports = mongoose.model('User', userSchema)
