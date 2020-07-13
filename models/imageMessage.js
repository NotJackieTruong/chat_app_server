const mongoose = require('mongoose')
const Schema = mongoose.Schema

const imageMessageSchema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    time: {type: Date, required: true},
    name: {type: String, required: true},
    type: {type: String, required: true},
    size: {type: Number, required: true},
    data: {type: Array, rrequired: true},
    sender: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    isNotification: {type: Boolean, default: false, required: true},
    chatId: {type: Schema.Types.ObjectId, ref: 'Chat', required: true}
})

module.exports = mongoose.model("ImageMessage", imageMessageSchema)