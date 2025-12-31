/**
 * ProjectDashboard Authentication Module
 * Simple session-based auth with bcrypt password hashing
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json');

// Session expiry: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Load/save helpers
async function loadJSON(file, defaultValue = {}) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

async function saveJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// User management
export async function createUser(email, password, name) {
  const users = await loadJSON(USERS_FILE, { users: [] });

  // Check if user exists
  if (users.users.find(u => u.email === email)) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    email,
    name,
    password: hashedPassword,
    plan: 'free', // free, pro, team
    createdAt: new Date().toISOString()
  };

  users.users.push(user);
  await saveJSON(USERS_FILE, users);

  return { id: user.id, email: user.email, name: user.name, plan: user.plan };
}

export async function validateUser(email, password) {
  const users = await loadJSON(USERS_FILE, { users: [] });
  const user = users.users.find(u => u.email === email);

  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name, plan: user.plan };
}

// Session management
export async function createSession(userId) {
  const sessions = await loadJSON(SESSIONS_FILE, { sessions: [] });
  const token = crypto.randomBytes(32).toString('hex');

  const session = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS).toISOString()
  };

  sessions.sessions.push(session);
  await saveJSON(SESSIONS_FILE, sessions);

  return token;
}

export async function validateSession(token) {
  const sessions = await loadJSON(SESSIONS_FILE, { sessions: [] });
  const session = sessions.sessions.find(s => s.token === token);

  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    // Session expired - clean it up
    sessions.sessions = sessions.sessions.filter(s => s.token !== token);
    await saveJSON(SESSIONS_FILE, sessions);
    return null;
  }

  // Get user
  const users = await loadJSON(USERS_FILE, { users: [] });
  const user = users.users.find(u => u.id === session.userId);

  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name, plan: user.plan };
}

export async function deleteSession(token) {
  const sessions = await loadJSON(SESSIONS_FILE, { sessions: [] });
  sessions.sessions = sessions.sessions.filter(s => s.token !== token);
  await saveJSON(SESSIONS_FILE, sessions);
}

// Middleware
export function authMiddleware(required = true) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      if (required) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return next();
    }

    const user = await validateSession(token);

    if (!user && required) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    next();
  };
}

// Plan checking
export function requirePlan(minPlan) {
  const planLevels = { free: 0, pro: 1, team: 2 };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (planLevels[req.user.plan] < planLevels[minPlan]) {
      return res.status(403).json({ error: `${minPlan} plan required` });
    }

    next();
  };
}
