const mongoose = require('mongoose')
const Schema = mongoose.Schema

const messageSchema = new Schema({
  _id: {type: Schema.Types.ObjectId, required: true},
  time: {type: Date, required: true},
  message: {type: String, required: true},
  image: {type: Schema.Types.ObjectId, required: false, ref: 'Image'},
  sender: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  // for notification and joining tables
  isNotification: {type: Boolean, default: false, required: true},
  chatId: {type: Schema.Types.ObjectId, ref: 'Chat', required: true},
})

module.exports = mongoose.model('Message', messageSchema)