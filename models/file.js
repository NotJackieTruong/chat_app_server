const mongoose = require('mongoose')
const Schema = mongoose.Schema

const fileSchema = new Schema({
    _id: {type: Schema.Types.ObjectId, required: true},
    time: {type: Date, required: true},
    name: {type: String, required: true},
    type: {type: String, required: true},
    size: {type: Number, required: true},
    data: {type: Array, required: true},
    blob: {type: Object, required: false}
})

module.exports = mongoose.model("File", fileSchema)