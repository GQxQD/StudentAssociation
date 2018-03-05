const BaseController = require('./BaseController');
const UserService = require('../service/UserService');
const SessionService = require('../service/SessionService');

class UserController extends BaseController {

    /**
     * 通过 token 获取用户信息
     * @param ctx
     * @returns {Promise<void>}
     */
    static async get(ctx) {
        const token = ctx.header.authorization;
        let result = await SessionService.validateToken(token);
        if (result.status === 0)
            result = await UserService.findById(result.data._id, ctx.request.query);
        ctx.json(result);
    }

    static async getAll(ctx) {
        ctx.json(await UserService.findAll());
    }

    /**
     * 用户注册
     * @param ctx
     * @returns {Promise<void>}
     */
    static async register(ctx) {
        const { username = '', password = '' } = ctx.request.body;
        ctx.json(await UserService.register(username, password));
    }

    /**
     * 更新用户信息
     * @param ctx
     * @returns {Promise<void>}
     */
    static async put(ctx) {
        const token = ctx.header.authorization;
        let result = await SessionService.validateToken(token);
        if (result.status === 0) {
            if (ctx.request.query.pwd) {
                // 判断是否为更新密码
                const { oldPassword, newPassword } = ctx.request.body;
                result = await UserService.updatePassword(result.data._id, oldPassword, newPassword);
            } else {
                const { password, ...others } = ctx.request.body;
                result = await UserService.updateInfo(result.data._id, others);
            }
        }
        ctx.json(result);
    }

    static async delete(ctx, next) {
    }
}

module.exports = UserController;