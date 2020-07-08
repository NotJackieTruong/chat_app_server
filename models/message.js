const mongoose = require('mongoose')
const Schema = mongoose.Schema

const messageSchema = new Schema({
  _id: {type: Schema.Types.ObjectId, required: true},
  time: {type: Date, required: true},
  message: {type: String, required: true},
  sender: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  isNotification: {type: Boolean, default: false, required: true},
  chatId: {type: Schema.Types.ObjectId, ref: 'Chat', required: true},
})

module.exports = mongoose.model('Message', messageSchema)