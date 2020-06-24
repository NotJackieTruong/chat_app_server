const app = require('http').createServer()
const io = module.exports.io = require('socket.io')(app)
const mongoose = require('mongoose')

const PORT = process.env.PORT || 3001
const socketManager = require('./socketManager')

mongoose.connect('mongodb://127.0.0.1:27017/chat_app_test', {useNewUrlParser: true})
mongoose.connection.on("error", err=>{
  console.log("Error: ", err)
})
mongoose.connection.on("connected", (err, res)=>{
  console.log("Mongo connected successfully! ")
})
// socketManager contains a function to handle emitting and receiving message
io.on('connection', socketManager)

app.listen(PORT, ()=>{
  console.log("Connected to port: ", PORT)
})
