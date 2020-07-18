const io = require('./index').io
const mongoose = require('mongoose')
const User = require('./models/user')
const Chat = require('./models/chat')
const Message = require('./models/message')
const File = require('./models/file')
const async = require('async')
// import socket events
const { VERIFY_USER, USER_CONNECTED, LOGOUT, COMMUNITY_CHAT, MESSAGE_RECEIVED, 
        MESSAGE_SENT, USER_DISCONNECTED, TYPING, PRIVATE_CHAT, 
        NEW_CHAT_USER, ADD_USER_TO_CHAT, ACTIVE_CHAT, SIGN_UP, VIDEO_CALL,
        LOG_IN, DELETE_CHAT, CHANGE_CHAT_NAME, USERS_IN_CHAT, LEAVE_GROUP,  } = require('./Events') // import namespaces
const { createMessage, createChat, createUser, createFile } = require('./Factories')
const message = require('./models/message')

let connectedUsers = {} // list of connected users
let communityChat = createChat({ isCommunity: true })

// socket.emit('something', 'another something') is used to send to sender-client only
// io.emit('something', 'another something') is used to send to all connected clients


// function to receive message on the server
module.exports = function (socket) {
  // function to emit a message to send a message from an user
  let sendMessageToChatFromUser;
  console.log('SocketId: ', socket.id)
  // function to emit a message to check whether user is typing
  let sendTypingFromUser;
  socket.binaryType = 'arraybuffer'

  // receive verify event to verify user name
  // check if user is already in db
  socket.on(SIGN_UP, (nickname, callback) => {
    User.findOne({ name: nickname }, (err, result) => {
      if (err) throw err
      if (result) {
        callback({ isUserInDB: true, user: Object.assign({}, { _id: result._id, name: result.name, representPhoto: result.representPhoto }, { socketId: socket.id }), error: "User is already registered!" })

      } else {
        const newUser = createUser({ name: nickname, socketId: socket.id })
        const user = new User({
          _id: newUser._id,
          name: newUser.name,
          representPhoto: newUser.representPhoto

        })
        user.save((err, result) => {
          if (err) throw err;
          console.log('User registered successfully!')
        })
        callback({ isUserInDB: false, user: newUser, error: "Registered successfully!" })

      }

    })

  })

  socket.on(VERIFY_USER, (nickname, callback) => {
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
          callback({ isUserOnline: false, user: Object.assign({}, { _id: result._id, name: result.name, representPhoto: result.representPhoto }, { socketId: socket.id }), error: "Logged in successfully!" })
        }
      } else {
        callback({ isUserOnline: true, user: null, error: "User is not registered!" })
      }

    })
  })

  // handle when user is connected
  socket.on(USER_CONNECTED, (user) => {
    connectedUsers = addUser(connectedUsers, user)
    socket.user = user

    // list of connected users
    console.log('Connected: ', connectedUsers)
    sendMessageToChatFromUser = sendMessageToChat(user)
    sendTypingFromUser = sendTypingToChat(user)
    const arrayConnectedUsers = Object.values(connectedUsers)
    io.emit(USER_DISCONNECTED, arrayConnectedUsers)

    // new method to find document from db and send to client
    Chat.find({users: socket.user._id}).sort({ "createdAt": -1 }).exec((err, chats) => {
      if (err) throw err
      if (chats) {
        chats.map(chat => {
          Message.find({ chatId: chat._id }).populate([{ path: 'sender', model: 'User' }, { path: 'file', model: 'File' }]).exec((err, results) => {
            if (err) throw err
            if (results) {
              var newChat = Object.assign({}, chat._doc, { messages: results.map(result => result), typingUsers: [], hasNewMessages: false })
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

  })

  // receive user disconnected event
  socket.on('disconnect', () => {
    // check if the object 'socket' has property 'user'
    if (socket.hasOwnProperty('user')) {
      connectedUsers = removeUser(connectedUsers, socket.user.name)
      const arrayConnectedUsers = Object.values(connectedUsers)
      io.emit(USER_DISCONNECTED, arrayConnectedUsers)
      console.log('Disconnected: ', socket.user)

    }
  })

  // receive user logout event
  socket.on(LOGOUT, () => {
    connectedUsers = removeUser(connectedUsers, socket.user.name)
    const arrayConnectedUsers = Object.values(connectedUsers)
    io.emit(USER_DISCONNECTED, arrayConnectedUsers)
    console.log('Disconnected: ', connectedUsers)
  })

  // receive community_chat (default chat) event
  socket.on(COMMUNITY_CHAT, (callback) => {
    callback(communityChat)

  })

  // receive message event
  socket.on(MESSAGE_SENT, ({ chatId, message, isNotification }) => {

    sendMessageToChatFromUser(chatId, message, isNotification)
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
    if (receivers.length !== 0) {
      Chat.find({}, (err, results) => {
        if (err) throw err;
        if (results) {
          if (!checkIsCreated(groupOfUserIds, results)) {
            console.log('chat is not in db')
            const newChat = createChat({ name: groupOfUserNames, users: groupOfUserIds })
            const chat = new Chat({
              _id: mongoose.Types.ObjectId(newChat._id),
              name: newChat.name,
              createdAt: newChat.createdAt,
              representPhoto: newChat.representPhoto
            })
            groupOfUsers.map(user => {
              chat.users.push(mongoose.Types.ObjectId(user._id))
              // send chat to all users that is on user.socketId namespaces
              socket.to(user.socketId).emit(PRIVATE_CHAT, newChat)
            })
            // send chat to the sender
            socket.emit(PRIVATE_CHAT, newChat)
            socket.emit(ACTIVE_CHAT, newChat)
            sendMessageToChatFromUser(newChat._id, `${sender.name} craeted the group.`, true)

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
            createdAt: newChat.createdAt,
            representPhoto: newChat.representPhoto
          })
          groupOfUsers.map(user => {
            chat.users.push(mongoose.Types.ObjectId(user._id))
            socket.to(user.socketId).emit(PRIVATE_CHAT, newChat)
          })
          console.log('newChat: ', newChat)
          socket.emit(PRIVATE_CHAT, newChat)
          sendMessageToChatFromUser(newChat._id, `${sender.name} craeted the group.`, true)

          chat.save(err => {
            if (err) throw err;
            console.log('Saved successfully!')
          })
        }
      })
    }
  })

  socket.on(ADD_USER_TO_CHAT, ({ receivers, activeChat, chats }) => {
    // const receiverSocket = receiver.socketId
    const groupOfUserIds = activeChat.users.concat(receivers.map(receiver => receiver._id))
    // const groupOfUserNames = activeChat.name.concat(receivers.map(receiver => ", " + receiver.name))

    // save to db
    Chat.findOneAndUpdate({ _id: mongoose.Types.ObjectId(activeChat._id) }, { users: groupOfUserIds }, (err, result) => {
      if (err) throw err
      console.log('Update chat successfully! from add user to chat event')
      if (result) {
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
          socket.to(receiver.socketId).emit(PRIVATE_CHAT, Object.assign({}, activeChat, { users: groupOfUserIds }))

        })
        receivers.map(receiver => {
          sendMessageToChatFromUser(activeChat._id, `${socket.user.name} added ${receiver.name} to chat.`, true)
        })
      }
    })
  })

  socket.on(DELETE_CHAT, ({ chatId }) => {
    Chat.findOneAndDelete({ _id: chatId }, (err, result) => {
      if (err) throw err;
      if (result) {
        result.users.map(userId => {
          for (let key in connectedUsers) {
            if (JSON.stringify(connectedUsers[key]._id) === JSON.stringify(userId)) {
              console.log(connectedUsers[key])
              return connectedUsers[key]
            }
          }
        }).map(user => {
          if (user) {
            socket.to(user.socketId).emit(DELETE_CHAT, result)
          }
        })
        socket.emit(DELETE_CHAT, result)
        console.log('Delete Chat Successfully!')

      }
    })
    Message.find({ chatId: chatId }, (err, results) => {
      if (err) throw err
      if (results) {
        results.map(result => {
          File.deleteOne({ _id: result.file }, (err, result) => {
            if (err) throw err
            if (result.ok === 1) {
              console.log('Delete Image successfully!')

            }
            Message.deleteOne({ chatId: chatId }, (err, result) => {
              if (err) throw err
              console.log('Delete Message successfully!')
            })

          })
        })
      }
    })

  })

  socket.on(CHANGE_CHAT_NAME, ({ activeChat, newChatName }) => {
    Chat.findByIdAndUpdate(activeChat._id, { name: newChatName }, (err, result) => {
      if (err) throw err
      if (result) {
        result.users.map(userId => {
          for (let key in connectedUsers) {
            if (JSON.stringify(connectedUsers[key]._id) === JSON.stringify(userId)) {
              return connectedUsers[key]
            }
          }
        }).map(user => {
          if (user) {
            socket.to(user.socketId).emit(CHANGE_CHAT_NAME, { chatId: activeChat._id, newChatName: newChatName })
            

          }
        })
        socket.emit(CHANGE_CHAT_NAME, { chatId: activeChat._id, newChatName: newChatName })

      }
      sendMessageToChatFromUser(activeChat._id, `${socket.user.name} changed chat's name to ${newChatName}`, true)

    })
  })

  socket.on(USERS_IN_CHAT, ({ chat }) => {
    User.find().where('_id').in(chat.users).exec((err, result) => {
      console.log('result: ', result)
      socket.emit(USERS_IN_CHAT, { usersInChat: result })
    })
  })

  socket.on(LEAVE_GROUP, ({ sender, chat }) => {
    const newChatUsers = chat.users.filter(userId => userId !== sender._id)

    Chat.findByIdAndUpdate(chat._id, { $pull: { users: sender._id } }, (err, result) => {
      if (err) throw err;
      if (result) {
        chat.users.map(userId => {
          for (let key in connectedUsers) {
            if (JSON.stringify(connectedUsers[key]._id) === JSON.stringify(userId)) {
              return connectedUsers[key]
            }
          }
        }).map(user => {
          if (user) {
            if (user._id !== sender._id) {
              socket.to(user.socketId).emit(LEAVE_GROUP, { chat: Object.assign({}, chat, { users: newChatUsers }), isSender: false })

            }
          }
        })
        socket.emit(LEAVE_GROUP, { chat: chat, isSender: true })
        sendMessageToChatFromUser(chat._id, `${socket.user.name} left the group.`, true)
      }
    })
  })

  socket.on(VIDEO_CALL, ({offer, to})=>{
    to.map(userId=>{
      for(let key in connectedUsers){
        if(JSON.stringify(connectedUsers[key]._id)=== JSON.stringify(userId)){
          return connectedUsers[key]
        }
      }
    }).map(user=>{
      if(user){
        console.log('user: ', user)
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
  return (chatId, message, isNotification) => {
    if (typeof (message) === 'string') {
      const newMessage = createMessage({ message, sender, isNotification })


      // save to db
      const messageDB = new Message({
        _id: newMessage._id,
        time: newMessage.time,
        message: newMessage.message,
        file: null,
        sender: sender._id,
        isNotification: newMessage.isNotification,
        chatId: chatId
      })
      messageDB.save((err, result) => {
        if (err) throw err
        if (result) {
          io.emit(`${MESSAGE_RECEIVED}-${chatId}`, { message: newMessage })
        }
      })

    } else {
      let newMessage = {}
      let newFile = {}
      if (message.type.split("/")[0] === "image") {
        var base64String = message.data
        // image file extension
        var imageExtension = base64String.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0]
        imageExtension = imageExtension.split('/')[1]
        // image data
        var imageData = base64String.split(';base64,').pop()

        newMessage = createMessage({ message: `${sender.name} sent a photo.`, sender, isNotification })

        newFile = createFile({
          name: message.name,
          type: message.type,
          size: message.size,
          data: imageData,
          blob: null
        })
      } else {
        const blob =
        newMessage = createMessage({ message: `${sender.name} sent a file.`, sender, isNotification })

        newFile = createFile({
          name: message.name,
          type: message.type,
          size: message.size,
          data: message.data,
          blob: message.blob
        })



      }
      const messageDB = new Message({
        _id: newMessage._id,
        time: newMessage.time,
        message: newMessage.message,
        file: newFile._id,
        sender: sender._id,
        isNotification: newMessage.isNotification,
        chatId: chatId
      })

      const fileDB = new File({
        _id: newFile._id,
        time: newFile.time,
        name: newFile.name,
        type: newFile.type,
        size: newFile.size,
        data: newFile.data,
        blob: newFile.blob
      })

      messageDB.save((err, result) => {
        if (err) throw err
        if (result) {
          fileDB.save((err, result) => {
            if (err) throw err
            if (result) {
              io.emit(`${MESSAGE_RECEIVED}-${chatId}`, { message: Object.assign({}, newMessage, { file: newFile }) })
            }
          })
        }
      })
    }

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
