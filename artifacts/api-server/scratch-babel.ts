import * as parser from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = typeof _traverse === 'function' ? _traverse : _traverse.default;

const code = `
import { Router } from 'express';
import { db } from './db';
import { z } from 'zod';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.query(\`SELECT * FROM users WHERE username = '\${username}'\`);
  
  if (user) {
    eval(user.role);
    res.send("Hello " + username);
  }
});
`;

const ast = parser.parse(code, {
  sourceType: "module",
  plugins: ["typescript", "jsx"]
});

traverse(ast, {
  CallExpression(path) {
    if (path.node.callee.type === 'MemberExpression') {
      const obj = path.node.callee.object;
      const prop = path.node.callee.property;
      if (obj.type === 'Identifier' && obj.name === 'router' && prop.type === 'Identifier') {
        console.log("Found route:", prop.name, path.node.arguments[0]?.value);
      }
      if (obj.type === 'Identifier' && obj.name === 'db' && prop.type === 'Identifier' && prop.name === 'query') {
        console.log("Found DB query:", path.node.arguments[0]?.type);
      }
    }
    if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'eval') {
      console.log("Found eval sink!");
    }
  },
  MemberExpression(path) {
    if (path.node.object.type === 'Identifier' && path.node.object.name === 'req' && path.node.property.type === 'Identifier' && path.node.property.name === 'body') {
      console.log("Found req.body source!");
    }
  }
});
