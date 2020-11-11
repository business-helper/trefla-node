# Summary of Socket Chat.

## Load Chatroom

- Endpoint <br/>

/api/v1/chat/accepted

## Enter Chatroom

### Notify Server

```js
socket.emit(SKT_SELECT_CHAT, { chat_id: room_id });
```

This notifies server that user entered a room, and so can track the room number that user's playing in.

### Load Messages in Chat

- Endpoint <br/>

/api/v1/chat/:chat_id/messages

```js
 function loadMessagesOfChat({ chat_id, last_id = null, limit })
```


## Send a Message

```js
    socket.emit(SKT_SEND_MSG, {
      message: $("#msg").val(), // text message
      chat_id: current_room.id, // chatroom id
    });
```


## Receive Messages

In this event, receiver and sender both will process the message.
The server sends message to both user in the chatroom.
So the sender doesn't need to add the sent message manually.

```js
socket.on(SKT_RECEIVE_MSG, ({ message, chat }) => {
  // process received message here.
  // message: message object + message.user: parnter object
  // chat: chatroom object
});
```

## Create a Chatroom

### Send Request

```js
  socket.emit(SKT_CONNECT_TO_USER, { toId: user_id }); 
  // send request to other user.
```

### Receive Request Result (for sender)

```js
socket.on(SKT_CONNECT_TO_USER, (args) => {
  // process goes here.
  // args {
  //    status: true | false,
  //    message: <text>,
  //    data: <Chatroom>
  // }
});
```

### Get Notified for the connect request(receiver)

```js
socket.on(SKT_CONNECT_REQUESTED, (args) => {
  // args {
  //    status: true | false,
  //    message: <text>,
  //    data: <Chatroom>
  // }
});
```

### Accept the Chatroom Connection

## Recieve accepts the request

```js
socket.emit(SKT_CONNECT_ACCEPT, { chat_id });
```

## Sender get response (who received connection request)

```js
socket.on(SKT_CONNECT_ACCEPT, (args) => {
  // args: same as the above
})
```

## Receiver gets notified (Who requested connection)

```js
socket.on(SKT_CONNECT_ACCEPTED, (args) => {
  ...
  
  // This makes the server join the user to the accepted chatroom.
  socket.emit(SKT_CONNECT_ACCEPTED, { id: chatroom.id }); 
})
```

## Notify Typing

