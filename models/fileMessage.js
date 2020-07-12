const mongoose = require('mongoose')
const Schema = mongoose.Schema

const fileMessageSchema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    name: {type: String, required: true},
    type: {type: String, required: true},
    size: {type: Number, required: true},
    data: {type: Array, rrequired: true},
    chatId: {type: Schema.Types.ObjectId, ref: "Chat"}
})

module.exports = mongoose.model("FileMessage", fileMessageSchema)