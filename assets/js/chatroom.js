"use strict";

let user_pager = { limit: 10, page: 0 };
let chat_pager = { limit: 10, page: 0 };
let pending_pager = { limit: 10, page: 0 };

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
		const user_id = $(this).data('id');
		const user_name = $(this).data('name');
		if (confirm(`Are you sure to connect with ${user_name}?`)) {
			createChatroom(user_id, '');
		}
	});
});

function loadData() {
	loadChatroom(chat_pager);
	loadPendingChats(pending_pager);
}

function updateHeader() {
  const profile = loadProfile();
  $("#login-user").text(profile.user_name);
}

function loadChatroom({ limit, page }) {
  myBearerRequest("/api/v1/user", "post", { limit, page })
    .then((result) => {
      // console.log("user", result);
      const { data, status, hasMore, pager } = result;
      const profile = loadProfile();
      const users = data.filter((user) => user.id !== profile.id);
      if (status) {
        let strList = "";
        for (const user of users) {
          strList += `
          <li class="message-item" id="online-${user.id}">
            <strong>${user.user_name}</strong>
            <button class="float-right btn-connect" id="connect-${user.id}" data-id="${user.id}" data-name="${user.user_name}">Connect</button>
          </li>
          `;
          $("#online-users > ul").html(strList);
        }
      } else {
        toastr.error(result.message);
      }
    })
    .fail((error) => {
      console.log(error);
    });
}

function loadPendingChats({ limit, page }) {
	myBearerRequest('/api/v1/chat/pending', 'get')
		.then(res => {
			console.log(res);
			const { status, data, messag } = res;
			if (status) {
				let strList = '';
				for (let chat of data) {
					const rightElem = chat.isSent ? `<button class="btn-accept" style="float: right;" data-id="${chat.id}">Accept</button>` : `<button style="float: right;">Waiting...</button>`
					strList += `
          <li class="message-item">
						<strong>${chat.user ? chat.user.user_name : ''}</strong>
						${rightElem}
          </li>
					`;
				}
				$('#pending-chats').html(strList);
			} else {
				toastr.error(message);
			}
		})
		.fail(error => {
			const { responseJSON } = error; console.log(responseJSON);
			toastr.error(responseJSON.message || 'Something went wrong!');
		})
}

function createChatroom(user_id, message = '') {
	myBearerRequest('/api/v1/chat/normal', 'post', { receiver_id: user_id, message })
		.then(res => {
			const { status, message, data } = res;
			if (status) {
				toastr.success(message);
			} else {
				toastr.error(message);
			}
		})
		.fail(error => {
			console.log(error);
			const { responseJSON } = error; console.log(responseJSON);
			toastr.error(responseJSON.message || 'Something went wrong!');
		})
}

/*
  Client stagit e configs
*/
var _typing = false;
var _timeout = undefined;
var _users = [];

/*
  Auxiliary function to reset parameters when a user is no longer typing.
*/
function resetTyping() {
  _typing = false;
  socket.emit("user typing", false);
}

/*
  Message submission
*/
$("form").submit(() => {
  socket.emit("chat message", {
    message: $("#msg").val(),
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
      socket.emit("user typing", true);
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
socket.on("chat message", (msg) => {
  var msg = `[${msg.time}] - [${msg.nickname}]: ${msg.message}`;

  clearTimeout(_timeout);
  _timeout = setTimeout(resetTyping, 0);
  $("#messages").append($("<li>").text(msg));
});

socket.on("notify user", (user) => {
  $("#messages").append(
    $('<li class="event">').text(`You have joined as ${user}`)
  );
});

socket.on("user connected", (user) => {
  $("#messages").append($('<li class="event">').text(`${user} has joined.`));
});

socket.on("user disconnected", (user) => {
  $("#messages").append($('<li class="event">').text(`${user} has left.`));
});

socket.on("user typing", (msg) => {
  var i = _users.indexOf(msg.nickname);

  if (msg.isTyping) {
    if (i === -1) {
      _users.push(msg.nickname);
    }
  } else {
    if (i !== -1) {
      _users.splice(i, 1);
    }
  }

  switch (_users.length) {
    case 0:
      $("#typing-event").html("");
      break;
    case 1:
      $("#typing-event").html(`${_users[0]} is typing...`);
      break;
    case 2:
      $("#typing-event").html(`${_users[0]} and ${_users[1]} are typing...`);
      break;
    default:
      $("#typing-event").html("Multiple users are typing...");
      break;
  }
});
