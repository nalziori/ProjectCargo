const pool = require('./database');
const datetime = require('./datetime');
const config = require('./config');

const s3 = config.getS3();

const chat = {
  async add (type, target, data) {
    try {
      const { user, message } = data;
      const conn = await pool.getConnection();
      try {
        const query = `INSERT INTO chat
        (chat_user_ID, isLogin, isAdmin, type, target, message)
        VALUES (?, ?, ?, ?, ?, ?)`;
        await conn.query(`UPDATE chatRoom SET updatedAt = NOW() WHERE hash = ?`, [target]);
        let isAdmin = false;
        if (user.isAdmin) isAdmin = true;
        const [chatResult, ] = await conn.query(query, [user.id, true, isAdmin, type, target, message]);
        const chatId = chatResult.insertId;
  
        // 채팅 읽기 내역 등록
        if (type === 'group') {
          
        } else if (type === 'single') {
          const userChatQuery = `SELECT c.*, u.id AS userId
          FROM chatRoom AS c
          LEFT JOIN user AS u
          ON c.chatRoom_targetUser_ID = u.id
          WHERE c.hash = ?`;
          const [chatRooms, ] = await conn.query(userChatQuery, [target]);
          for (let chatRoom of chatRooms) {
            if (user.user.id !== chatRoom.userId) {
              await conn.query(`INSERT INTO userChat (userChat_user_ID, userChat_chatRoom_ID, userChat_chat_ID) VALUES (?, ?, ?)`, [chatRoom.userId, chatRoom.id, chatId]);
            } else {
              await conn.query(`INSERT INTO userChat (userChat_user_ID, userChat_chatRoom_ID, userChat_chat_ID, status) VALUES (?, ?, ?, ?)`, [chatRoom.userId, chatRoom.id, chatId, 0]);
            }
          }
        }
      } finally {
        conn.release();
      }
    } catch (e) {
      console.error(e);
    }
  },
  async get (type, target, user) {
    try {
      const conn = await pool.getConnection();
      try {
        // 채팅 읽기 확인
        let chatRoomId = null;
        if (type === 'group') {
  
        } else if (type === 'single') {
          const query = `SELECT r.*
          FROM chatRoom AS r
          WHERE r.hash=? AND r.chatRoom_targetUser_ID=?`;
          const [result, ] = await conn.query(query, [target, user.id]);
          chatRoomId = result[0].id;
          await conn.query(`UPDATE userChat SET status = 0 WHERE userChat_user_ID=? AND userChat_chatRoom_ID=?`, [user.id, chatRoomId]);
        }
        let fixedQuery = null;
        if (type === 'all') {
          fixedQuery = `SELECT c.*, u.id AS uId, u.nickName, u.permission, u.image AS userImage
          FROM chat AS c
          LEFT JOIN user AS u
          ON c.chat_user_ID = u.id
          WHERE c.fixed = 1 AND c.type = ?
          ORDER BY c.id DESC`;
        } else {
          fixedQuery = `SELECT c.*, u.id AS uId, u.nickName, u.permission, u.image AS userImage
          FROM chat AS c
          LEFT JOIN user AS u
          ON c.chat_user_ID = u.id
          WHERE c.fixed = 1 AND c.type = ? AND c.target = ?
          ORDER BY c.id DESC`;
        }
        const [fixedList, ] = await conn.query(fixedQuery, [type, target]);
        let query = null;
        if (type === 'all') {
          query = `SELECT c.*, u.id AS uId, u.nickName, u.permission, u.image AS userImage
          FROM chat AS c
          LEFT JOIN user AS u
          ON c.chat_user_ID = u.id
          WHERE c.fixed = 0 AND c.type = ?
          ORDER BY c.id DESC
          LIMIT 20`;
        } else {
          query = `SELECT c.*, u.id AS uId, u.nickName, u.permission, u.image AS userImage
          FROM chat AS c
          LEFT JOIN user AS u
          ON c.chat_user_ID = u.id
          WHERE c.fixed = 0 AND c.type = ? AND c.target = ?
          ORDER BY c.id DESC
          LIMIT 20`;
        }
        const [list, ] = await conn.query(query, [type, target]);
        const [permission, ] = await conn.query(`SELECT * FROM permission ORDER BY id ASC`);
        fixedList.forEach(l => {
          const permissionImage = permission.find(p => p.permission === l.permission).image;
          if (permissionImage) {
            l.permissionImage = `${s3.host}/permission/${permissionImage}`;
          } else {
            l.permissionImage = `/assets/permission/${l.permission}.svg`;
          }
          if (l.userImage) {
            l.userImage = `${s3.host}/userImage/${l.userImage}`;
          } else {
            l.userImage = `/assets/userImage.svg`;
          }
        });
        list.forEach(l => {
          const permissionImage = permission.find(p => p.permission === l.permission).image;
          if (permissionImage) {
            l.permissionImage = `${s3.host}/permission/${permissionImage}`;
          } else {
            l.permissionImage = `/assets/permission/${l.permission}.svg`;
          }
          if (l.userImage) {
            l.userImage = `${s3.host}/userImage/${l.userImage}`;
          } else {
            l.userImage = `/assets/userImage.svg`;
          }
        });
        const fixedListReverse = fixedList.reverse();
        const listReverse = list.reverse();
        const result = [];
        fixedListReverse.forEach(l => {
          result.push({
            user: {
              isLogin: l.isLogin,
              isAdmin: l.isAdmin,
              user: {
                uId: l.uId,
                nickName: l.nickName,
                permission: l.permission,
                permissionImage: l.permissionImage,
                userImage: l.userImage,
              }
            },
            message: l.message,
            datetime: datetime(l.createdAt),
          });
        });
        listReverse.forEach(l => {
          result.push({
            user: {
              isLogin: l.isLogin,
              isAdmin: l.isAdmin,
              user: {
                uId: l.uId,
                nickName: l.nickName,
                permission: l.permission,
                permissionImage: l.permissionImage,
                userImage: l.userImage,
              }
            },
            message: l.message,
            datetime: datetime(l.createdAt),
          });
        });
        return result;
      } finally {
        conn.release();
      }
    } catch (e) {
      console.error(e);
    }
  }
}

module.exports = chat;