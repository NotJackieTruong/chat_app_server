const mongoose = require('mongoose')
const Schema = mongoose.Schema

const messageSchema = new Schema({
  time: {type: Date, required: true},
  message: {type: String, required: true},
  sender: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  chatId: {type: Schema.Types.ObjectId, ref: 'Chat', required: true}
})

module.exports = mongoose.model('Message', messageSchema)