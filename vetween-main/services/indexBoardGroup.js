const Class = require('./class');

class IndexBoardGroup extends Class {
  async get (indexBoardGroupId) {
    const [indexBoardGroups, ] = await this.conn.query(`SELECT * FROM indexBoardGroup WHERE id=?`, [indexBoardGroupId]);
    if (indexBoardGroups.length) {
      const indexBoardGroup = indexBoardGroups[0];
      return indexBoardGroup;
    } else {
      return false;
    }
  }
  async create () {

  }
  async update (indexBoardGroupId, data) {
    const indexBoardGroup = await this.get(indexBoardGroupId);
    data = Object.assign({
      status: indexBoardGroup.status,
    }, data);
    const { status } = data;
    await this.conn.query(`UPDATE indexBoardGroup SET status=? WHERE id=?`, [status, indexBoardGroupId]);
  }
}

module.exports = IndexBoardGroup;