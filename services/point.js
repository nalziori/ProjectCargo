const Class = require('./class');

class Point extends Class {
  async create (data) {
    data = Object.assign({
      user: null,
      type: null,
      point: null,
      boardId: null,
      articleId: null,
      commentId: null,
    }, data);
    const { user, type, point } = data;
    if (user && Number(point) !== 0) {
      // 포인트 지급
      const updateQuery = `UPDATE user SET point=? WHERE id=?`;
      await this.conn.query(updateQuery, [user.point + Number(point), user.id]);
      // 포인트 내역 등록
      const insertQuery = `INSERT INTO point (point_user_ID, type, point) VALUES (?, ?, ?)`;
      await this.conn.query(insertQuery, [user.id, type, Number(point)]);
    }
  }
  async remove (data) {
    data = Object.assign({
      user: null,
      type: null,
      point: null,
      boardId: null,
      articleId: null,
      commentId: null,
    }, data);
    const { user, type, point, boardId, articleId } = data;
    if (user && Number(point) !== 0) {
      // 포인트 차감
      const updateQuery = `UPDATE user SET point=? WHERE id=?`;
      await this.conn.query(updateQuery, [user.point + Number(point * -1), user.id]);
      // 포인트 내역 등록
      const insertQuery = `INSERT INTO point (point_user_ID, point_board_ID, point_article_ID, type, point) VALUES (?, ?, ?, ?, ?)`;
      await this.conn.query(insertQuery, [user.id, boardId, articleId, type, Number(point * -1)]);
    }
  }
  async checkOut (data) {
    data = Object.assign({
      user: null,
      type: null,
      point: null,
    }, data);
    const { user, type, point } = data;
    if (user.point >= Number(point)) {
      // 포인트 차감
      const updateQuery = `UPDATE user SET point=? WHERE id=?`;
      await this.conn.query(updateQuery, [user.point + Number(point * -1), user.id]);
      // 포인트 내역 등록
      const insertQuery = `INSERT INTO point (point_user_ID, type, point) VALUES (?, ?, ?)`;
      await this.conn.query(insertQuery, [user.id, type, Number(point * -1)]);
    } else {
      throw new Error('포인트가 부족합니다');
    }
  }
  async check (data) {
    data = Object.assign({
      user: null,
      type: null,
      articleId: null,
    }, data);
    const { user, type, articleId } = data;
    if (user) {
      if (type === 'read') {
        const query = `SELECT * FROM point WHERE point_article_ID=? AND point_user_ID=?`;
        const [result, ] = await this.conn.query(query, [articleId, user?.id]);
        if (result.length) {
          return true;
        } else {
          return false;
        }
      }
    } else {
      return false;
    }
  }
}

module.exports = Point;