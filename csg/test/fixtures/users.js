import { logger } from './utils.js';

class UserService {
  constructor() {
    this.users = new Map();
  }

  getUser(id) {
    logger.debug(`Looking up user: ${id}`);
    return this.users.get(id);
  }

  createUser(data) {
    const user = {
      id: UserService.generateId(),
      name: data.name,
      email: data.email,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    logger.debug(`Created user: ${user.id}`);
    return user;
  }

  deleteUser(id) {
    const existed = this.users.has(id);
    if (existed) {
      this.users.delete(id);
      logger.info(`User deleted: ${id}`);
    }
    return existed;
  }

  listUsers(page = 1, limit = 10) {
    const all = Array.from(this.users.values());
    const start = (page - 1) * limit;
    const end = start + limit;
    logger.debug(`Listing users page ${page}, limit ${limit}`);
    return all.slice(start, end);
  }

  async batchCreateUsers(userData) {
    const results = [];
    for (const data of userData) {
      const user = this.createUser(data);
      results.push(user);
    }
    logger.info(`Batch created ${results.length} users`);
    return results;
  }

  static generateId() {
    return Math.random().toString(36).slice(2, 10);
  }
}

const userService = new UserService();
export const { getUser, createUser, deleteUser, listUsers, batchCreateUsers } = userService;
