// create unique id for each user
const uuidv4 = require('bson-objectid')
const mongoose = require('mongoose')

// create user
const createUser = ({name= "", socketId=null} = {})=>(
  {
    id: mongoose.Types.ObjectId(),
    name,
    socketId
  }
)

// create message
const createMessage = ({message="", sender=""} = {})=>({
  id: mongoose.Types.ObjectId(),
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
  id: mongoose.Types.ObjectId(),
  messages,
  name: isCommunity? "Community": createChatNameFromUser(users),
  users,
  typingUsers: [],
  isCommunity
})

const createChatNameFromUser = (users, excludeUser = "")=>{
  return users.filter(u => u !== excludeUser).join(', ') || "Empty users"
}

module.exports ={
  createMessage,
  createChat,
  createUser,
  createChatNameFromUser
}