import { getUser, createUser } from './users.js';
import { authMiddleware } from './middleware.js';
import { logger } from './utils.js';
import express from 'express';

const app = express();

app.use(express.json());
app.use(authMiddleware);

app.get('/api/users/:id', (req, res) => {
  try {
    const user = getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.info(`User fetched: ${user.id}`);
    return res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to fetch user: ${message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }

  const newUser = createUser({ name, email });
  logger.info(`User created: ${newUser.id}`);
  return res.status(201).json(newUser);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(3000, () => {
  logger.info('Server started on port 3000');
});
