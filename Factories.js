// create unique id for each user
const uuidv4 = require('bson-objectid')
// create user
const createUser = ({name= "", socketId=null} = {})=>(
  {
    id: uuidv4(),
    name,
    socketId
  }
)

// create message
const createMessage = ({message="", sender=""} = {})=>({
  id: uuidv4(),
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
  id: uuidv4(),
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