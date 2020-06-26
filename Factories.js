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
const createMessage = ({message="", sender=null} = {})=>({
  _id: mongoose.Types.ObjectId(),
  time: getTime(new Date(Date.now())),
  message,
  sender
})

// function to format the date
const getTime = (date)=>{
  return `${date.getHours()}:${("0"+date.getMinutes()).slice(-2)}`
}

// create chat
const createChat = ({messages=[], name= "Community", users=[], isCommunity = false}={})=>({
  _id: mongoose.Types.ObjectId(),
  messages,
  name: isCommunity? "Community": name,
  users,
  typingUsers: [],
  isCommunity
})

// const createChatNameFromUser = (users, excludeUser = "")=>{
//   return users.filter(u => u !== excludeUser).join(', ') || "Empty users"
// }

module.exports ={
  createMessage,
  createChat,
  createUser,
  // createChatNameFromUser
}