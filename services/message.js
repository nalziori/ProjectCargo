const Class = require('./class');
const datetime = require('../middleware/datetime');
const pagination = require('../middleware/pagination');

class Message extends Class {
  async get (messageId) {
    const query = `SELECT m.*, u.uId, u.nickName
    FROM message AS m
    LEFT JOIN user AS u
    ON message_sender_ID = u.id
    WHERE m.id=?`;
    const [messages, ] = await this.conn.query(query, [messageId]);
    if (messages.length) {
      const message = messages[0];
      return message;
    } else {
      return null;
    }
  }
  async getMessages (user) {
    if (user) {
      const query = `SELECT m.*, u.nickName AS sender
      FROM message AS m
      LEFT JOIN user AS u
      ON message_sender_ID = u.id
      WHERE message_recipient_ID = ?
      AND m.status >= 1
      ORDER BY m.createdAt DESC`;
      const [messages, ] = await this.conn.query(query, [user.id]);
      messages.forEach(message => {
        message.datetime = datetime(message.createdAt);
        message.content = message.content.replaceAll('\r\n', '<br>');
      });
      return messages;
    } else {
      throw new Error('입력값이 없습니다');
    }
  }
  async getMessagesByPagination (listCount) {
    const pnQuery = `SELECT count(*) AS count FROM message`;
    const pn = await pagination(pnQuery, this.req.query, 'page', listCount, 5);
    const query = `SELECT m.*, sender.uId AS senderUid, sender.nickName AS senderNickName, recipient.uId AS recipientUid, recipient.nickName AS recipientNickName
    FROM message AS m
    LEFT JOIN user AS sender
    ON m.message_sender_ID = sender.id
    LEFT JOIN user AS recipient
    ON m.message_recipient_ID = recipient.id
    WHERE m.status >= 1
    ORDER BY m.createdAt DESC
    ${pn.queryLimit}`;
    const [messages, ] = await this.conn.query(query);
    messages.forEach(message => {
      message.datetime = datetime(message.createdAt);
    });
    return {
      messages,
      pn,
    };
  }
  async remove (messageId) {
    await this.conn.query(`UPDATE message SET status=0 WHERE id=?`, [messageId]);
  }
}

module.exports = Message;