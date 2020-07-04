const io = require('./index').io
const mongoose = require('mongoose')
const User = require('./models/user')
const Chat = require('./models/chat')
const Message = require('./models/message')


// import socket events
const { VERIFY_USER, USER_CONNECTED, LOGOUT, COMMUNITY_CHAT, MESSAGE_RECEIVED, MESSAGE_SENT, USER_DISCONNECTED, TYPING, PRIVATE_CHAT, NEW_CHAT_USER, ADD_USER_TO_CHAT, ACTIVE_CHAT, SIGN_UP, LOG_IN, DELETE_CHAT, CHANGE_CHAT_NAME } = require('./Events') // import namespaces
const { createMessage, createChat, createUser } = require('./Factories')
const user = require('./models/user')

let connectedUsers = {} // list of connected users
let communityChat = createChat({ isCommunity: true })

// socket.emit('something', 'another something') is used to send to sender-client only
// io.emit('something', 'another something') is used to send to all connected clients


// function to receive message on the server
module.exports = function (socket) {
  // check socket id
  console.log('socket id: ', socket.id)

  // function to emit a message to send a message from an user
  let sendMessageToChatFromUser;

  // function to emit a message to check whether user is typing
  let sendTypingFromUser;

  // receive verify event to verify user name
  // check if user is already in db
  socket.on(SIGN_UP, (nickname, callback) => {
    User.findOne({ name: nickname }, (err, result) => {
      if (err) throw err
      if (result) {
        callback({ isUserInDB: true, user: Object.assign({}, { _id: result._id, name: result.name }, { socketId: socket.id }), error: "User is already registered!" })

      } else {
        const user = new User({
          _id: mongoose.Types.ObjectId(),
          name: nickname,

        })
        user.save((err, result) => {
          if (err) throw err;
          console.log('User registered successfully!')
        })
        callback({ isUserInDB: false, user: Object.assign({}, { _id: user._id, name: user.name }, { socketId: socket.id }), error: "Registered successfully!" })

      }

    })

  })

  socket.on(LOG_IN, (nickname, callback) => {
    User.findOne({ name: nickname }, (err, result) => {
      if (err) throw err
      if (result) {
        if (isUserOnline(connectedUsers, result.name)) {
          callback({ isUserOnline: true, user: null, error: "User is already online!" })
        } else {
          callback({ isUserOnline: false, user: Object.assign({}, { _id: result._id, name: result.name }, { socketId: socket.id }), error: "Logged in successfully!" })
        }
      } else {
        callback({ isUserOnline: true, user: null, error: "User is not registered!" })
        console.log('Cannot find user')
      }

    })
  })

  // handle when user is connected
  socket.on(USER_CONNECTED, (user) => {
    connectedUsers = addUser(connectedUsers, user)
    socket.user = user

    sendMessageToChatFromUser = sendMessageToChat(user)
    sendTypingFromUser = sendTypingToChat(user)

    io.emit(USER_CONNECTED, connectedUsers)
    console.log('Connected user list: ', connectedUsers)
  
    // new method to push to db
    Chat.find({}).exec((err, chats) => {
      if (err) throw err
      if (chats) {
        chats.map(chat => {
          Message.find({ chatId: chat._id }).populate('sender').exec((err, results)=>{
            if (err) throw err
            if (results) {
              const newChat = Object.assign({}, chat._doc, { messages: results.map(result => result), typingUsers: [], hasNewMessages: false })
              newChat.users.map(userId => {
                for (let key in connectedUsers) {
                  if (JSON.stringify(connectedUsers[key]._id) === JSON.stringify(userId)) {
                    return connectedUsers[key]
                  }

                }
              }).map(user => {
                if (user) {
                  if (user._id === socket.user._id) {
                    socket.emit(PRIVATE_CHAT, newChat)
                  }
                }

              })
            }
          })

        })
      }
    })

    // old method to push to db
    // Chat.find({}).populate({path: 'messages', populate: [{path: 'sender'}]}).exec((err, results) => {
    //   if (err) throw err
    //   if (results) {
    //     results.map(result => {
    //       result.users.map(userId => {
    //         for (let key in connectedUsers) {
    //           if (JSON.stringify(connectedUsers[key]._id) === JSON.stringify(userId)) {
    //             return connectedUsers[key]
    //           }

    //         }
    //       }).map(user => {
    //         if (user) {
    //           // socket.to(user.socketId).emit(PRIVATE_CHAT, Object.assign({}, result._doc, { typingUsers: [] }))
    //           if (user._id === socket.user._id) {
    //             result._doc.messages
    //             socket.emit(PRIVATE_CHAT, Object.assign({}, result._doc, {typingUsers: [], hasNewMessages: false }))
    //           }
    //         }

    //       })

    //     })

    //   }
    // })

  })

  // receive user disconnected event
  socket.on('disconnect', () => {
    // check if the object 'socket' has property 'user'
    if (socket.hasOwnProperty('user')) {
      console.log(socket.user.name, 'just disconnected!')
      connectedUsers = removeUser(connectedUsers, socket.user.name)
      io.emit(USER_DISCONNECTED, connectedUsers)
      console.log('user connected list after disconnecting: ', connectedUsers)
    }
  })

  // receive user logout event
  socket.on(LOGOUT, () => {
    console.log(socket.user.name, 'just logged out!')
    connectedUsers = removeUser(connectedUsers, socket.user.name)
    io.emit(USER_DISCONNECTED, connectedUsers)
    console.log('user connected list after loggin out: ', connectedUsers)
  })

  // receive community_chat (default chat) event
  socket.on(COMMUNITY_CHAT, (callback) => {
    callback(communityChat)

  })

  // receive message event
  socket.on(MESSAGE_SENT, ({ chatId, message }) => {
    sendMessageToChatFromUser(chatId, message)
  })

  // receive typing event
  socket.on(TYPING, ({ chatId, isTyping }) => {
    sendTypingFromUser(chatId, isTyping)
  })

  // receive private chat event
  socket.on(PRIVATE_CHAT, ({ sender, receivers, chats }) => {
    const groupOfUsers = [...receivers, sender]
    const groupOfUserIds = groupOfUsers.map(user => user._id)
    const groupOfUserNames = groupOfUsers.map(user => user.name).join(', ')

    Chat.find({}, (err, results) => {
      if (err) throw err;
      if (results) {
        if (!checkIsCreated(groupOfUserIds, results)) {
          console.log('chat is not in db')
          const newChat = createChat({ name: groupOfUserNames, users: groupOfUserIds })
          const chat = new Chat({
            _id: mongoose.Types.ObjectId(newChat._id),
            name: newChat.name,
            isCommunity: newChat.isCommunity
          })
          groupOfUsers.map(user => {
            chat.users.push(mongoose.Types.ObjectId(user._id))
            // send chat to all users that is on user.socketId namespaces
            socket.to(user.socketId).emit(PRIVATE_CHAT, newChat)
          })
          // send chat to the sender
          socket.emit(PRIVATE_CHAT, newChat)
          socket.emit(ACTIVE_CHAT, newChat)

          // save chat to db
          chat.save(err => {
            if (err) throw err;
            console.log('Saved successfully!')
          })
        } else {
          console.log('chat is already in db')
        }
      } else {
        const newChat = createChat({ name: groupOfUserNames, users: groupOfUserIds })
        const chat = new Chat({
          _id: mongoose.Types.ObjectId(newChat._id),
          name: newChat.name,
          isCommunity: newChat.isCommunity
        })
        groupOfUsers.map(user => {
          chat.users.push(mongoose.Types.ObjectId(user._id))
          socket.to(user.socketId).emit(PRIVATE_CHAT, newChat)
        })
        console.log('newChat: ', newChat)
        socket.emit(PRIVATE_CHAT, newChat)

        chat.save(err => {
          if (err) throw err;
          console.log('Saved successfully!')
        })
      }

    })

  })

  socket.on(ADD_USER_TO_CHAT, ({ receivers, activeChat, chats }) => {
    // const receiverSocket = receiver.socketId
    const groupOfUserIds = activeChat.users.concat(receivers.map(receiver => receiver._id))
    const groupOfUserNames = activeChat.name.concat(receivers.map(receiver => ", " + receiver.name))

    activeChat.users.map(userId => {
      for (let key in connectedUsers) {
        if (JSON.stringify(connectedUsers[key]._id) === JSON.stringify(userId)) {
          return connectedUsers[key]
        }
      }
    }).map(user => {
      if (user) {
        // send new users to all users who are in user.socketId channel
        socket.to(user.socketId).emit(NEW_CHAT_USER, { chatId: activeChat._id, newUser: receivers })
      }
    })

    // send new users to the sender on NEW_CHAT_USER namespace
    socket.emit(NEW_CHAT_USER, { chatId: activeChat._id, newUser: receivers })

    // send an active chat to new users
    receivers.map(receiver => {
      socket.to(receiver.socketId).emit(PRIVATE_CHAT, Object.assign({}, activeChat, { name: groupOfUserNames, users: groupOfUserIds }))
    })

    // save to db
    Chat.findOneAndUpdate({ _id: mongoose.Types.ObjectId(activeChat._id) }, { users: groupOfUserIds, name: groupOfUserNames }, (err, result) => {
      if (err) throw err
      console.log('Update chat successfully!')
    })
  })

  socket.on(DELETE_CHAT, ({chatId})=>{
    Chat.findOneAndDelete({_id: chatId}, (err, result)=>{
      if(err) throw err;
      console.log('Delete Successfully!', result.users)
      if(result){
        result.users.map(userId => {
          for (let key in connectedUsers) {
            if (JSON.stringify(connectedUsers[key]._id) === JSON.stringify(userId)) {
              console.log(connectedUsers[key])
              return connectedUsers[key]
            }
          }
        }).map(user=>{
          if(user){
            socket.to(user.socketId).emit(DELETE_CHAT, result)
          }
        })
        socket.emit(DELETE_CHAT, result)

      }
    })
  })

  socket.on(CHANGE_CHAT_NAME, ({activeChat, newChatName})=>{
    Chat.findByIdAndUpdate(activeChat._id, {name: newChatName}, (err, result)=>{
      if(err) throw err
      console.log('resut: ', result)
      if(result){

        result.users.map(userId => {

          for (let key in connectedUsers) {
            if (JSON.stringify(connectedUsers[key]._id) === JSON.stringify(userId)) {
              return connectedUsers[key]
            }
          }
        }).map(user=>{
          if(user){
            socket.to(user.socketId).emit(CHANGE_CHAT_NAME, Object.assign({}, result, {name: newChatName}))

          }

        })
        socket.emit(CHANGE_CHAT_NAME, {chatId: activeChat._id, newChatName: newChatName})
      }
    })
  })
}

// function to add user
function addUser(userList, user) {
  let newList = Object.assign({}, userList)
  newList[user.name] = user
  return newList
}

// function to remove user
function removeUser(userList, username) {
  let newList = Object.assign({}, userList)
  delete newList[username]
  return newList
}

// function to check username whether it's in the list 
function isUserOnline(userList, username) {
  return username in userList
}

// function to send a message event
function sendMessageToChat(sender) {
  return (chatId, message) => {
    const newMessage = createMessage({ message, sender })
    io.emit(`${MESSAGE_RECEIVED}-${chatId}`, newMessage)
    const messageDB = new Message({
      _id: newMessage._id,
      time: newMessage.time,
      message: newMessage.message,
      sender: sender._id,
      chatId: chatId
    })
    messageDB.save()

  }

}

// function to send a typing event
function sendTypingToChat(sender) {
  return (chatId, isTyping) => {
    io.emit(`${TYPING}-${chatId}`, { sender, isTyping })
  }
}

// function to check if a chat is exists
function checkIsCreated(groupOfUsers, chats) {
  var isCreated = null
  chats.some(chat => {
    if (JSON.stringify(chat.users.sort()) === JSON.stringify(groupOfUsers.sort())) {
      return isCreated = true
    } else {
      isCreated = false
    }
  })
  return isCreated

}

function sendPrivateMessageToChat(sender, receiver) {

}