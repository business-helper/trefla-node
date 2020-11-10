"use strict";

let user_pager = { limit: 10, page: 0 };
let chat_pager = { limit: 10, page: 0 };
let pending_pager = { limit: 10, page: 0 };

let _users = [];
let _chatrooms = [];
let _pending_chats = [];

var current_room = null;


checkAuthentication();
var socket = io("http://localhost:3500/", {
  query: `token=${loadToken()}`,
});

$(function () {
  updateHeader();
  loadData();
  $("#logout").on("click", function () {
    removeLogin();
    toastr.success("You logged out!");
    setTimeout(() => {
      window.location.href = "/page/login";
    }, 2000);
  });

  // connect to user
  $("#online-users").on("click", ".btn-connect", function () {
    const user_id = $(this).data("id");
    const user_name = $(this).data("name");
    socket.emit(SKT_CONNECT_TO_USER, { toId: user_id });
    // if (confirm(`Are you sure to connect with ${user_name}?`)) {
    // 	createChatroom(user_id, '');
    // }
  });

	// accept the connection request
	$('#pending-chats').on('click', '.btn-accept', function() {
		const chat_id = $(this).data('id');
		socket.emit(SKT_CONNECT_ACCEPT, { chat_id });
	});

  // select chat room
  $("#chatroom-list").on("click", ".message-item", function () {
    $("#chatroom-list .message-item")
      .each((i, elem) => {
        $(elem).removeClass("selected");
      });
    $(this).addClass("selected");
    const room_id = $(this).data("id");
    chatroomSelected(room_id);
  });
});

function loadData() {
  Promise.all([
    loadChatrooms(chat_pager),
    loadPendingChats(pending_pager),
    loadUsers(user_pager),
  ])
    .then(([chatRes, pendingRes, userRes]) => {
      const chatrooms = chatRes.data;
      const pending_chats = pendingRes.data;

      let connect_ids = [];
      (chatrooms || []).forEach((chatroom) => {
        connect_ids.push(chatroom.user.id);
      });
      (pending_chats || []).forEach((chatroom) => {
        connect_ids.push(chatroom.user.id);
      });

      const profile = loadProfile();
      const users = userRes.data.filter(
        (user) => !connect_ids.includes(user.id) && profile.id !== user.id
      );

      // init list

      $("#chatroom-list").html(`<li>No chatrooms available...</li>`);
      $("#online-users > ul").html("<li>No users to connect...</li>");
      $("#pending-chats").html(`<li>No pending requests...</li>`);

      appendChatrooms(chatrooms);
      appendPendingChats(pending_chats);
      appendUsers(users);
    })
    .catch((error) => {
      console.log(error);
    });
}

function updateHeader() {
  const profile = loadProfile();
  $("#login-user").text(profile.user_name);
}

function loadUsers({ limit, page }) {
  return new Promise((resolve, reject) => {
    myBearerRequest("/api/v1/user", "post", { limit, page })
      .then((result) => {
        return resolve(result);
        // // console.log("user", result);
        // const { data, status, hasMore, pager } = result;
        // const profile = loadProfile();
        // const users = data.filter((user) => user.id !== profile.id);
        // if (status) {
        // 	let existing_users = _users.map(user => user.id);
        //   let strList = "";
        //   for (const user of users) {
        // 		if (existing_users.includes(user.id)) continue;
        //     strList += `
        //     <li class="message-item" id="online-${user.id}">
        //       <strong>${user.user_name}</strong>
        //       <button class="float-right btn-connect" id="connect-${user.id}" data-id="${user.id}" data-name="${user.user_name}">Connect</button>
        //     </li>
        // 		`;
        // 		$("#online-users > ul").html(strList);
        // 		_users.push(user);
        // 	}
        // } else {
        //   toastr.error(result.message);
        // }
      })
      .fail((error) => {
        console.log(error);
        return reject(
          Object.assign(
            new Error(resopnseJSON.message || "Something went wrong!"),
            { code: 400 }
          )
        );
      });
  });
}

function loadPendingChats({ limit, page }) {
  return new Promise((resolve, reject) => {
    myBearerRequest("/api/v1/chat/pending", "get")
      .then((res) => {
        return resolve(res);
        // console.log(res);
        // const { status, data, messag } = res;
        // if (status) {
        //   let strList = "";
        //   for (let chat of data) {
        //     const rightElem = chat.isSent
        //       ? `<button class="btn-accept" style="float: right;" data-id="${chat.id}">Accept</button>`
        //       : `<button style="float: right;">Waiting...</button>`;
        //     strList += `
        //     <li class="message-item">
        // 			<strong>${chat.user ? chat.user.user_name : ""}</strong>
        // 			${rightElem}
        //     </li>
        // 		`;
        //   }
        //   $("#pending-chats").html(strList);
        // } else {
        //   toastr.error(message);
        // }
      })
      .fail((error) => {
        const { responseJSON } = error;
        // console.log(responseJSON);
        // toastr.error(responseJSON.message || "Something went wrong!");
        return reject(
          Object.assign(
            new Error(resopnseJSON.message || "Something went wrong!"),
            { code: 400 }
          )
        );
      });
  });
}

function loadChatrooms(pager) {
  return new Promise((resolve, reject) => {
    myBearerRequest("/api/v1/chat/accepted", "get")
      .then((res) => {
        return resolve(res);
        // console.log(res);
        // const { status, data, message } = res;
        // if (status) {
        //   let strList = "";
        //   for (let chat of data) {
        //     strList += `
        //     <li class="message-item hover" data-id="${chat.id}" data-user="${chat.user.user_name}">
        //       <strong>${chat.user.user_name}</strong>
        //     </li>
        // 		`;
        //   }
        //   $("#chatroom-list").html(strList);
        // } else {
        //   toastr.error(message);
        // }
      })
      .fail((error) => {
        const { responseJSON } = error;
        // toastr.error(resopnseJSON.message || "Something went wrong!");
        return reject(
          Object.assign(
            new Error(resopnseJSON.message || "Something went wrong!"),
            { code: 400 }
          )
        );
      });
  });
}

function appendUsers(users) {
  if (_users.length === 0 && users.length > 0) {
    $("#online-users > ul").html("");
  }
  let existing_users = _users.map((user) => user.id);

  for (const user of users) {
    if (existing_users.includes(user.id)) continue;
    const strItem = `
            <li class="message-item" id="online-${user.id}">
              <strong>${user.user_name}</strong>
              <button class="float-right btn-connect" id="connect-${user.id}" data-id="${user.id}" data-name="${user.user_name}">Connect</button>
            </li>
        		`;
    $("#online-users > ul").append(strItem);
    _users.push(user);
  }
}

function appendChatrooms(chats) {
  if (_chatrooms.length === 0 && chats.length > 0) {
    $("#chatroom-list").html("");
  }

  for (let chat of chats) {
    const strItem = `
            <li class="message-item hover" id="chatroom-${chat.id}" data-id="${chat.id}" data-user="${chat.user.user_name}">
              <strong>${chat.user.user_name}</strong>
            </li>
						`;
		_chatrooms.push(chat);
		$("#chatroom-list").append(strItem);
  }
  
}

function appendPendingChats(pcs) {
  if (_pending_chats.length === 0 && pcs.length > 0) {
    $("#pending-chats").html("");
  }

  for (let chat of pcs) {
    const rightElem = !chat.isSent
      ? `<button class="btn-accept" style="float: right;" data-id="${chat.id}">Accept</button>`
      : `<button style="float: right;">Waiting...</button>`;
    const strItem = `
            <li class="message-item" id="pending-chat-${chat.id}">
        			<strong>${chat.user ? chat.user.user_name : ""}</strong>
        			${rightElem}
            </li>
						`;
		_pending_chats.push(chat);
  	$("#pending-chats").append(strItem);
  }
}

function chatroomSelected(room_id) {
	const [chatroom] = _chatrooms.filter(chatroom => chatroom.id === room_id);
	if (!chatroom) {
		console.log('[select room] not exist', room_id);
	}
	current_room = chatroom;
	console.log('chatroom', chatroom);
	$('#partner-name').text(chatroom.user.user_name);
	$('#msg').attr('disabled', false);
	// must load messages in chatroom

	// init message list
	$('#messages').html("");
}

function createChatroom(user_id, message = "") {
  myBearerRequest("/api/v1/chat/normal", "post", {
    receiver_id: user_id,
    message,
  })
    .then((res) => {
      const { status, message, data } = res;
      if (status) {
        toastr.success(message);
      } else {
        toastr.error(message);
      }
    })
    .fail((error) => {
      console.log(error);
      const { responseJSON } = error;
      console.log(responseJSON);
      toastr.error(responseJSON.message || "Something went wrong!");
    });
}

/*
  Client stagit e configs
*/
var _typing = false;
var _timeout = undefined;
// var _users = [];

/*
  Auxiliary function to reset parameters when a user is no longer typing.
*/
function resetTyping() {
  _typing = false;
  socket.emit(SKT_USER_TYPING, { chat_id: current_room.id, typing: false });
}

/*
  Message submission
*/
$("form").submit((e) => {
  e.preventDefault();
  if (!current_room) {
    toastr.error("Please select a chat room!");
    return;
  }
  socket.emit(SKT_SEND_MSG, {
    message: $("#msg").val(),
    chat_id: current_room.id,
  });

  $("#msg").val("");
  return false;
});

/*
  Message listener
*/
$("#msg").keypress((e) => {
  if (e.which !== 13) {
    if (_typing === false && $("#msg").is(":focus")) {
      _typing = true;
      socket.emit(SKT_USER_TYPING, { chat_id: current_room.id, typing: true });
      _timeout = setTimeout(resetTyping, 3000);
    } else {
      clearTimeout(_timeout);
      _timeout = setTimeout(resetTyping, 3000);
    }
  }
});

/*
  Socket events
*/

// socket.join('asf');

socket.on(SKT_CONNECT_TO_USER, (args) => {
	console.log("ConnectReq result", args);
	// delete user
	if (args.status) {
		toastr.success(args.message);
		const chatroom = args.data;
		$(`#online-${chatroom.user.id}`).remove();
		appendPendingChats([chatroom]);
	} else {
		toastr.error(args.message);
	}
});

socket.on(SKT_CONNECT_REQUESTED, (args) => {
	console.log("[connect requested]", args);
	if (args.status) {
		toastr.info(args.message);
		try {
			const chatroom = args.data;
			$(`#online-${chatroom.user.id}`).remove();
			appendPendingChats([chatroom]);
		} catch(e) {}
	}
});

// response of accept
socket.on(SKT_CONNECT_ACCEPT, (args) => {
	if (args.status) {
		toastr.success(args.message);
		try {
			const chatroom = args.data;
			$(`#pending-chat-${chatroom.id}`).remove();
			appendChatrooms([chatroom]);
		} catch(e) {}
	} else {
		toastr.error(args.message);
	}
});

socket.on(SKT_CONNECT_ACCEPTED, (args) => {
	if (args.status) {
		toastr.info(args.message);
		try {
			const chatroom = args.data;
			$(`#pending-chat-${chatroom.id}`).remove();
			appendChatrooms([chatroom]);
			socket.emit(SKT_CONNECT_ACCEPTED, { id: chatroom.id });
		} catch(e) {}
	} else {
		toastr.error(args.message);
	}
});

socket.on(SKT_USER_TYPING, ({ chat_id, typing }) => {
  if (!typing) {
    $("#typing-event").html("");
  } else {
    $("#typing-event").html(`typing...`);
  }
});

socket.on(SKT_RECEIVE_MSG, ({ message, chat_id }) => {
  console.log("new message in room" + chat_id, message);

  $("#messages").append($("<li>").text(message));
});


socket.on("connected", () => {
  console.log("[Connected!]");
});

socket.on("chat message", (msg) => {
  var msg = `[${msg.time}] - [${msg.nickname}]: ${msg.message}`;

  clearTimeout(_timeout);
  _timeout = setTimeout(resetTyping, 0);
  $("#messages").append($("<li>").text(msg));
});

socket.on("message", (data) => {
  console.log("[message]", data);
});

socket.on("notify user", (user) => {
  $("#messages").append(
    $('<li class="event">').text(`You have joined as ${user}`)
  );
});

socket.on("user connected", (user) => {
  $("#messages").append($('<li class="event">').text(`${user} has joined.`));
});

socket.on("connect user", ({ receiver }) => {
  console.log("user connected", receiver);
});

socket.on("user disconnected", (user) => {
  $("#messages").append($('<li class="event">').text(`${user} has left.`));
});


