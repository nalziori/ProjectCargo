const Class = require('./class');
const Category = require('./category');
const pagination = require('../middleware/pagination');
const hashCreate = require('../middleware/hash');

class Board extends Class {
  async getBoards () {
    const [boards, ] = await this.conn.query(`SELECT * FROM board ORDER BY id ASC`);
    return boards;
  }
  async getBoardsByPagination (listCount) {
    const pnQuery = `SELECT count(*) AS count FROM board`;
    const pn = await pagination(pnQuery, this.req.query, 'page', listCount, 5);
    const query = `SELECT *
    FROM board
    ORDER BY createdAt DESC
    ${pn.queryLimit}`;
    const [boards, ] = await this.conn.query(query);
    return {
      boards,
      pn,
    };
  }
  async get (boardSlug, options) {
    options = Object.assign({
      categories: false,
    }, options);
    const { categories } = options;
    const [boards, ] = await this.conn.query(`SELECT * FROM board WHERE slug=?`, [boardSlug]);
    if (boards.length) {
      const board = boards[0];
      if (categories) {
        const categoryClass = new Category(this.req, this.res, this.conn);
        board.categories = await categoryClass.getCategories(board.id);
      }
      return board;
    } else {
      return null;
    }
  }
  async getById (boardId, options) {
    options = Object.assign({
      categories: false,
    }, options);
    const { categories } = options;
    const [boards, ] = await this.conn.query(`SELECT * FROM board WHERE id=?`, [boardId]);
    if (boards.length) {
      const board = boards[0];
      if (categories) {
        const categoryClass = new Category(this.req, this.res, this.conn);
        board.categories = await categoryClass.getCategories(board.id);
      }
      return board;
    } else {
      return null;
    }
  }
  async create (data) {
    data = Object.assign({
      title: null,
      slug: hashCreate(6),
      type: 'board',
    }, data);
    const { title, slug, type } = data;
    if (title) {
      const [duplicateResult, ] = await this.conn.query(`SELECT * FROM board WHERE title=? OR slug=?`, [title, slug]);
      if (!duplicateResult.length) {
        const query = `INSERT INTO board (title, slug, type) VALUES (?, ?, ?)`;
        const [result, ] = await this.conn.query(query, [title, slug, type]);
        if (result.insertId) {
          return result.insertId;
        } else {
          throw new Error('게시판 생성에 실패하였습니다');
        }
      } else {
        throw new Error('이미 존재하는 값입니다');
      }
    } else {
      throw new Error('게시판 이름을 입력해주세요');
    }
  }
  async update (boardId, data) {
    const board = await this.getById(boardId);
    data = Object.assign({
      title: board.title,
      slug: board.slug,
      type: board.type,
      listCount: board.listCount,
      listPermission: board.listPermission,
      readPermission: board.readPermission,
      writePermission: board.writePermission,
      commentPermission: board.commentPermission,
      writePoint: board.writePoint,
      commentPoint: board.commentPoint,
      readPoint: board.readPoint,
      useSecret: board.useSecret,
      useAnonymous: board.useAnonymous,
      useOnce: board.useOnce,
      useLinks: board.useLinks,
      useFiles: board.useFiles,
      useUserGroupPermission: board.useUserGroupPermission,
      useUserAlarm: board.useUserAlarm,
      useAdminAlarm: board.useAdminAlarm,
      useCustomField01: board.useCustomField01,
      useCustomField02: board.useCustomField02,
      useCustomField03: board.useCustomField03,
      useCustomField04: board.useCustomField04,
      useCustomField05: board.useCustomField05,
      useCustomField06: board.useCustomField06,
      useCustomField07: board.useCustomField07,
      useCustomField08: board.useCustomField08,
      useCustomField09: board.useCustomField09,
      useCustomField10: board.useCustomField10,
      customFieldTitle01: board.customFieldTitle01,
      customFieldTitle02: board.customFieldTitle02,
      customFieldTitle03: board.customFieldTitle03,
      customFieldTitle04: board.customFieldTitle04,
      customFieldTitle05: board.customFieldTitle05,
      customFieldTitle06: board.customFieldTitle06,
      customFieldTitle07: board.customFieldTitle07,
      customFieldTitle08: board.customFieldTitle08,
      customFieldTitle09: board.customFieldTitle09,
      customFieldTitle10: board.customFieldTitle10,
    }, data);
    const { title, slug, type, listCount, listPermission, readPermission, writePermission, commentPermission, writePoint, commentPoint, readPoint, useSecret, useAnonymous, useOnce, useLinks, useFiles, useUserGroupPermission, useUserAlarm, useAdminAlarm } = data;
    const { useCustomField01, useCustomField02, useCustomField03, useCustomField04, useCustomField05, useCustomField06, useCustomField07, useCustomField08, useCustomField09, useCustomField10 } = data;
    const { customFieldTitle01, customFieldTitle02, customFieldTitle03, customFieldTitle04, customFieldTitle05, customFieldTitle06, customFieldTitle07, customFieldTitle08, customFieldTitle09, customFieldTitle10 } = data;
    const query = `UPDATE board SET title=?, slug=?, type=?, listCount=?, listPermission=?, readPermission=?, writePermission=?, commentPermission=?, writePoint=?, commentPoint=?, readPoint=?, useSecret=?, useAnonymous=?, useOnce=?, useLinks=?, useFiles=?, useUserGroupPermission=?, useUserAlarm=?, useAdminAlarm=?,
    useCustomField01=?, useCustomField02=?, useCustomField03=?, useCustomField04=?, useCustomField05=?, useCustomField06=?, useCustomField07=?, useCustomField08=?, useCustomField09=?, useCustomField10=?,
    customFieldTitle01=?, customFieldTitle02=?, customFieldTitle03=?, customFieldTitle04=?, customFieldTitle05=?, customFieldTitle06=?, customFieldTitle07=?, customFieldTitle08=?, customFieldTitle09=?, customFieldTitle10=?
    WHERE id=?`;
    await this.conn.query(query, [
      title, slug.trim(), type, listCount, listPermission, readPermission, writePermission, commentPermission, writePoint, commentPoint, readPoint, useSecret, useAnonymous, useOnce, useLinks, useFiles, useUserGroupPermission, useUserAlarm, useAdminAlarm,
      useCustomField01, useCustomField02, useCustomField03, useCustomField04, useCustomField05, useCustomField06, useCustomField07, useCustomField08, useCustomField09, useCustomField10,
      customFieldTitle01, customFieldTitle02, customFieldTitle03, customFieldTitle04, customFieldTitle05, customFieldTitle06, customFieldTitle07, customFieldTitle08, customFieldTitle09, customFieldTitle10,
      boardId,
    ]);
  }
  async remove (boardId) {
    await this.conn.query(`DELETE FROM board WHERE id=?`, [boardId]);
  }
}

module.exports = Board;