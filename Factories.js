// create unique id for each user
const mongoose = require('mongoose')

// create user
const createUser = ({name= "", socketId=null} = {})=>(
  {
    _id: mongoose.Types.ObjectId(),
    name,
    socketId
  }
)

// create message
const createMessage = ({message="", sender=null, isNotification=false} = {})=>({
  _id: mongoose.Types.ObjectId(),
  time: new Date(Date.now()),
  message,
  sender,
  isNotification
})

// function to format the date
const getTime = (date)=>{
  return `${date.getHours()}:${("0"+date.getMinutes()).slice(-2)}`
}

// create chat
const createChat = ({messages=[],name="Unknown", users=[], hasNewMessages=false}={})=>({
  _id: mongoose.Types.ObjectId(),
  name,
  users,
  createdAt: new Date(Date.now()),
  messages,
  typingUsers: [],
  hasNewMessages
})

// const createChatNameFromUser = (users, excludeUser = "")=>{
//   return users.filter(u => u !== excludeUser).join(', ') || "Empty users"
// }

module.exports ={
  createMessage,
  createChat,
  createUser,
  getTime
  // createChatNameFromUser
}