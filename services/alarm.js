const datetime = require('../middleware/datetime');
const push = require('../middleware/pushnotification');
const Class = require('./class');

class Alarm extends Class {
  async create(data) {
    data = Object.assign({
      type: null,
      userId: null,
      relatedUserId: null,
      boardId: null,
      articleId: null,
      commentId: null,
      messageId: null,
    }, data);
    const { type, userId, relatedUserId, boardId, articleId, commentId, messageId } = data;
    if (userId !== relatedUserId) {
      let alarmid;
      this.conn.query(`INSERT INTO alarm (type, alarm_user_ID, alarm_relatedUser_ID, alarm_board_ID, alarm_article_ID, alarm_comment_ID, alarm_message_ID) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [type, userId, relatedUserId, boardId, articleId, commentId, messageId],
        function (error, result) {
          if (error) {
            console.log(error);
          }
          alarmid = result.insertId;
        });
      const query = `SELECT alarm.*, user.nickName AS nickName, board.title AS boardTitle, board.slug AS boardSlug, article.id AS articleId, article.title AS articleTitle, comment.content AS commentContent
      FROM alarm LEFT JOIN user AS u ON alarm.alarm_relatedUser_ID=u.id LEFT JOIN board AS b ON alarm.alarm_board_ID=b.id LEFT JOIN article AS a ON alarm.alarm_article_ID=a.id LEFT JOIN comment AS c ON alarm.alarm_comment_ID=c.id WHERE alarm.id=?`;
      const [alarms,] = await this.conn.query(query, alarmid);
      alarms.forEach(alarm => {
        alarm.datetime = datetime(alarm.createdAt);
        switch (alarm.type) {
          case 'newComment':
            const notification = new push();
            notification.config();
            if (notification) {
              async () => {
                const push_target_all = new Array();
                const player_id_array = new Array();
                const player = await this.conn.query("SELECT * FROM user WHERE id=?", [alarm.alarm_user_ID]);
                player_id_array.push(player.appToken);
                notification.createNotification(notification.composebody(
                  `https://vetween.kr/${alarm.boardSlug}/${alarm.articleId}`,
                  `게시글 ${alarm.articleTitle}에 새로운 댓글이 달렸습니다.`,
                  "내 게시글에 새로운 댓글이 달렸어요! 어서 확인해보세요!",
                  push_target_all,
                  player_id_array,
                  "../public/asset/vetween_logo.png",
                ));
              }
            }
            break;
          case 'replyComment':
            const notification_reply = new push();
            notification_reply.config();
            if (notification_reply) {
              async () => {
                const push_target_all_reply = new Array();
                const player_id_array_reply = new Array();
                const player_reply = await this.conn.query("SELECT * FROM user WHERE id=?", [alarm.alarm_user_ID]);
                player_id_array.push(player_reply.appToken);
                notification_reply.createNotification(notification_reply.composebody(
                  `https://vetween.kr/${alarm.boardSlug}/${alarm.articleId}`,
                  `내 댓글에 새로운 대댓글이 달렸습니다`,
                  "내 댓글에 새로운 대댓글이 달렸어요! 어서 확인해보세요!",
                  push_target_all_reply,
                  player_id_array_reply,
                  "../public/asset/vetween_logo.png",
                ));
              }
            }
            break;
          default :
            this.conn.release();
        }
      });
    }
  }


  async getAlarms(user) {
    if (user) {
      const query = `SELECT alarm.*, u.nickName AS nickName, b.title AS boardTitle, b.slug AS boardSlug, a.id AS articleId, a.title AS articleTitle, c.content AS commentContent
      FROM alarm
      LEFT JOIN user AS u
      ON alarm.alarm_relatedUser_ID = u.id
      LEFT JOIN board AS b
      ON alarm.alarm_board_ID = b.id
      LEFT JOIN article AS a
      ON alarm.alarm_article_ID = a.id
      LEFT JOIN comment AS c
      ON alarm.alarm_comment_ID = c.id
      LEFT JOIN message AS m
      ON alarm.alarm_message_ID = m.id
      WHERE alarm.alarm_user_ID = ?
      ORDER BY alarm.createdAt DESC`;
      const [alarms,] = await this.conn.query(query, [user.id]);
      alarms.forEach(alarm => {
        alarm.datetime = datetime(alarm.createdAt);
        switch (alarm.type) {
          case 'newArticle':
            alarm.content = `${alarm.boardTitle} 게시판에 새로운 글이 등록 되었습니다.`;
            alarm.link = `/${alarm.boardSlug}`;
            break;
          case 'newComment':
            alarm.content = `게시글 ${alarm.articleTitle}에 새로운 댓글이 달렸습니다.`;
            alarm.link = `/${alarm.boardSlug}/${alarm.articleId}`;
            break;
          case 'replyComment':
            alarm.content = `내 댓글에 새로운 대댓글이 달렸습니다`;
            alarm.link = `/${alarm.boardSlug}/${alarm.articleId}`;
            break;
          case 'message':
            alarm.content = `${alarm.nickName}님으로부터 새 메시지가 도착했습니다`;
            alarm.link = `/message`;
        }
      });
      return alarms;
    } else {
      throw new Error('입력값이 없습니다');
    }
  }
}

module.exports = Alarm;