/**
 * @description Request to share the profile each other in a chat.
 * 
 */
const models = require('../../models');
const helpers = require('../../helpers');
const ctrls = require('../../controllers');
const CONSTS = require('../../constants/socket.constant');
const { IChat } = require('../../types/IChat');



module.exports = async ({
  io, socket, token,
  chat_id,
}) => {
  const { uid } = helpers.auth.parseToken(token);

  return models.chat.getById(chat_id).then(chat => {
    iChat = new IChat(chat);
    
  })
    
}
