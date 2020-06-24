const mongoose = require('mongoose')
const Schema = mongoose.Schema

const chatSchema = new Schema({
  _id: {type: Schema.Types.ObjectId},
  name: {type: String, required: true,},
  // createdTime: {type: Date, required: true,},
  messages: [{type: Schema.Types.ObjectId, required: false, ref: 'Message'}],
  users:[{type: Schema.Types.ObjectId, required: true, ref: 'User'}],
  isCommunity: {type: Boolean, default: false}
})

module.exports = mongoose.model('Chat', chatSchema)