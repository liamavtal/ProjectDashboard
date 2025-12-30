import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { google } from 'googleapis';
import { createDAVClient } from 'tsdav';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend in production
app.use(express.static(path.join(__dirname, 'dist')));

// Data files
const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const FINANCES_FILE = path.join(DATA_DIR, 'finances.json');
const AUTOMATIONS_FILE = path.join(DATA_DIR, 'automations.json');
const CALENDAR_FILE = path.join(DATA_DIR, 'calendar.json');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');
const GOOGLE_TOKENS_FILE = path.join(DATA_DIR, 'google-tokens.json');
const GOOGLE_CREDS_FILE = path.join(DATA_DIR, 'google-credentials.json');
const ICLOUD_CREDS_FILE = path.join(DATA_DIR, 'icloud-credentials.json');

// Ensure data directory exists
await fs.mkdir(DATA_DIR, { recursive: true });

// Directories to scan (use env var for production)
const SCAN_DIRS = process.env.SCAN_DIRS
  ? process.env.SCAN_DIRS.split(',')
  : ['C:\\Users\\liam1\\Desktop', 'C:\\Users\\liam1'];

// ============================================================================
// DATA HELPERS
// ============================================================================

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

// ============================================================================
// GOOGLE OAUTH SETUP
// ============================================================================

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels'
];

let oauth2Client = null;

async function getOAuth2Client() {
  if (oauth2Client) return oauth2Client;

  try {
    const creds = await loadJSON(GOOGLE_CREDS_FILE);
    if (!creds.client_id) return null;

    const baseUrl = process.env.BASE_URL || 'http://localhost:3847';
    oauth2Client = new google.auth.OAuth2(
      creds.client_id,
      creds.client_secret,
      `${baseUrl}/api/google/callback`
    );

    // Try to load existing tokens
    const tokens = await loadJSON(GOOGLE_TOKENS_FILE);
    if (tokens.access_token) {
      oauth2Client.setCredentials(tokens);
    }

    return oauth2Client;
  } catch {
    return null;
  }
}

// ============================================================================
// GIT HELPERS
// ============================================================================

async function getGitInfo(dir) {
  try {
    const [branchResult, statusResult, logResult, remoteResult] = await Promise.all([
      execAsync('git rev-parse --abbrev-ref HEAD', { cwd: dir }).catch(() => ({ stdout: '' })),
      execAsync('git status --porcelain', { cwd: dir }).catch(() => ({ stdout: '' })),
      execAsync('git log -5 --pretty=format:"%h|%s|%cr|%an" 2>nul', { cwd: dir }).catch(() => ({ stdout: '' })),
      execAsync('git remote -v', { cwd: dir }).catch(() => ({ stdout: '' }))
    ]);

    const branch = branchResult.stdout.trim();
    if (!branch) return null;

    const statusLines = statusResult.stdout.trim().split('\n').filter(Boolean);
    const changes = statusLines.map(line => ({
      status: line.slice(0, 2).trim(),
      file: line.slice(3)
    }));

    const commits = logResult.stdout.trim().split('\n').filter(Boolean).map(line => {
      const [hash, message, time, author] = line.split('|');
      return { hash, message, time, author };
    });

    let ahead = 0, behind = 0;
    try {
      const { stdout } = await execAsync('git rev-list --left-right --count HEAD...@{upstream}', { cwd: dir });
      [ahead, behind] = stdout.trim().split('\t').map(Number);
    } catch {}

    return {
      branch,
      changes,
      commits,
      ahead,
      behind,
      hasRemote: remoteResult.stdout.includes('origin'),
      isClean: changes.length === 0
    };
  } catch {
    return null;
  }
}

async function getProjectInfo(dir) {
  try {
    const files = await fs.readdir(dir);
    const info = { type: 'unknown', scripts: [], hasNodeModules: files.includes('node_modules') };

    if (files.includes('package.json')) {
      try {
        const pkg = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf-8'));
        info.scripts = Object.keys(pkg.scripts || {});
        info.type = pkg.dependencies?.react ? 'react' : 'node';
        if (files.includes('vite.config.js') || files.includes('vite.config.ts')) info.type = 'vite';
      } catch {}
    } else if (files.includes('requirements.txt') || files.includes('main.py')) {
      info.type = 'python';
      info.scripts = ['run'];
    } else if (files.includes('manifest.json')) {
      info.type = 'extension';
    }

    const stats = await fs.stat(dir);
    info.modified = stats.mtime;

    return info;
  } catch {
    return { type: 'unknown', scripts: [], modified: new Date() };
  }
}

async function scanProjects() {
  const projects = [];
  const seen = new Set();

  for (const baseDir of SCAN_DIRS) {
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        const fullPath = path.join(baseDir, entry.name);
        if (seen.has(fullPath)) continue;
        seen.add(fullPath);

        const files = await fs.readdir(fullPath).catch(() => []);
        const isProject = files.some(f =>
          ['package.json', 'requirements.txt', '.git', 'manifest.json', 'Cargo.toml', 'go.mod'].includes(f)
        );

        if (isProject) {
          const [git, info] = await Promise.all([
            getGitInfo(fullPath),
            getProjectInfo(fullPath)
          ]);

          projects.push({
            id: Buffer.from(fullPath).toString('base64'),
            name: entry.name,
            path: fullPath,
            git,
            ...info
          });
        }
      }
    } catch {}
  }

  return projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));
}

// ============================================================================
// PROJECTS API
// ============================================================================

app.get('/api/projects', async (req, res) => {
  try {
    const [projects, data] = await Promise.all([scanProjects(), loadJSON(PROJECTS_FILE)]);

    const enriched = projects.map(p => ({
      ...p,
      pinned: data.pinned?.includes(p.id),
      notes: data.projects?.[p.id]?.notes,
      status: data.projects?.[p.id]?.status || 'active'
    }));

    enriched.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.modified) - new Date(a.modified);
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.params.id, 'base64').toString();
    const [git, info] = await Promise.all([getGitInfo(projectPath), getProjectInfo(projectPath)]);
    res.json({ git, ...info, path: projectPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:id', async (req, res) => {
  try {
    const data = await loadJSON(PROJECTS_FILE);
    const { notes, status, pinned } = req.body;

    if (!data.projects) data.projects = {};
    if (!data.projects[req.params.id]) data.projects[req.params.id] = {};

    if (notes !== undefined) data.projects[req.params.id].notes = notes;
    if (status !== undefined) data.projects[req.params.id].status = status;

    if (pinned !== undefined) {
      data.pinned = data.pinned || [];
      if (pinned && !data.pinned.includes(req.params.id)) {
        data.pinned.push(req.params.id);
      } else if (!pinned) {
        data.pinned = data.pinned.filter(id => id !== req.params.id);
      }
    }

    await saveJSON(PROJECTS_FILE, data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GIT API
// ============================================================================

app.get('/api/git/diff', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.query.project, 'base64').toString();
    const file = req.query.file;

    const cmd = file ? `git diff "${file}"` : 'git diff';
    const { stdout } = await execAsync(cmd, { cwd: projectPath, maxBuffer: 10 * 1024 * 1024 });

    const { stdout: staged } = await execAsync(file ? `git diff --cached "${file}"` : 'git diff --cached', {
      cwd: projectPath, maxBuffer: 10 * 1024 * 1024
    });

    res.json({ diff: stdout || staged || 'No changes to display' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/stage', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    const files = req.body.files || ['.'];

    for (const file of files) {
      await execAsync(`git add "${file}"`, { cwd: projectPath });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/unstage', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    const files = req.body.files || ['.'];

    for (const file of files) {
      await execAsync(`git reset HEAD "${file}"`, { cwd: projectPath });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/commit', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    const message = req.body.message;

    if (!message) return res.status(400).json({ error: 'Commit message required' });

    const { stdout: staged } = await execAsync('git diff --cached --name-only', { cwd: projectPath });
    if (!staged.trim()) {
      await execAsync('git add -A', { cwd: projectPath });
    }

    await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: projectPath });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/push', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    await execAsync('git push', { cwd: projectPath, timeout: 30000 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/pull', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    const { stdout } = await execAsync('git pull', { cwd: projectPath, timeout: 30000 });
    res.json({ success: true, output: stdout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/discard', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    const file = req.body.file;

    await execAsync(`git checkout -- "${file}"`, { cwd: projectPath });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// PROJECT ACTIONS API
// ============================================================================

app.post('/api/open/vscode', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    await execAsync(`code "${projectPath}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/open/terminal', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    await execAsync(`start cmd /k "cd /d ${projectPath}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/open/explorer', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    await execAsync(`explorer "${projectPath}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/run/script', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    const script = req.body.script;

    await execAsync(`start cmd /k "cd /d ${projectPath} && npm run ${script}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/run/install', async (req, res) => {
  try {
    const projectPath = Buffer.from(req.body.project, 'base64').toString();
    await execAsync(`start cmd /k "cd /d ${projectPath} && npm install"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GITHUB API
// ============================================================================

app.get('/api/github/user', async (req, res) => {
  try {
    const { stdout } = await execAsync('gh api user');
    res.json(JSON.parse(stdout));
  } catch (err) {
    res.status(500).json({ error: 'Not logged in to GitHub', details: err.message });
  }
});

app.get('/api/github/repos', async (req, res) => {
  try {
    const { stdout } = await execAsync('gh repo list --json name,description,url,isPrivate,pushedAt,primaryLanguage --limit 50');
    res.json(JSON.parse(stdout));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/github/issues', async (req, res) => {
  try {
    const { stdout } = await execAsync('gh api "/user/issues?state=open&per_page=30"');
    const issues = JSON.parse(stdout).map(i => ({
      id: i.id,
      title: i.title,
      repo: i.repository.full_name,
      url: i.html_url,
      state: i.state,
      labels: i.labels.map(l => ({ name: l.name, color: l.color })),
      createdAt: i.created_at,
      updatedAt: i.updated_at
    }));
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/github/prs', async (req, res) => {
  try {
    const { stdout } = await execAsync('gh api "/user/issues?state=open&filter=created&per_page=30"');
    const prs = JSON.parse(stdout)
      .filter(i => i.pull_request)
      .map(i => ({
        id: i.id,
        title: i.title,
        repo: i.repository.full_name,
        url: i.html_url,
        state: i.state,
        draft: i.draft,
        createdAt: i.created_at,
        updatedAt: i.updated_at
      }));
    res.json(prs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/github/notifications', async (req, res) => {
  try {
    const { stdout } = await execAsync('gh api "/notifications?per_page=20"');
    const notifications = JSON.parse(stdout).map(n => ({
      id: n.id,
      reason: n.reason,
      title: n.subject.title,
      type: n.subject.type,
      repo: n.repository.full_name,
      url: n.subject.url,
      unread: n.unread,
      updatedAt: n.updated_at
    }));
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/notifications/:id/read', async (req, res) => {
  try {
    await execAsync(`gh api -X PATCH "/notifications/threads/${req.params.id}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/repos', async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const visibility = isPrivate ? '--private' : '--public';
    const desc = description ? `--description "${description}"` : '';

    const { stdout } = await execAsync(`gh repo create "${name}" ${visibility} ${desc} --confirm`);
    res.json({ success: true, output: stdout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/clone', async (req, res) => {
  try {
    const { repoUrl, targetDir } = req.body;
    const target = targetDir || 'C:\\Users\\liam1\\Desktop';

    await execAsync(`gh repo clone "${repoUrl}"`, { cwd: target });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/open', async (req, res) => {
  try {
    const { repo } = req.body;
    await execAsync(`gh repo view "${repo}" --web`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// TASKS API
// ============================================================================

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await loadJSON(TASKS_FILE, []);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const tasks = await loadJSON(TASKS_FILE, []);
    const newTask = {
      id: Date.now().toString(),
      title: req.body.title,
      completed: false,
      projectId: req.body.projectId || null,
      priority: req.body.priority || null,
      dueDate: req.body.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tasks.unshift(newTask);
    await saveJSON(TASKS_FILE, tasks);
    res.json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const tasks = await loadJSON(TASKS_FILE, []);
    const index = tasks.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Task not found' });

    tasks[index] = { ...tasks[index], ...req.body, updatedAt: new Date().toISOString() };
    await saveJSON(TASKS_FILE, tasks);
    res.json(tasks[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    let tasks = await loadJSON(TASKS_FILE, []);
    tasks = tasks.filter(t => t.id !== req.params.id);
    await saveJSON(TASKS_FILE, tasks);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// NOTES API
// ============================================================================

app.get('/api/notes', async (req, res) => {
  try {
    const notes = await loadJSON(NOTES_FILE, []);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const notes = await loadJSON(NOTES_FILE, []);
    const newNote = {
      id: Date.now().toString(),
      title: req.body.title,
      content: req.body.content || '',
      projectId: req.body.projectId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.unshift(newNote);
    await saveJSON(NOTES_FILE, notes);
    res.json(newNote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notes/:id', async (req, res) => {
  try {
    const notes = await loadJSON(NOTES_FILE, []);
    const index = notes.findIndex(n => n.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Note not found' });

    notes[index] = { ...notes[index], ...req.body, updatedAt: new Date().toISOString() };
    await saveJSON(NOTES_FILE, notes);
    res.json(notes[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    let notes = await loadJSON(NOTES_FILE, []);
    notes = notes.filter(n => n.id !== req.params.id);
    await saveJSON(NOTES_FILE, notes);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GOOGLE OAUTH API
// ============================================================================

// Check Google auth status
app.get('/api/google/status', async (req, res) => {
  try {
    const creds = await loadJSON(GOOGLE_CREDS_FILE);
    const tokens = await loadJSON(GOOGLE_TOKENS_FILE);

    res.json({
      hasCredentials: !!creds.client_id,
      isAuthenticated: !!tokens.access_token,
      needsSetup: !creds.client_id
    });
  } catch (err) {
    res.json({ hasCredentials: false, isAuthenticated: false, needsSetup: true });
  }
});

// Save Google credentials
app.post('/api/google/credentials', async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;
    await saveJSON(GOOGLE_CREDS_FILE, { client_id, client_secret });
    oauth2Client = null; // Reset to force reload
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get auth URL
app.get('/api/google/auth-url', async (req, res) => {
  try {
    const client = await getOAuth2Client();
    if (!client) {
      return res.status(400).json({ error: 'Google credentials not configured' });
    }

    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_SCOPES,
      prompt: 'consent'
    });

    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OAuth callback
app.get('/api/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const client = await getOAuth2Client();

    if (!client) {
      return res.status(400).send('Google credentials not configured');
    }

    const { tokens } = await client.getToken(code);
    await saveJSON(GOOGLE_TOKENS_FILE, tokens);
    client.setCredentials(tokens);

    // Redirect back to app
    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5177';
    res.redirect(`${frontendUrl}?google=connected`);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// Disconnect Google
app.post('/api/google/disconnect', async (req, res) => {
  try {
    await saveJSON(GOOGLE_TOKENS_FILE, {});
    oauth2Client = null;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// CALENDAR API (Local Storage - Personal Calendar)
// ============================================================================

app.get('/api/calendar/events', async (req, res) => {
  try {
    const events = await loadJSON(CALENDAR_FILE, []);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calendar/events', async (req, res) => {
  try {
    const events = await loadJSON(CALENDAR_FILE, []);
    const { title, description, start, end, color } = req.body;

    const newEvent = {
      id: Date.now().toString(),
      title,
      description,
      start,
      end,
      color: color || 'indigo',
      createdAt: new Date().toISOString()
    };

    events.push(newEvent);
    await saveJSON(CALENDAR_FILE, events);
    res.json({ success: true, event: newEvent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/calendar/events/:id', async (req, res) => {
  try {
    let events = await loadJSON(CALENDAR_FILE, []);
    events = events.filter(e => e.id !== req.params.id);
    await saveJSON(CALENDAR_FILE, events);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REMINDERS API (Quick personal reminders)
// ============================================================================

app.get('/api/reminders', async (req, res) => {
  try {
    const reminders = await loadJSON(REMINDERS_FILE, []);
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders', async (req, res) => {
  try {
    const reminders = await loadJSON(REMINDERS_FILE, []);
    const newReminder = {
      id: Date.now().toString(),
      text: req.body.text,
      createdAt: req.body.createdAt || new Date().toISOString()
    };
    reminders.unshift(newReminder);
    await saveJSON(REMINDERS_FILE, reminders);
    res.json(newReminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reminders/:id', async (req, res) => {
  try {
    let reminders = await loadJSON(REMINDERS_FILE, []);
    reminders = reminders.filter(r => r.id !== req.params.id);
    await saveJSON(REMINDERS_FILE, reminders);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ICLOUD CALDAV API (Apple Calendar)
// ============================================================================

let icloudClient = null;

async function getICloudClient() {
  try {
    const creds = await loadJSON(ICLOUD_CREDS_FILE);
    if (!creds.email || !creds.appPassword) return null;

    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: creds.email,
        password: creds.appPassword
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav'
    });

    return client;
  } catch (err) {
    console.error('iCloud client error:', err.message);
    return null;
  }
}

// Check iCloud connection status
app.get('/api/icloud/status', async (req, res) => {
  try {
    const creds = await loadJSON(ICLOUD_CREDS_FILE);
    const hasCredentials = !!creds.email && !!creds.appPassword;

    if (!hasCredentials) {
      return res.json({ connected: false, hasCredentials: false });
    }

    // Try to connect to verify credentials
    const client = await getICloudClient();
    if (!client) {
      return res.json({ connected: false, hasCredentials: true, error: 'Failed to connect' });
    }

    res.json({ connected: true, hasCredentials: true, email: creds.email });
  } catch (err) {
    res.json({ connected: false, hasCredentials: false, error: err.message });
  }
});

// Save iCloud credentials
app.post('/api/icloud/credentials', async (req, res) => {
  try {
    const { email, appPassword } = req.body;

    // Test the credentials first
    try {
      const testClient = await createDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        credentials: { username: email, password: appPassword },
        authMethod: 'Basic',
        defaultAccountType: 'caldav'
      });

      // Try to fetch calendars to verify
      await testClient.fetchCalendars();
    } catch (err) {
      return res.status(400).json({ error: 'Invalid credentials. Make sure you use an app-specific password.' });
    }

    await saveJSON(ICLOUD_CREDS_FILE, { email, appPassword });
    icloudClient = null; // Reset cached client
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect iCloud
app.post('/api/icloud/disconnect', async (req, res) => {
  try {
    await saveJSON(ICLOUD_CREDS_FILE, {});
    icloudClient = null;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get iCloud calendars
app.get('/api/icloud/calendars', async (req, res) => {
  try {
    const client = await getICloudClient();
    if (!client) {
      return res.status(401).json({ error: 'Not connected to iCloud' });
    }

    const calendars = await client.fetchCalendars();
    res.json(calendars.map(cal => ({
      url: cal.url,
      displayName: cal.displayName,
      color: cal.calendarColor
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get iCloud calendar events
app.get('/api/icloud/events', async (req, res) => {
  try {
    const client = await getICloudClient();
    if (!client) {
      return res.status(401).json({ error: 'Not connected to iCloud' });
    }

    const calendars = await client.fetchCalendars();

    // Get date range (default: current month)
    const now = new Date();
    const start = req.query.start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = req.query.end || new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    const allEvents = [];

    for (const calendar of calendars) {
      try {
        const calendarObjects = await client.fetchCalendarObjects({
          calendar,
          timeRange: { start, end }
        });

        for (const obj of calendarObjects) {
          // Parse iCal data
          const icalData = obj.data;

          // Simple parsing for VEVENT
          const summaryMatch = icalData.match(/SUMMARY:(.+)/);
          const dtStartMatch = icalData.match(/DTSTART(?:;[^:]*)?:(\d{8}T?\d{0,6}Z?)/);
          const dtEndMatch = icalData.match(/DTEND(?:;[^:]*)?:(\d{8}T?\d{0,6}Z?)/);
          const uidMatch = icalData.match(/UID:(.+)/);
          const descMatch = icalData.match(/DESCRIPTION:(.+)/);

          if (summaryMatch && dtStartMatch) {
            const parseICalDate = (dateStr) => {
              if (!dateStr) return null;
              // Handle both YYYYMMDD and YYYYMMDDTHHMMSSZ formats
              if (dateStr.length === 8) {
                return new Date(
                  parseInt(dateStr.slice(0, 4)),
                  parseInt(dateStr.slice(4, 6)) - 1,
                  parseInt(dateStr.slice(6, 8))
                ).toISOString();
              }
              const year = dateStr.slice(0, 4);
              const month = dateStr.slice(4, 6);
              const day = dateStr.slice(6, 8);
              const hour = dateStr.slice(9, 11) || '00';
              const min = dateStr.slice(11, 13) || '00';
              const sec = dateStr.slice(13, 15) || '00';
              return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`).toISOString();
            };

            allEvents.push({
              id: uidMatch?.[1]?.trim() || obj.url,
              title: summaryMatch[1].trim(),
              start: parseICalDate(dtStartMatch[1]),
              end: dtEndMatch ? parseICalDate(dtEndMatch[1]) : parseICalDate(dtStartMatch[1]),
              description: descMatch?.[1]?.trim() || '',
              calendar: calendar.displayName,
              calendarUrl: calendar.url,
              color: calendar.calendarColor || 'blue',
              source: 'icloud',
              url: obj.url,
              etag: obj.etag
            });
          }
        }
      } catch (calErr) {
        console.error(`Error fetching from calendar ${calendar.displayName}:`, calErr.message);
      }
    }

    res.json({ events: allEvents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create iCloud calendar event
app.post('/api/icloud/events', async (req, res) => {
  try {
    const client = await getICloudClient();
    if (!client) {
      return res.status(401).json({ error: 'Not connected to iCloud' });
    }

    const { title, start, end, description, calendarUrl } = req.body;

    const calendars = await client.fetchCalendars();
    const calendar = calendarUrl
      ? calendars.find(c => c.url === calendarUrl)
      : calendars[0]; // Default to first calendar

    if (!calendar) {
      return res.status(400).json({ error: 'No calendar found' });
    }

    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@projectdashboard`;
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const startFormatted = new Date(start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const endFormatted = new Date(end).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ProjectDashboard//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${startFormatted}
DTEND:${endFormatted}
SUMMARY:${title}
${description ? `DESCRIPTION:${description}` : ''}
END:VEVENT
END:VCALENDAR`;

    await client.createCalendarObject({
      calendar,
      filename: `${uid}.ics`,
      iCalString: icalData
    });

    res.json({ success: true, id: uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete iCloud calendar event
app.delete('/api/icloud/events/:id', async (req, res) => {
  try {
    const client = await getICloudClient();
    if (!client) {
      return res.status(401).json({ error: 'Not connected to iCloud' });
    }

    const { url, etag } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Event URL required' });
    }

    await client.deleteCalendarObject({
      calendarObject: { url, etag }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// EMAIL API (Gmail)
// ============================================================================

app.get('/api/email/messages', async (req, res) => {
  try {
    const client = await getOAuth2Client();
    if (!client || !client.credentials?.access_token) {
      return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    const gmail = google.gmail({ version: 'v1', auth: client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      q: req.query.q || 'in:inbox'
    });

    const messages = await Promise.all(
      (response.data.messages || []).map(async (msg) => {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const headers = full.data.payload.headers;
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader('From'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: full.data.snippet,
          isUnread: full.data.labelIds?.includes('UNREAD')
        };
      })
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/email/messages/:id', async (req, res) => {
  try {
    const client = await getOAuth2Client();
    if (!client || !client.credentials?.access_token) {
      return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    const gmail = google.gmail({ version: 'v1', auth: client });

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: req.params.id,
      format: 'full'
    });

    const headers = response.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    // Get body
    let body = '';
    if (response.data.payload.body?.data) {
      body = Buffer.from(response.data.payload.body.data, 'base64').toString('utf-8');
    } else if (response.data.payload.parts) {
      const textPart = response.data.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    res.json({
      id: response.data.id,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body,
      isUnread: response.data.labelIds?.includes('UNREAD')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/email/send', async (req, res) => {
  try {
    const client = await getOAuth2Client();
    if (!client || !client.credentials?.access_token) {
      return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    const gmail = google.gmail({ version: 'v1', auth: client });
    const { to, subject, body } = req.body;

    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/email/messages/:id/read', async (req, res) => {
  try {
    const client = await getOAuth2Client();
    if (!client || !client.credentials?.access_token) {
      return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    const gmail = google.gmail({ version: 'v1', auth: client });

    await gmail.users.messages.modify({
      userId: 'me',
      id: req.params.id,
      requestBody: { removeLabelIds: ['UNREAD'] }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// FINANCES API
// ============================================================================

app.get('/api/finances', async (req, res) => {
  try {
    const finances = await loadJSON(FINANCES_FILE, {
      subscriptions: [],
      income: [],
      expenses: [],
      transactions: [],
      settings: { currency: 'USD' }
    });
    // Combine income and expenses into transactions for frontend compatibility
    const allTransactions = [
      ...(finances.transactions || []),
      ...(finances.income || []).map(t => ({ ...t, type: 'income' })),
      ...(finances.expenses || []).map(t => ({ ...t, type: 'expense' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      subscriptions: finances.subscriptions || [],
      transactions: allTransactions,
      summary: finances.summary || {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/finances/subscriptions', async (req, res) => {
  try {
    const finances = await loadJSON(FINANCES_FILE, { subscriptions: [], income: [], expenses: [] });
    const sub = {
      id: Date.now().toString(),
      name: req.body.name,
      amount: req.body.amount,
      cycle: req.body.cycle || 'monthly', // monthly, yearly
      category: req.body.category,
      nextBilling: req.body.nextBilling,
      createdAt: new Date().toISOString()
    };
    finances.subscriptions.push(sub);
    await saveJSON(FINANCES_FILE, finances);
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/finances/subscriptions/:id', async (req, res) => {
  try {
    const finances = await loadJSON(FINANCES_FILE, { subscriptions: [] });
    finances.subscriptions = finances.subscriptions.filter(s => s.id !== req.params.id);
    await saveJSON(FINANCES_FILE, finances);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/finances/transactions', async (req, res) => {
  try {
    const finances = await loadJSON(FINANCES_FILE, { subscriptions: [], transactions: [] });
    const transaction = {
      id: Date.now().toString(),
      type: req.body.type || 'expense',
      amount: parseFloat(req.body.amount) || 0,
      description: req.body.description,
      category: req.body.category,
      date: req.body.date || new Date().toISOString(),
      projectId: req.body.projectId,
      createdAt: new Date().toISOString()
    };

    if (!finances.transactions) finances.transactions = [];
    finances.transactions.unshift(transaction);

    await saveJSON(FINANCES_FILE, finances);
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// AUTOMATIONS API
// ============================================================================

app.get('/api/automations', async (req, res) => {
  try {
    const automations = await loadJSON(AUTOMATIONS_FILE, []);
    // Add display-friendly trigger/action strings for frontend compatibility
    const enriched = automations.map(a => ({
      ...a,
      trigger: typeof a.trigger === 'object' ? a.trigger.type : a.trigger,
      action: Array.isArray(a.actions) && a.actions[0] ? a.actions[0].type : (a.action || 'notification'),
      triggerConfig: typeof a.trigger === 'object' ? a.trigger.config : {},
      actionConfig: Array.isArray(a.actions) && a.actions[0] ? a.actions[0].config : {}
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/automations', async (req, res) => {
  try {
    const automations = await loadJSON(AUTOMATIONS_FILE, []);

    // Handle both frontend format (trigger/triggerConfig/action/actionConfig)
    // and structured format (trigger object / actions array)
    const trigger = typeof req.body.trigger === 'string'
      ? { type: req.body.trigger, config: req.body.triggerConfig || {} }
      : req.body.trigger;

    const actions = req.body.actions || [{
      type: req.body.action || 'notification',
      config: req.body.actionConfig || {}
    }];

    const automation = {
      id: Date.now().toString(),
      name: req.body.name,
      trigger,
      actions,
      enabled: req.body.enabled !== false,
      createdAt: new Date().toISOString(),
      lastRun: null
    };
    automations.push(automation);
    await saveJSON(AUTOMATIONS_FILE, automations);
    res.json(automation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/automations/:id', async (req, res) => {
  try {
    const automations = await loadJSON(AUTOMATIONS_FILE, []);
    const index = automations.findIndex(a => a.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Automation not found' });

    automations[index] = { ...automations[index], ...req.body };
    await saveJSON(AUTOMATIONS_FILE, automations);
    res.json(automations[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/automations/:id', async (req, res) => {
  try {
    let automations = await loadJSON(AUTOMATIONS_FILE, []);
    automations = automations.filter(a => a.id !== req.params.id);
    await saveJSON(AUTOMATIONS_FILE, automations);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run automation manually
app.post('/api/automations/:id/run', async (req, res) => {
  try {
    const automations = await loadJSON(AUTOMATIONS_FILE, []);
    const automation = automations.find(a => a.id === req.params.id);
    if (!automation) return res.status(404).json({ error: 'Automation not found' });

    // Execute actions
    const results = [];
    for (const action of automation.actions) {
      if (action.type === 'notification') {
        // Could integrate with system notifications
        results.push({ action: 'notification', status: 'sent', message: action.config.message });
      } else if (action.type === 'script') {
        try {
          const { stdout } = await execAsync(action.config.command, { timeout: 30000 });
          results.push({ action: 'script', status: 'success', output: stdout });
        } catch (err) {
          results.push({ action: 'script', status: 'error', error: err.message });
        }
      }
    }

    // Update last run time
    const index = automations.findIndex(a => a.id === req.params.id);
    automations[index].lastRun = new Date().toISOString();
    await saveJSON(AUTOMATIONS_FILE, automations);

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// AI CHAT API
// ============================================================================

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context, model } = req.body;

    const contextStr = context?.projects?.length
      ? `\nYou have access to these projects: ${context.projects.join(', ')}.`
      : '';

    const systemPrompt = `You are a helpful AI assistant for a developer. Be concise and helpful.${contextStr}`;

    // Try Claude API first
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }]
          })
        });
        const data = await response.json();
        if (data.content?.[0]?.text) {
          return res.json({ response: data.content[0].text, provider: 'claude' });
        }
      } catch (e) { console.error('Claude API error:', e); }
    }

    // Try Grok API as fallback
    if (process.env.XAI_API_KEY) {
      try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'grok-beta',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ]
          })
        });
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          return res.json({ response: data.choices[0].message.content, provider: 'grok' });
        }
      } catch (e) { console.error('Grok API error:', e); }
    }

    // Fallback response
    res.json({
      response: `I received your message: "${message}"\n\nNote: AI functionality requires API keys. Add ANTHROPIC_API_KEY or XAI_API_KEY to your environment variables.`,
      provider: 'none'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GLOBAL SEARCH API
// ============================================================================

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase() || '';
    if (!query) return res.json({ results: [] });

    const [projects, tasks, notes] = await Promise.all([
      scanProjects(),
      loadJSON(TASKS_FILE, []),
      loadJSON(NOTES_FILE, [])
    ]);

    const results = [];

    // Search projects
    projects.filter(p => p.name.toLowerCase().includes(query)).forEach(p => {
      results.push({ type: 'project', id: p.id, title: p.name, subtitle: p.type });
    });

    // Search tasks
    tasks.filter(t => t.title.toLowerCase().includes(query)).forEach(t => {
      results.push({ type: 'task', id: t.id, title: t.title, subtitle: t.completed ? 'Completed' : 'Pending' });
    });

    // Search notes
    notes.filter(n => n.title.toLowerCase().includes(query) || n.content?.toLowerCase().includes(query)).forEach(n => {
      results.push({ type: 'note', id: n.id, title: n.title, subtitle: 'Note' });
    });

    res.json({ results: results.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// SERVE STATIC FILES & SPA ROUTING (Production)
// ============================================================================

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3847;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║            COMMAND CENTER - Personal Assistant            ║
  ║                                                           ║
  ╠═══════════════════════════════════════════════════════════╣
  ║                                                           ║
  ║   API Server:  http://localhost:${PORT}                      ║
  ║                                                           ║
  ║   Core APIs:                                              ║
  ║   • /api/projects     - Project management                ║
  ║   • /api/tasks        - Task management                   ║
  ║   • /api/notes        - Notes                             ║
  ║   • /api/github/*     - GitHub integration                ║
  ║                                                           ║
  ║   Google APIs (requires OAuth):                           ║
  ║   • /api/calendar/*   - Google Calendar                   ║
  ║   • /api/email/*      - Gmail                             ║
  ║                                                           ║
  ║   Business APIs:                                          ║
  ║   • /api/finances     - Finance tracking                  ║
  ║   • /api/automations  - Workflow automation               ║
  ║                                                           ║
  ║   Utilities:                                              ║
  ║   • /api/ai/chat      - AI assistant                      ║
  ║   • /api/search       - Global search                     ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});
