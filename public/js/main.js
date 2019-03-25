/* eslint-env jquery, browser */

$(document).ready(() => {

  // Place JavaScript code here...
  const socket = io.connect('http://localhost:8080')
  let message = $("#message");
  let username = $("#username");
  let room_id = $("#roomId")
  let send_message = $("#send_message");
  let chatroom = $(".chat-row")

  send_message.click(function() {
    console.log(message.val());
    console.log(username.val());
    socket.emit('new_message', { message : message.val(), username: username.val(), roomId: room_id.val() });
  })

  socket.on("new_message", (data) => {
    console.log(data);
    chatroom.append("<li class='message'>" + data.username + ": " + data.message + "<li>");
  })
});
