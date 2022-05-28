const Class = require('./class');

class Permission extends Class {
  async getPermissions () {
    const [permissions, ] = await this.conn.query(`SELECT * FROM permission ORDER BY permission ASC`);
    return permissions;
  }
  async create (data) {
    data = Object.assign({
      permission: null,
      title: null,
    }, data);
    const { permission, title } = data;
    const [result, ] = await this.conn.query(`INSERT INTO permission (permission, title) VALUES (?, ?)`, [permission, title]);
    if (result.insertId) {
      return true;
    } else {
      throw new Error('등록 실패');
    }
  }
  async update (permissionId, data) {

  }
  async remove (permissionId) {
    await this.conn.query(`DELETE FROM permission WHERE id=?`, [permissionId]);
  }
  async check () {
    const user = this.user;
    const permissions = this.res.locals.permissions;
    if (!user.isAdmin && user.permission !== 0 && !user.workingUser) {
      const currentPermission = this.getCurrentPermission(user, permissions);
      if (user.permission !== currentPermission) {
        await this.conn.query(`UPDATE user SET permission=? WHERE id=?`, [currentPermission, user.id]);
      }
    }
  }
  getCurrentPermission (user, permissions) {
    let currentPermission = 1;
    for (let i = 0; i < permissions.length; i ++) {
      if (user.point >= permissions[i].pointBaseline && permissions[i].pointBaseline !== 0 && !permissions[i].isAdmin) {
        currentPermission = permissions[i].permission;
      }
    }
    return currentPermission;
  }
}

module.exports = Permission;