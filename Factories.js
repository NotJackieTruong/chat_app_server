// create unique id for each user
const mongoose = require('mongoose')

// create user
const createUser = ({name= "", socketId=null} = {})=>(
  {
    _id: mongoose.Types.ObjectId(),
    name,
    representPhoto: generateRandomColor(),
    socketId
  }
)

// create message
const createMessage = ({message="", sender=null, isNotification=false, isImage=false} = {})=>({
  // for message as a text
  _id: mongoose.Types.ObjectId(),
  time: new Date(Date.now()),
  message,
  sender,
  // for checking if a message is a notification message
  isNotification,
  isImage
})

const createFileMessage = ({name= "", type= "", size=0, data="",sender=null, isNotification=false, isImage=true}={})=>({
  _id: mongoose.Types.ObjectId(),
  time: new Date(Date.now()),
  // message
  name,
  type,
  size,
  data,
  
  sender,
  isNotification,
  isImage
})
// function to format the date
const getTime = (date)=>{
  return `${date.getHours()}:${("0"+date.getMinutes()).slice(-2)}`
}

const generateRandomColor= ()=> {
  let r = Math.round((Math.random() * 200))+ 50; //red 50 to 200
  let g = Math.round((Math.random() * 200)) + 50; //green 50 to 200
  let b = Math.round((Math.random() * 200))+ 50; //blue 50 to 200

  return 'rgb(' + r + ', ' + g + ', ' + b + ')'
};

// create chat
const createChat = ({messages=[],name="Unknown", users=[], hasNewMessages=false}={})=>({
  _id: mongoose.Types.ObjectId(),
  name,
  users,
  createdAt: new Date(Date.now()),
  representPhoto: generateRandomColor(),
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
  getTime,
  createFileMessage
  // createChatNameFromUser
}