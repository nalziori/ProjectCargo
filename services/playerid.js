const Class = require('./class');

class playerid extends Class{
    async create(data){
        data = Object.assign({
            id: null,       //유저 아이디
            userId: null,   //원시그널 player id
        }, data);

        const { id, userId } = data;
        this.conn.query('UPDATE user SET appToken=? WHERE id=?', [userId, id]);
    }

    async getuserid(user){
        let queryString='';
        if(user){
            queryString += `WHERE id = '${user}'`;
        }
        const query = `SELECT id,appToken FROM user ${queryString}`;
        const [playerids, ] = await this.conn.query(query);
        return playerids;
    }
}

module.exports = playerid;