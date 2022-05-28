const Class = require('./class');

class Menu extends Class {
  async getMenus (options) {
    options = Object.assign({
      status: true,
    }, options);
    const { status } = options;
    let statusQueryString = '';
    if (status) statusQueryString = 'AND status = 1';
    const query = `SELECT *
    FROM menu
    WHERE menu_parent_ID IS NULL
    ${statusQueryString}
    ORDER BY viewOrder ASC, id ASC`;
    const [menus, ] = await this.conn.query(query);
    for await (let menu of menus) {
      const subMenuQuery = `SELECT *
      FROM menu
      WHERE menu_parent_ID=?
      ${statusQueryString}
      ORDER BY viewOrder ASC, id ASC`;
      const [subMenus, ] = await this.conn.query(subMenuQuery, [menu.id]);
      menu.subMenus = subMenus;
    }
    return menus;
  }
  async get (menuId) {
    const [menus, ] = await this.conn.query(`SELECT * FROM menu WHERE id=?`, [menuId]);
    if (menus.length) {
      const menu = menus[0];
      return menu;
    } else {
      return null;
    }
  }
  async create (data) {
    data = Object.assign({
      parentId: null,
      title: null,
      target: null,
      viewOrder: 100,
    }, data);
    const { parentId, title, target, viewOrder } = data;
    const query = `INSERT INTO menu (menu_parent_ID, title, target, viewOrder) VALUES (?, ?, ?, ?)`;
    const [result, ] = await this.conn.query(query, [parentId, title, target.trim(), viewOrder]);
  }
  async update (menuId, data) {
    const menu = await this.get(menuId);
    data = Object.assign({
      title: menu.title,
      target: menu.target,
      viewOrder: menu.viewOrder,
      status: menu.status,
    }, data);
    const { title, target, viewOrder, status } = data;
    const query = `UPDATE menu SET title=?, target=?, viewOrder=?, status=? WHERE id=?`;
    const [result, ] = await this.conn.query(query, [title, target, viewOrder, status, menuId]);
  }
  async remove (menuId) {
    await this.conn.query(`DELETE FROM menu WHERE id=?`, [menuId]);
  }
  align (menus) {
    let basket = [];
    while (menus.length !== 0) {
      const shift = menus.shift();
      if (!shift.menu_parent_ID) {
        basket.push(shift);
        const children = menus.filter(child => child.menu_parent_ID === shift.id);
        if (children.length) {
          children.forEach(child => {
            basket.push(child);
          });
        }
      }
    }
    return basket;
  }
}

module.exports = Menu;