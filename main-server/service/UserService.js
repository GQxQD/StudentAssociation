const BaseService = require('./BaseService');
const User = require('./../model/user');

class UserService extends BaseService {

    /**
     * 获取用户信息
     * @param _id
     * @param opt
     * @returns {Promise<*>}
     */
    static async findById(_id = '', opt = {}) {
        if (!_id || typeof _id !== 'string' || _id.length !== 24) {
            return this.failure(' _id 不合法', 401);
        }
        let user = User.findById(_id, '-password');
        for (let key in opt) {
            if (opt[key]) {
                user = user.populate(key);
            }
        }
        user = await user;
        // 过滤掉用户密码和相关不必要信息
        // let { __v, password, ...filteredInfo } = user._doc;
        // 判断是否显示登录日志
        if (opt.logs) {
            user.loginLogs = await this.redis().get(`LOGIN:${_id}`);
        }
        return this.success(filteredInfo);
    }

    static async findAll() {
        let users = await User.find();
        users = users.map((user) => {
            let { __v, password, ...filteredInfo } = user._doc;
            return filteredInfo;
        });
        return this.success(users);
    }

    /**
     * 注册
     * @param username
     * @param password
     * @returns {Promise<*>}
     */
    static async register(username = '', password = '') {
        let user = new User({ username, password });
        const error = this.validate(user);
        if (error) {
            return error;
        }
        if (await User.findOne({ username })) {
            return this.failure('用户名已经存在了', 400);
        }
        user = await user.save();
        return this.success(user, 201);
    }

    /**
     *
     * 更新用户密码
     * @param _id
     * @param oldPassword
     * @param newPassword
     * @returns {Promise<*>}
     */
    static async updatePassword(_id = '', oldPassword = '', newPassword = '') {
        let user = await User.findById(_id);
        console.log(user);
        if (user) {
            if (oldPassword === user.password) {
                user.password = newPassword;
                const error = this.validate(user);
                if (error) {
                    return error;
                }
                await user.save();
                return this.success();
            } else {
                return this.failure('旧密码输入错误', 400);
            }
        } else {
            return this.failure();
        }
    }

    /**
     * 更新用户信息
     * @param _id
     * @param info
     * @returns {Promise<*>}
     */
    static async updateInfo(_id = '', info = {}) {
        let user = await User.findById(_id);
        if (user) {
            for (let key in info) {
                if (key === 'school' && user.association) {
                    return this.failure('当前不能修改学校，请先退出同乡会');
                }
                user[key] = info[key];
            }
            const error = this.validate(user);
            if (error) {
                return error;
            }
            await user.save();
            return this.success();
        } else {
            return this.failure();
        }
    }
}

module.exports = UserService;