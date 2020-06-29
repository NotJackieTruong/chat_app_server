const mongoose = require('mongoose')
const Schema = mongoose.Schema

const chatSchema = new Schema({
  _id: {type: Schema.Types.ObjectId, required: true},
  name: {type: String, required: true,},
  users:[{type: Schema.Types.ObjectId, required: true, ref: 'User'}],
  isCommunity: {type: Boolean, default: false},
  // messages: [{type: Schema.Types.ObjectId, required: false, ref: 'Message'}],

})

module.exports = mongoose.model('Chat', chatSchema)