exports.SKT_CHECK_HEALTH = "CHECK_HEALTH";
// when user A enter chatroom 'AB', A emits to server. B receives emission from server with same event name.
exports.SKT_CONNECT_TO_USER = 'socket.connect.to.user';
exports.SKT_CONNECT_TO_CARD = 'socket.connect.to.card';
exports.SKT_CONNECT_REQUESTED = 'socket.connect.requested';
exports.SKT_CONNECT_ACCEPT = 'socket.connect.accept';
exports.SKT_CONNECT_ACCEPTED = 'socket.connect.accepted';
exports.SKT_CONNECT_REJECT = 'socket.connect.reject';
exports.SKT_CONNECT_REJECTED = 'socket.connect.rejected';
exports.SKT_USER_ENTER_ROOM = 'socket.user.enter.room';
exports.SKT_USER_TYPING = 'socket.user.typing';
exports.SKT_ACCEPT_CONNECTION = 'socket.accepted.connection';
exports.SKT_SELECT_CHAT = 'socket.select.chat';
exports.SKT_LEAVE_CHAT = 'socket.leave.chat';
exports.SKT_SEND_MSG = 'socket.send.message';
exports.SKT_RECEIVE_MSG = 'socket.receive.message';
exports.SKT_UPDATE_ONLINE = 'socket.update.online';
exports.SKT_NOTI_NUM_UPDATED = 'socket.noti.num.updated';
exports.SKT_UNREAD_MSG_UPDATED = 'socket.unread.msg.updated';
exports.SKT_CREATE_NOTIFICATION = 'socket.create.new.notification';
exports.SKT_CHAT_DELETED = 'socket.chat.deleted';
exports.SKT_REGISTER_WITH_CARD = 'socket.register.with.card';
exports.SKT_CARD_VERIFIED = 'socket.card.verified';
exports.SKT_POST_CREATED = 'socket.post.created';
exports.SKT_POST_UPDATED = 'socket.post.updated';
exports.SKT_POST_DELETED = 'socket.post.deleted';
exports.SKT_FOUND_NEW_CARD_CHATS = 'socket.found.new.card.chats';
exports.SKT_REPLIED_2_TRANSFER_REQUEST = 'socket.replied2.transfer.request';  // unused;
exports.SKT_CHATLIST_UPDATED = 'socket.chatlist.updated';
exports.SKT_AUTHENTICATE = 'socket.authenticate';
exports.SKT_MSG_FAILED = 'socket.message.failed';
exports.SKT_BLOCK_BLOCKED = 'socket.block.blocked';
exports.SKT_BLOCK_RELEASED = 'socket.block.released';
exports.SKT_COMMENT_CREATED = 'socket.comment.created';
exports.SKT_COMMENT_UPDATED = 'socket.comment.updated';

exports.SKT_ID_VERIFEID = 'socket.identity.verified';
exports.SKT_ID_UNVERIFIED = 'socket.identity.unverified';
exports.SKT_POINT_ADDED = 'socket.point.added';
exports.SKT_PROFILE_PHOTO_VERIFIED = 'socket.profile.photo.verified';

exports.SKT_PROFILE_REVEAL_REQUEST = 'socket.profile.reveal.request';
exports.SKT_PROFILE_REVEAL_REQUESTED = 'socket.profile.reveal.requested';
exports.SKT_PROFILE_REVEAL_ACCEPT = 'socket.profile.reveal.accept';
exports.SKT_PROFILE_REVEAL_ACCEPTED = 'socket.profile.reveal.accepted';
exports.SKT_PROFILE_REVEAL_REJECT = 'socket.profile.reveal.reject';
exports.SKT_PROFILE_REVEAL_REJECTED = 'socket.profile.reveal.rejected';

exports.SKT_MATCH_LIKED = 'socket.match.liked';
exports.SKT_MATCH_DISLIKED = 'socket.match.disliked';
exports.SKT_MATCH_PASSED = 'socket.match.passed';
exports.SKT_MATCH_PAIRED = 'socket.match.paired';

exports.SKT_LTS_SINGLE = 'socket.local2server.single';
exports.SKT_LTS_MULTIPLE = 'socket.local2server.multiple';
exports.SKT_LTS_BROADCAST = 'socket.local2server.broadcast';
