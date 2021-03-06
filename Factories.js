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
const createMessage = ({message="", sender=null, isNotification=false} = {})=>({
  // for message as a text
  _id: mongoose.Types.ObjectId(),
  time: Date.now(),
  message,
  sender,
  isNotification, // for checking if a message is a notification message
})

const createFile = ({name= "", type= "", size=0, data="", blob=null, sender=null, isNotification=false, isImage=true}={})=>({
  _id: mongoose.Types.ObjectId(),
  time: Date.now(),
  name,
  type,
  size,
  data,
  blob,
  // sender,
  // isNotification,
  // isImage
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
  createdAt: Date.now(),
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
  createFile
  // createChatNameFromUser
}