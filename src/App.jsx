import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  // Navigation & UI
  LayoutDashboard, FolderKanban, Github, CheckSquare, FileText, Calendar,
  Mail, MessageSquare, DollarSign, Zap, Search, Settings, ChevronLeft,
  ChevronRight, X, Menu, Command, Bell, User,
  // Actions
  Play, Terminal, FolderOpen, Code, RefreshCw, Pin, PinOff, Check, Trash2,
  Download, Clock, AlertCircle, CheckCircle, Loader2, CornerDownLeft,
  Plus, Lock, Unlock, ExternalLink, Eye, Box, Send,
  // Git
  GitBranch, GitCommit, ArrowUp, ArrowDown, ArrowLeft, GitPullRequest, CircleDot,
  // Cloud
  Cloud,
  // New
  Sparkles, TrendingUp, Activity, Target, Star, Archive, Filter,
  MoreHorizontal, Edit3, Link, Tag, Flag, Calendar as CalendarIcon
} from 'lucide-react';

const API = '/api';

// ============================================================================
// UTILITIES
// ============================================================================

const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPalette, setCommandPalette] = useState(false);
  const [aiChat, setAiChat] = useState(false);

  // Data states
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // New feature states
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [finances, setFinances] = useState({ subscriptions: [], transactions: [], summary: {} });
  const [automations, setAutomations] = useState([]);

  // GitHub states
  const [ghUser, setGhUser] = useState(null);
  const [ghRepos, setGhRepos] = useState([]);
  const [ghIssues, setGhIssues] = useState([]);
  const [ghPRs, setGhPRs] = useState([]);
  const [ghNotifications, setGhNotifications] = useState([]);

  // Load all data
  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API}/projects`);
      setProjects(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tasks`);
      if (res.ok) setTasks(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/notes`);
      if (res.ok) setNotes(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const loadGitHub = useCallback(async () => {
    try {
      const [user, repos, issues, prs, notifications] = await Promise.all([
        fetch(`${API}/github/user`).then(r => r.json()).catch(() => null),
        fetch(`${API}/github/repos`).then(r => r.json()).catch(() => []),
        fetch(`${API}/github/issues`).then(r => r.json()).catch(() => []),
        fetch(`${API}/github/prs`).then(r => r.json()).catch(() => []),
        fetch(`${API}/github/notifications`).then(r => r.json()).catch(() => [])
      ]);
      setGhUser(user);
      setGhRepos(repos);
      setGhIssues(issues);
      setGhPRs(prs);
      setGhNotifications(notifications);
    } catch (e) { console.error(e); }
  }, []);

  const loadCalendar = useCallback(async () => {
    try {
      const res = await fetch(`${API}/calendar/events`);
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data.events || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const loadFinances = useCallback(async () => {
    try {
      const res = await fetch(`${API}/finances`);
      if (res.ok) setFinances(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const loadAutomations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/automations`);
      if (res.ok) setAutomations(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadProjects(), loadTasks(), loadNotes(), loadGitHub(),
      loadCalendar(), loadFinances(), loadAutomations()
    ]);
    setLoading(false);
  }, [loadProjects, loadTasks, loadNotes, loadGitHub, loadCalendar, loadFinances, loadAutomations]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setAiChat(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban, count: projects.length },
    { id: 'github', label: 'GitHub', icon: Github, count: ghNotifications.filter(n => n.unread).length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.filter(t => !t.completed).length },
    { id: 'notes', label: 'Notes', icon: FileText, count: notes.length },
    { id: 'calendar', label: 'Calendar', icon: Calendar, count: calendarEvents.length },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'messages', label: 'Messages', icon: MessageSquare, soon: true },
    { id: 'finances', label: 'Finances', icon: DollarSign },
    { id: 'automations', label: 'Automations', icon: Zap, count: automations.filter(a => a.enabled).length },
  ];

  // Stats for dashboard
  const stats = {
    totalProjects: projects.length,
    dirtyProjects: projects.filter(p => p.git && !p.git.isClean).length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.completed).length,
    pendingTasks: tasks.filter(t => !t.completed).length,
    totalNotes: notes.length,
    ghRepos: ghRepos.length,
    ghNotifications: ghNotifications.filter(n => n.unread).length,
  };

  return (
    <div className="h-screen flex bg-zinc-950 text-white">
      {/* Command Palette */}
      {commandPalette && (
        <CommandPalette
          projects={projects}
          tasks={tasks}
          notes={notes}
          onClose={() => setCommandPalette(false)}
          onNavigate={setActiveSection}
          onRefresh={loadAll}
        />
      )}

      {/* AI Chat Sidebar */}
      {aiChat && (
        <AIChatSidebar onClose={() => setAiChat(false)} projects={projects} />
      )}

      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex flex-col border-r border-zinc-800 bg-zinc-900/50 transition-all duration-200`}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Command className="w-4 h-4" />
              </div>
              <span className="font-semibold">Command</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => !item.soon && setActiveSection(item.id)}
                disabled={item.soon}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : item.soon
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.count > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                        isActive ? 'bg-indigo-500' : 'bg-zinc-800'
                      }`}>
                        {item.count}
                      </span>
                    )}
                    {item.soon && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-zinc-800 text-zinc-500">Soon</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t border-zinc-800 space-y-1">
          <button
            onClick={() => setAiChat(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-zinc-400 hover:text-white hover:bg-zinc-800 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title="AI Assistant (⌘J)"
          >
            <Sparkles className="w-5 h-5" />
            {!sidebarCollapsed && <span>AI Assistant</span>}
          </button>
          <button
            onClick={() => setCommandPalette(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-zinc-400 hover:text-white hover:bg-zinc-800 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Command Palette (⌘K)"
          >
            <Search className="w-5 h-5" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1">Search</span>
                <kbd className="px-1.5 py-0.5 text-xs rounded bg-zinc-800 border border-zinc-700">⌘K</kbd>
              </>
            )}
          </button>
        </div>

        {/* User */}
        {ghUser && (
          <div className="p-3 border-t border-zinc-800">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <img src={ghUser.avatar_url} alt="" className="w-8 h-8 rounded-full" />
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ghUser.name || ghUser.login}</p>
                  <p className="text-xs text-zinc-500 truncate">@{ghUser.login}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-zinc-800">
          <h1 className="text-lg font-semibold capitalize">{activeSection}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              title="Refresh all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {ghNotifications.filter(n => n.unread).length > 0 && (
              <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-xs flex items-center justify-center">
                  {ghNotifications.filter(n => n.unread).length}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              stats={stats}
              projects={projects}
              tasks={tasks}
              notes={notes}
              ghRepos={ghRepos}
              ghNotifications={ghNotifications}
              onNavigate={setActiveSection}
              onRefresh={loadAll}
            />
          )}
          {activeSection === 'projects' && (
            <ProjectsView
              projects={projects}
              onRefresh={loadProjects}
            />
          )}
          {activeSection === 'github' && (
            <GitHubView
              user={ghUser}
              repos={ghRepos}
              issues={ghIssues}
              prs={ghPRs}
              notifications={ghNotifications}
              onRefresh={loadGitHub}
            />
          )}
          {activeSection === 'tasks' && (
            <TasksView
              tasks={tasks}
              projects={projects}
              onRefresh={loadTasks}
            />
          )}
          {activeSection === 'notes' && (
            <NotesView
              notes={notes}
              projects={projects}
              onRefresh={loadNotes}
            />
          )}
          {activeSection === 'calendar' && (
            <CalendarView
              events={calendarEvents}
              onRefresh={loadCalendar}
            />
          )}
          {activeSection === 'email' && (
            <EmailView />
          )}
          {activeSection === 'finances' && (
            <FinancesView
              finances={finances}
              onRefresh={loadFinances}
            />
          )}
          {activeSection === 'automations' && (
            <AutomationsView
              automations={automations}
              onRefresh={loadAutomations}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

function DashboardView({ stats, projects, tasks, notes, ghRepos, ghNotifications, onNavigate, onRefresh }) {
  const dirtyProjects = projects.filter(p => p.git && !p.git.isClean);
  const recentProjects = projects.slice(0, 5);
  const pendingTasks = tasks.filter(t => !t.completed).slice(0, 5);
  const recentNotes = notes.slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="text-zinc-400">Here's what's happening across your projects</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('tasks')}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Projects"
          value={stats.totalProjects}
          icon={FolderKanban}
          color="indigo"
          onClick={() => onNavigate('projects')}
        />
        <StatCard
          label="Uncommitted"
          value={stats.dirtyProjects}
          icon={AlertCircle}
          color={stats.dirtyProjects > 0 ? 'amber' : 'emerald'}
          onClick={() => onNavigate('projects')}
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pendingTasks}
          icon={CheckSquare}
          color="purple"
          onClick={() => onNavigate('tasks')}
        />
        <StatCard
          label="Notifications"
          value={stats.ghNotifications}
          icon={Bell}
          color={stats.ghNotifications > 0 ? 'red' : 'zinc'}
          onClick={() => onNavigate('github')}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Uncommitted Changes */}
        <div className="col-span-2 bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Needs Attention
            </h3>
            <button onClick={() => onNavigate('projects')} className="text-sm text-zinc-400 hover:text-white">
              View all →
            </button>
          </div>
          {dirtyProjects.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p>All projects are clean!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dirtyProjects.slice(0, 4).map((project) => (
                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-medium">{project.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">{project.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-400">{project.git?.changes?.length || 0} changes</span>
                    <QuickActions project={project} onRefresh={onRefresh} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Tasks */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              Tasks
            </h3>
            <button onClick={() => onNavigate('tasks')} className="text-sm text-zinc-400 hover:text-white">
              View all →
            </button>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p>No pending tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} compact />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Recent Projects
            </h3>
          </div>
          <div className="space-y-2">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-xs text-zinc-500">{project.type}</span>
                </div>
                <span className="text-xs text-zinc-500">{timeAgo(project.modified)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* GitHub Activity */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Github className="w-4 h-4" />
              GitHub
            </h3>
            <button onClick={() => onNavigate('github')} className="text-sm text-zinc-400 hover:text-white">
              View all →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-zinc-800">
              <p className="text-2xl font-bold">{ghRepos.length}</p>
              <p className="text-xs text-zinc-500">Repos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-zinc-800">
              <p className="text-2xl font-bold">{ghNotifications.filter(n => n.unread).length}</p>
              <p className="text-xs text-zinc-500">Notifications</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-zinc-800">
              <p className="text-2xl font-bold">{ghRepos.filter(r => !r.isPrivate).length}</p>
              <p className="text-xs text-zinc-500">Public</p>
            </div>
          </div>
          {ghNotifications.filter(n => n.unread).slice(0, 3).map((n) => (
            <div key={n.id} className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-2">
              <p className="text-sm truncate">{n.title}</p>
              <p className="text-xs text-zinc-500">{n.repo}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, onClick }) {
  const colors = {
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    zinc: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border ${colors[color]} hover:scale-105 transition-transform text-left`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm opacity-80">{label}</p>
    </button>
  );
}

function QuickActions({ project, onRefresh }) {
  const action = async (endpoint, body = {}) => {
    await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: project.id, ...body })
    });
    onRefresh();
  };

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => action('/open/vscode')} className="p-1.5 rounded hover:bg-zinc-700" title="VS Code">
        <Code className="w-4 h-4" />
      </button>
      <button onClick={() => action('/open/terminal')} className="p-1.5 rounded hover:bg-zinc-700" title="Terminal">
        <Terminal className="w-4 h-4" />
      </button>
    </div>
  );
}

function TaskItem({ task, compact }) {
  const priorityColors = {
    high: 'text-red-400',
    medium: 'text-amber-400',
    low: 'text-blue-400',
  };

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 ${task.completed ? 'opacity-50' : ''}`}>
      <button className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
        task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-zinc-500'
      }`}>
        {task.completed && <Check className="w-3 h-3" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
        {!compact && task.project && (
          <p className="text-xs text-zinc-500">{task.project}</p>
        )}
      </div>
      {task.priority && (
        <Flag className={`w-3 h-3 ${priorityColors[task.priority]}`} />
      )}
    </div>
  );
}

// ============================================================================
// PROJECTS VIEW
// ============================================================================

function ProjectsView({ projects, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'dirty' && p.git?.isClean !== false) return false;
    if (filter === 'clean' && p.git?.isClean === false) return false;
    return true;
  });

  const stats = {
    total: projects.length,
    dirty: projects.filter(p => p.git && !p.git.isClean).length,
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm ${filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('dirty')}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${filter === 'dirty' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-amber-400'}`}
            >
              <AlertCircle className="w-3 h-3" /> Uncommitted ({stats.dirty})
            </button>
            <button
              onClick={() => setFilter('clean')}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${filter === 'clean' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'}`}
            >
              <CheckCircle className="w-3 h-3" /> Clean ({stats.total - stats.dirty})
            </button>
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-1">
            {filtered.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                isSelected={selected?.id === project.id}
                onSelect={() => setSelected(selected?.id === project.id ? null : project)}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <ProjectPanel project={selected} onClose={() => setSelected(null)} onRefresh={onRefresh} />
      )}
    </div>
  );
}

function ProjectRow({ project, isSelected, onSelect, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(null);

  const action = async (endpoint, body = {}) => {
    setActionLoading(endpoint);
    try {
      await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: project.id, ...body })
      });
      onRefresh();
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const hasChanges = project.git && !project.git.isClean;
  const changeCount = project.git?.changes?.length || 0;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-900'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{project.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            project.type === 'react' ? 'bg-cyan-500/20 text-cyan-400' :
            project.type === 'vite' ? 'bg-purple-500/20 text-purple-400' :
            project.type === 'python' ? 'bg-yellow-500/20 text-yellow-400' :
            project.type === 'extension' ? 'bg-orange-500/20 text-orange-400' :
            'bg-zinc-700 text-zinc-400'
          }`}>{project.type}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(project.modified)}</span>
          {project.git && <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{project.git.branch}</span>}
        </div>
      </div>

      {project.git && (
        <div className="flex items-center gap-2">
          {hasChanges ? (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">
              <AlertCircle className="w-3 h-3" />{changeCount} changes
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle className="w-3 h-3" /></span>
          )}
          {project.git.ahead > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); action('/git/push'); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
            >
              <ArrowUp className="w-3 h-3" />{project.git.ahead}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); action('/open/vscode'); }} className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-700" title="VS Code">
          <Code className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); action('/open/terminal'); }} className="px-2 py-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 text-xs font-medium border border-zinc-700 hover:border-emerald-500/50" title="Terminal">
          <Terminal className="w-3.5 h-3.5" />CMD
        </button>
        {project.scripts?.includes('dev') && (
          <button onClick={(e) => { e.stopPropagation(); action('/run/script', { script: 'dev' }); }} className="p-1.5 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/20" title="Run dev">
            <Play className="w-4 h-4" />
          </button>
        )}
      </div>

      <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
    </div>
  );
}

function ProjectPanel({ project, onClose, onRefresh }) {
  const [commitMsg, setCommitMsg] = useState('');
  const [diff, setDiff] = useState(null);
  const [diffFile, setDiffFile] = useState(null);
  const [loading, setLoading] = useState({});
  const [activeTab, setActiveTab] = useState('changes');

  const hasChanges = project.git && !project.git.isClean;
  const changes = project.git?.changes || [];

  const loadDiff = async (file = null) => {
    setDiffFile(file);
    try {
      const params = new URLSearchParams({ project: project.id });
      if (file) params.append('file', file);
      const res = await fetch(`${API}/git/diff?${params}`);
      const data = await res.json();
      setDiff(data.diff);
    } catch (e) { setDiff('Error loading diff'); }
  };

  useEffect(() => { if (hasChanges && activeTab === 'changes') loadDiff(); }, [project.id, hasChanges, activeTab]);

  const action = async (endpoint, body = {}) => {
    setLoading(prev => ({ ...prev, [endpoint]: true }));
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: project.id, ...body })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onRefresh();
      if (endpoint === '/git/commit') { setCommitMsg(''); loadDiff(); }
    } catch (e) { alert(e.message); }
    setLoading(prev => ({ ...prev, [endpoint]: false }));
  };

  const formatDiff = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      let className = 'text-zinc-400';
      if (line.startsWith('+') && !line.startsWith('+++')) className = 'text-emerald-400 bg-emerald-500/10';
      else if (line.startsWith('-') && !line.startsWith('---')) className = 'text-red-400 bg-red-500/10';
      else if (line.startsWith('@@')) className = 'text-blue-400';
      else if (line.startsWith('diff') || line.startsWith('index')) className = 'text-zinc-600';
      return <div key={i} className={className}>{line || ' '}</div>;
    });
  };

  return (
    <div className="w-[500px] border-l border-zinc-800 flex flex-col bg-zinc-900/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h2 className="font-semibold">{project.name}</h2>
          <p className="text-xs text-zinc-500 font-mono">{project.path.replace('C:\\Users\\liam1\\', '~\\')}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <button onClick={() => action('/open/vscode')} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm flex items-center gap-1.5">
          <Code className="w-4 h-4" /> Code
        </button>
        <button onClick={() => action('/open/terminal')} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm flex items-center gap-1.5">
          <Terminal className="w-4 h-4" /> Terminal
        </button>
        <button onClick={() => action('/open/explorer')} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4" /> Folder
        </button>
      </div>

      {project.scripts?.length > 0 && (
        <div className="px-4 py-2 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Scripts</p>
          <div className="flex flex-wrap gap-1">
            {project.scripts.map(script => (
              <button key={script} onClick={() => action('/run/script', { script })} className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1">
                <Play className="w-3 h-3" />{script}
              </button>
            ))}
          </div>
        </div>
      )}

      {project.git && (
        <div className="flex border-b border-zinc-800">
          <button onClick={() => setActiveTab('changes')} className={`px-4 py-2 text-sm ${activeTab === 'changes' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-500'}`}>
            Changes {hasChanges && `(${changes.length})`}
          </button>
          <button onClick={() => setActiveTab('commits')} className={`px-4 py-2 text-sm ${activeTab === 'commits' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-500'}`}>
            Commits
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {activeTab === 'changes' && project.git && (
          <div className="flex flex-col h-full">
            {hasChanges ? (
              <>
                <div className="border-b border-zinc-800">
                  <p className="px-4 py-2 text-xs text-zinc-500">Changed Files</p>
                  <div className="max-h-32 overflow-auto">
                    {changes.map((change, i) => (
                      <div key={i} onClick={() => loadDiff(change.file)} className={`flex items-center gap-2 px-4 py-1.5 text-sm cursor-pointer hover:bg-zinc-800 ${diffFile === change.file ? 'bg-zinc-800' : ''}`}>
                        <span className={`w-4 text-xs ${change.status === 'M' ? 'text-amber-400' : change.status === 'A' || change.status === '?' ? 'text-emerald-400' : change.status === 'D' ? 'text-red-400' : 'text-zinc-400'}`}>{change.status}</span>
                        <span className="flex-1 truncate font-mono text-xs">{change.file}</span>
                        <button onClick={(e) => { e.stopPropagation(); action('/git/discard', { file: change.file }); }} className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/20"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-5 bg-zinc-950">{diff ? formatDiff(diff) : <div className="text-zinc-600">Select a file to view diff</div>}</div>
                <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                  <input type="text" placeholder="Commit message..." value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commitMsg && action('/git/commit', { message: commitMsg })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 mb-2" />
                  <div className="flex gap-2">
                    <button onClick={() => action('/git/stage', { files: ['.'] })} disabled={loading['/git/stage']} className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">Stage All</button>
                    <button onClick={() => action('/git/commit', { message: commitMsg })} disabled={!commitMsg || loading['/git/commit']} className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm flex items-center justify-center gap-1 disabled:opacity-50">
                      {loading['/git/commit'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Commit
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <CheckCircle className="w-12 h-12 mb-2 text-emerald-500" />
                <p>Working tree clean</p>
                {project.git.ahead > 0 && (
                  <button onClick={() => action('/git/push')} className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1">
                    <ArrowUp className="w-4 h-4" /> Push {project.git.ahead} commit{project.git.ahead > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'commits' && project.git && (
          <div className="p-4 space-y-2">
            {project.git.commits?.map((commit, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-zinc-800">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <GitCommit className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{commit.message}</p>
                  <p className="text-xs text-zinc-500">{commit.hash} · {commit.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {!project.git && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <GitBranch className="w-12 h-12 mb-2" />
            <p>Not a git repository</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// GITHUB VIEW
// ============================================================================

function GitHubView({ user, repos, issues, prs, notifications, onRefresh }) {
  const [activeTab, setActiveTab] = useState('repos');
  const [repoSearch, setRepoSearch] = useState('');
  const [showCreateRepo, setShowCreateRepo] = useState(false);

  const filteredRepos = repos.filter(r => r.name.toLowerCase().includes(repoSearch.toLowerCase()));

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
        <Github className="w-16 h-16 mb-4" />
        <p className="text-lg mb-2">Not connected to GitHub</p>
        <p className="text-sm">Run `gh auth login` in terminal to connect</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {showCreateRepo && <CreateRepoModal onClose={() => setShowCreateRepo(false)} onRefresh={onRefresh} />}

      {/* Sidebar */}
      <div className="w-56 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
            <div>
              <p className="font-medium">{user.name || user.login}</p>
              <p className="text-xs text-zinc-500">@{user.login}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2">
          {[
            { id: 'repos', label: 'Repositories', icon: FolderOpen, count: repos.length },
            { id: 'issues', label: 'Issues', icon: CircleDot, count: issues.length },
            { id: 'prs', label: 'Pull Requests', icon: GitPullRequest, count: prs.length },
            { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.filter(n => n.unread).length },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left ${
                activeTab === item.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.count > 0 && (
                <span className={`ml-auto text-xs ${item.id === 'notifications' && item.count > 0 ? 'px-1.5 py-0.5 rounded-full bg-blue-500' : 'text-zinc-500'}`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button onClick={() => setShowCreateRepo(true)} className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> New Repo
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'repos' && (
          <>
            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>
            <div className="space-y-2">
              {filteredRepos.map((repo) => (
                <div key={repo.name} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{repo.name}</span>
                      {repo.isPrivate ? <Lock className="w-3 h-3 text-zinc-500" /> : <Unlock className="w-3 h-3 text-zinc-500" />}
                      {repo.primaryLanguage && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-zinc-800 text-zinc-400">{repo.primaryLanguage.name}</span>
                      )}
                    </div>
                    {repo.description && <p className="text-sm text-zinc-500 truncate mt-1">{repo.description}</p>}
                    <p className="text-xs text-zinc-600 mt-1">Updated {timeAgo(repo.pushedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => window.open(`https://github.com/${user.login}/${repo.name}`, '_blank')} className="p-2 rounded text-zinc-500 hover:text-white hover:bg-zinc-800" title="Open in browser">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/20" title="Clone">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-2">
            {issues.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">No open issues</div>
            ) : issues.map((issue) => (
              <a key={issue.id} href={issue.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700">
                <div className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-xs text-zinc-500">{issue.repo} · {timeAgo(issue.updatedAt)}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {activeTab === 'prs' && (
          <div className="space-y-2">
            {prs.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">No open pull requests</div>
            ) : prs.map((pr) => (
              <a key={pr.id} href={pr.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700">
                <div className="flex items-start gap-2">
                  <GitPullRequest className="w-4 h-4 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{pr.title}</p>
                    <p className="text-xs text-zinc-500">{pr.repo} · {timeAgo(pr.updatedAt)}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">No notifications</div>
            ) : notifications.map((n) => (
              <div key={n.id} className={`p-3 rounded-lg border ${n.unread ? 'bg-zinc-900 border-blue-500/30' : 'bg-zinc-900/50 border-zinc-800'}`}>
                <div className="flex items-start gap-2">
                  <Bell className={`w-4 h-4 mt-0.5 ${n.unread ? 'text-blue-400' : 'text-zinc-500'}`} />
                  <div>
                    <p className={n.unread ? 'font-medium' : 'text-zinc-400'}>{n.title}</p>
                    <p className="text-xs text-zinc-500">{n.repo} · {n.reason} · {timeAgo(n.updatedAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateRepoModal({ onClose, onRefresh }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name) return;
    setLoading(true);
    try {
      await fetch(`${API}/github/repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, isPrivate })
      });
      onRefresh();
      onClose();
    } catch (e) { alert('Failed to create repository'); }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Repository</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Repository Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-awesome-project" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short description" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsPrivate(false)} className={`flex-1 px-4 py-2 rounded-lg border ${!isPrivate ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-zinc-700 text-zinc-400'}`}>
              <Unlock className="w-4 h-4 inline mr-2" /> Public
            </button>
            <button onClick={() => setIsPrivate(true)} className={`flex-1 px-4 py-2 rounded-lg border ${isPrivate ? 'border-amber-500 bg-amber-500/20 text-amber-400' : 'border-zinc-700 text-zinc-400'}`}>
              <Lock className="w-4 h-4 inline mr-2" /> Private
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</button>
          <button onClick={create} disabled={!name || loading} className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// TASKS VIEW
// ============================================================================

function TasksView({ tasks, projects, onRefresh }) {
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState('pending');
  const [selectedProject, setSelectedProject] = useState('all');

  const filtered = tasks.filter(t => {
    if (filter === 'pending' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;
    if (selectedProject !== 'all' && t.projectId !== selectedProject) return false;
    return true;
  });

  const addTask = async () => {
    if (!newTask.trim()) return;
    await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask, projectId: selectedProject !== 'all' ? selectedProject : null })
    });
    setNewTask('');
    onRefresh();
  };

  const toggleTask = async (id, completed) => {
    await fetch(`${API}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    });
    onRefresh();
  };

  const deleteTask = async (id) => {
    await fetch(`${API}/tasks/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Tasks</h2>

        {/* Add task */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={addTask} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button onClick={() => setFilter('pending')} className={`px-3 py-1.5 rounded-lg text-sm ${filter === 'pending' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>
            Pending ({tasks.filter(t => !t.completed).length})
          </button>
          <button onClick={() => setFilter('completed')} className={`px-3 py-1.5 rounded-lg text-sm ${filter === 'completed' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>
            Completed ({tasks.filter(t => t.completed).length})
          </button>
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm ${filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>
            All ({tasks.length})
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-2" />
            <p>{filter === 'pending' ? 'No pending tasks' : filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}</p>
          </div>
        ) : filtered.map((task) => (
          <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 ${task.completed ? 'opacity-60' : ''}`}>
            <button
              onClick={() => toggleTask(task.id, task.completed)}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-indigo-500'
              }`}
            >
              {task.completed && <Check className="w-4 h-4" />}
            </button>
            <div className="flex-1">
              <p className={task.completed ? 'line-through text-zinc-500' : ''}>{task.title}</p>
              {task.projectId && (
                <p className="text-xs text-zinc-500">{projects.find(p => p.id === task.projectId)?.name}</p>
              )}
            </div>
            <button onClick={() => deleteTask(task.id)} className="p-2 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/20">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// NOTES VIEW
// ============================================================================

function NotesView({ notes, projects, onRefresh }) {
  const [selectedNote, setSelectedNote] = useState(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');

  const createNote = async () => {
    if (!newNoteTitle.trim()) return;
    await fetch(`${API}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newNoteTitle, content: '' })
    });
    setNewNoteTitle('');
    onRefresh();
  };

  const updateNote = async (id, content) => {
    await fetch(`${API}/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    onRefresh();
  };

  const deleteNote = async (id) => {
    await fetch(`${API}/notes/${id}`, { method: 'DELETE' });
    setSelectedNote(null);
    onRefresh();
  };

  return (
    <div className="flex h-full">
      {/* Notes list */}
      <div className="w-72 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createNote()}
              placeholder="New note title..."
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 text-sm"
            />
            <button onClick={createNote} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No notes yet</div>
          ) : notes.map((note) => (
            <button
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className={`w-full text-left p-3 rounded-lg mb-1 ${selectedNote?.id === note.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
            >
              <p className="font-medium truncate">{note.title}</p>
              <p className="text-xs text-zinc-500">{timeAgo(note.updatedAt)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Note editor */}
      {selectedNote ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="font-semibold">{selectedNote.title}</h2>
            <button onClick={() => deleteNote(selectedNote.id)} className="p-2 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/20">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={selectedNote.content || ''}
            onChange={(e) => {
              setSelectedNote({ ...selectedNote, content: e.target.value });
              updateNote(selectedNote.id, e.target.value);
            }}
            placeholder="Start writing..."
            className="flex-1 p-4 bg-transparent resize-none focus:outline-none text-zinc-300 placeholder:text-zinc-600"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-2" />
            <p>Select a note or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMMAND PALETTE
// ============================================================================

function CommandPalette({ projects, tasks, notes, onClose, onNavigate, onRefresh }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const commands = [];

  // Navigation commands
  const navItems = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Go to Projects', icon: FolderKanban },
    { id: 'github', label: 'Go to GitHub', icon: Github },
    { id: 'tasks', label: 'Go to Tasks', icon: CheckSquare },
    { id: 'notes', label: 'Go to Notes', icon: FileText },
  ];

  navItems.forEach(item => {
    if (!query || item.label.toLowerCase().includes(query.toLowerCase())) {
      commands.push({
        id: `nav-${item.id}`,
        label: item.label,
        icon: item.icon,
        action: () => { onNavigate(item.id); onClose(); }
      });
    }
  });

  // Project commands
  const q = query.toLowerCase();
  if (q.includes('code') || q.includes('open')) {
    projects.slice(0, 5).forEach(p => {
      commands.push({
        id: `code-${p.id}`,
        label: `Open ${p.name} in VS Code`,
        icon: Code,
        action: async () => {
          await fetch(`${API}/open/vscode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project: p.id })
          });
          onClose();
        }
      });
    });
  }

  if (q.includes('terminal') || q.includes('cmd')) {
    projects.slice(0, 5).forEach(p => {
      commands.push({
        id: `terminal-${p.id}`,
        label: `Open ${p.name} in Terminal`,
        icon: Terminal,
        action: async () => {
          await fetch(`${API}/open/terminal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project: p.id })
          });
          onClose();
        }
      });
    });
  }

  // Actions
  if (!query || 'refresh'.includes(q)) {
    commands.push({
      id: 'refresh',
      label: 'Refresh All Data',
      icon: RefreshCw,
      action: () => { onRefresh(); onClose(); }
    });
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, commands.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' && commands[selectedIndex]) { e.preventDefault(); commands[selectedIndex].action(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commands, selectedIndex]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type a command..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-500"
          />
          <kbd className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-500">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {commands.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500">No results</div>
          ) : commands.slice(0, 10).map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={cmd.action}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left ${
                  i === selectedIndex ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{cmd.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// AI CHAT SIDEBAR
// ============================================================================

function AIChatSidebar({ onClose, projects }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hey! I\'m your AI assistant. Ask me anything about your projects, tasks, or I can help you write code.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context: { projects: projects.map(p => p.name) } })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'Sorry, I couldn\'t process that.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI. Make sure the server is running.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col z-40 shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold">AI Assistant</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              msg.role === 'user' ? 'bg-indigo-600' : 'bg-zinc-800'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 p-3 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask anything..."
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          <button onClick={sendMessage} disabled={loading} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2 text-center">Press ⌘J to toggle</p>
      </div>
    </div>
  );
}

// ============================================================================
// CALENDAR VIEW
// ============================================================================

function CalendarView({ events, onRefresh }) {
  const [viewMode, setViewMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '', description: '', color: 'indigo', saveToICloud: false });
  const [loading, setLoading] = useState(false);

  // iCloud state
  const [icloudStatus, setIcloudStatus] = useState({ connected: false, hasCredentials: false });
  const [icloudEvents, setIcloudEvents] = useState([]);
  const [icloudCreds, setIcloudCreds] = useState({ email: '', appPassword: '' });
  const [connectingICloud, setConnectingICloud] = useState(false);
  const [icloudError, setIcloudError] = useState('');

  const colors = ['indigo', 'emerald', 'amber', 'red', 'purple', 'cyan'];

  // Check iCloud status on load
  useEffect(() => {
    fetch(`${API}/icloud/status`).then(r => r.json()).then(setIcloudStatus).catch(() => {});
  }, []);

  // Fetch iCloud events when connected
  useEffect(() => {
    if (icloudStatus.connected) {
      fetch(`${API}/icloud/events`).then(r => r.json()).then(data => {
        setIcloudEvents(data.events || []);
      }).catch(() => {});
    }
  }, [icloudStatus.connected, selectedDate]);

  // Combine local and iCloud events
  const allEvents = [...events, ...icloudEvents.map(e => ({ ...e, source: 'icloud' }))];

  const connectICloud = async () => {
    if (!icloudCreds.email || !icloudCreds.appPassword) return;
    setConnectingICloud(true);
    setIcloudError('');
    try {
      const res = await fetch(`${API}/icloud/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(icloudCreds)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIcloudStatus({ connected: true, hasCredentials: true, email: icloudCreds.email });
      setShowSettings(false);
      // Fetch events
      const eventsRes = await fetch(`${API}/icloud/events`);
      const eventsData = await eventsRes.json();
      setIcloudEvents(eventsData.events || []);
    } catch (e) {
      setIcloudError(e.message);
    }
    setConnectingICloud(false);
  };

  const disconnectICloud = async () => {
    await fetch(`${API}/icloud/disconnect`, { method: 'POST' });
    setIcloudStatus({ connected: false, hasCredentials: false });
    setIcloudEvents([]);
  };

  const createEvent = async () => {
    if (!newEvent.title || !newEvent.start) return;
    setLoading(true);
    try {
      if (newEvent.saveToICloud && icloudStatus.connected) {
        await fetch(`${API}/icloud/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent)
        });
        // Refresh iCloud events
        const eventsRes = await fetch(`${API}/icloud/events`);
        const eventsData = await eventsRes.json();
        setIcloudEvents(eventsData.events || []);
      } else {
        await fetch(`${API}/calendar/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent)
        });
        onRefresh();
      }
      setShowNewEvent(false);
      setNewEvent({ title: '', start: '', end: '', description: '', color: 'indigo', saveToICloud: false });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const deleteEvent = async (event) => {
    try {
      if (event.source === 'icloud') {
        await fetch(`${API}/icloud/events/${event.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: event.url, etag: event.etag })
        });
        setIcloudEvents(icloudEvents.filter(e => e.id !== event.id));
      } else {
        await fetch(`${API}/calendar/events/${event.id}`, { method: 'DELETE' });
        onRefresh();
      }
    } catch (e) { console.error(e); }
  };

  // Get current week days
  const getWeekDays = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (date) => {
    return allEvents.filter(e => {
      const eventDate = new Date(e.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const formatHour = (h) => h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;

  const colorClasses = {
    indigo: 'bg-indigo-600 hover:bg-indigo-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
    amber: 'bg-amber-600 hover:bg-amber-500',
    red: 'bg-red-600 hover:bg-red-500',
    purple: 'bg-purple-600 hover:bg-purple-500',
    cyan: 'bg-cyan-600 hover:bg-cyan-500',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Calendar</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })} className="p-2 rounded hover:bg-zinc-800">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm">{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })} className="p-2 rounded hover:bg-zinc-800">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setSelectedDate(new Date())} className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700">Today</button>
        </div>
        <div className="flex items-center gap-2">
          {/* iCloud Status */}
          <button onClick={() => setShowSettings(true)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${icloudStatus.connected ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <Cloud className="w-4 h-4" />
            {icloudStatus.connected ? 'iCloud Connected' : 'Connect iCloud'}
          </button>
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            <button onClick={() => setViewMode('day')} className={`px-3 py-1 rounded text-sm ${viewMode === 'day' ? 'bg-zinc-700' : ''}`}>Day</button>
            <button onClick={() => setViewMode('week')} className={`px-3 py-1 rounded text-sm ${viewMode === 'week' ? 'bg-zinc-700' : ''}`}>Week</button>
            <button onClick={() => setViewMode('month')} className={`px-3 py-1 rounded text-sm ${viewMode === 'month' ? 'bg-zinc-700' : ''}`}>Month</button>
          </div>
          <button onClick={() => setShowNewEvent(true)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>
      </div>

      {/* Week View */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 border-r border-zinc-800">
            <div className="h-12 border-b border-zinc-800" />
            {hours.map(h => (
              <div key={h} className="h-14 flex items-start justify-end pr-2 text-xs text-zinc-500 border-b border-zinc-800/50">
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="flex-1 flex">
            {weekDays.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(day);
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={dayIndex} className="flex-1 border-r border-zinc-800 last:border-r-0">
                  {/* Day header */}
                  <div className={`h-12 flex flex-col items-center justify-center border-b border-zinc-800 ${isToday ? 'bg-indigo-500/10' : ''}`}>
                    <span className="text-xs text-zinc-500">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className={`text-sm font-medium ${isToday ? 'w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center' : ''}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  {/* Hours grid */}
                  <div className="relative">
                    {hours.map(h => (
                      <div key={h} className="h-14 border-b border-zinc-800/50" />
                    ))}
                    {/* Events */}
                    {dayEvents.map((event, i) => {
                      const start = new Date(event.start);
                      const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60 * 1000);
                      const top = start.getHours() * 56 + (start.getMinutes() / 60) * 56;
                      const height = Math.max(((end - start) / (1000 * 60 * 60)) * 56, 28);
                      return (
                        <div
                          key={event.id || i}
                          className={`absolute left-1 right-1 rounded px-1.5 py-0.5 text-xs cursor-pointer overflow-hidden group ${event.source === 'icloud' ? 'bg-blue-600 hover:bg-blue-500' : colorClasses[event.color] || colorClasses.indigo}`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          onClick={() => deleteEvent(event)}
                        >
                          <p className="font-medium truncate flex items-center gap-1">
                            {event.source === 'icloud' && <Cloud className="w-3 h-3" />}
                            {event.title || event.summary}
                          </p>
                          {height > 30 && <p className="opacity-70 truncate">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                          <button className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {showNewEvent && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowNewEvent(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-semibold mb-4">New Event</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Title</label>
                <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event title" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Start</label>
                  <input type="datetime-local" value={newEvent.start} onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-zinc-600" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">End</label>
                  <input type="datetime-local" value={newEvent.end} onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-zinc-600" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Description</label>
                <textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Optional description" rows={3} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Color</label>
                <div className="flex gap-2">
                  {colors.map(c => (
                    <button key={c} onClick={() => setNewEvent({ ...newEvent, color: c })} className={`w-8 h-8 rounded-full ${colorClasses[c].split(' ')[0]} ${newEvent.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`} />
                  ))}
                </div>
              </div>
              {icloudStatus.connected && (
                <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 cursor-pointer hover:bg-zinc-700">
                  <input type="checkbox" checked={newEvent.saveToICloud} onChange={(e) => setNewEvent({ ...newEvent, saveToICloud: e.target.checked })} className="w-4 h-4 rounded bg-zinc-700 border-zinc-600" />
                  <Cloud className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Save to iCloud Calendar</span>
                </label>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowNewEvent(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</button>
              <button onClick={createEvent} disabled={!newEvent.title || !newEvent.start || loading} className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </div>
          </div>
        </>
      )}

      {/* iCloud Settings Modal */}
      {showSettings && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowSettings(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-400" /> iCloud Calendar
            </h2>
            <p className="text-sm text-zinc-400 mb-4">Connect your Apple Calendar using iCloud</p>

            {icloudStatus.connected ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Connected to iCloud</span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">{icloudStatus.email}</p>
                </div>
                <p className="text-sm text-zinc-500">
                  {icloudEvents.length} events synced from iCloud Calendar
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowSettings(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Close</button>
                  <button onClick={disconnectICloud} className="flex-1 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30">Disconnect</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
                  <p className="text-blue-300 font-medium mb-1">Setup Instructions:</p>
                  <ol className="text-zinc-400 space-y-1 list-decimal list-inside">
                    <li>Go to appleid.apple.com</li>
                    <li>Sign In → App-Specific Passwords</li>
                    <li>Generate a new password for "Dashboard"</li>
                    <li>Enter your Apple ID email and the generated password below</li>
                  </ol>
                </div>

                {icloudError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {icloudError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Apple ID Email</label>
                  <input
                    type="email"
                    value={icloudCreds.email}
                    onChange={(e) => setIcloudCreds({ ...icloudCreds, email: e.target.value })}
                    placeholder="your@icloud.com"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">App-Specific Password</label>
                  <input
                    type="password"
                    value={icloudCreds.appPassword}
                    onChange={(e) => setIcloudCreds({ ...icloudCreds, appPassword: e.target.value })}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowSettings(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</button>
                  <button
                    onClick={connectICloud}
                    disabled={!icloudCreds.email || !icloudCreds.appPassword || connectingICloud}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {connectingICloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />} Connect
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// EMAIL VIEW - Gmail Integration & Reminders
// ============================================================================

function EmailView() {
  const [showCompose, setShowCompose] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState('');
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);

  // Gmail state
  const [googleStatus, setGoogleStatus] = useState({ hasCredentials: false, isAuthenticated: false, needsSetup: true });
  const [emails, setEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailBody, setEmailBody] = useState('');
  const [googleCreds, setGoogleCreds] = useState({ client_id: '', client_secret: '' });
  const [setupError, setSetupError] = useState('');

  // Check Google status on load
  useEffect(() => {
    fetch(`${API}/google/status`).then(r => r.json()).then(setGoogleStatus).catch(() => {});
  }, []);

  // Check URL for callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname);
      fetch(`${API}/google/status`).then(r => r.json()).then(setGoogleStatus);
    }
  }, []);

  // Fetch emails when authenticated
  useEffect(() => {
    if (googleStatus.isAuthenticated) {
      fetchEmails();
    }
  }, [googleStatus.isAuthenticated]);

  const fetchEmails = async () => {
    setLoadingEmails(true);
    try {
      const res = await fetch(`${API}/email/messages`);
      if (res.ok) {
        setEmails(await res.json());
      }
    } catch (e) { console.error(e); }
    setLoadingEmails(false);
  };

  const saveGoogleCreds = async () => {
    if (!googleCreds.client_id || !googleCreds.client_secret) return;
    setSetupError('');
    try {
      const res = await fetch(`${API}/google/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleCreds)
      });
      if (!res.ok) throw new Error('Failed to save credentials');
      // Get auth URL and redirect
      const authRes = await fetch(`${API}/google/auth-url`);
      const { url } = await authRes.json();
      window.location.href = url;
    } catch (e) {
      setSetupError(e.message);
    }
  };

  const connectGoogle = async () => {
    try {
      const res = await fetch(`${API}/google/auth-url`);
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setSetupError(e.message);
    }
  };

  const disconnectGoogle = async () => {
    await fetch(`${API}/google/disconnect`, { method: 'POST' });
    setGoogleStatus({ hasCredentials: true, isAuthenticated: false, needsSetup: false });
    setEmails([]);
    setSelectedEmail(null);
  };

  const openEmail = async (email) => {
    setSelectedEmail(email);
    setEmailBody('Loading...');
    try {
      const res = await fetch(`${API}/email/messages/${email.id}`);
      const data = await res.json();
      setEmailBody(data.body || 'No content');
      // Mark as read
      if (email.isUnread) {
        await fetch(`${API}/email/messages/${email.id}/read`, { method: 'POST' });
        setEmails(emails.map(e => e.id === email.id ? { ...e, isUnread: false } : e));
      }
    } catch (e) {
      setEmailBody('Error loading email');
    }
  };

  const sendEmail = async () => {
    if (!compose.to || !compose.subject) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compose)
      });
      if (res.ok) {
        setShowCompose(false);
        setCompose({ to: '', subject: '', body: '' });
      }
    } catch (e) { console.error(e); }
    setSending(false);
  };

  // Load reminders
  useEffect(() => {
    fetch(`${API}/reminders`).then(r => r.json()).then(setReminders).catch(() => {});
  }, []);

  const addReminder = async () => {
    if (!newReminder.trim()) return;
    try {
      await fetch(`${API}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newReminder, createdAt: new Date().toISOString() })
      });
      setNewReminder('');
      const res = await fetch(`${API}/reminders`);
      setReminders(await res.json());
    } catch (e) { console.error(e); }
  };

  const deleteReminder = async (id) => {
    try {
      await fetch(`${API}/reminders/${id}`, { method: 'DELETE' });
      setReminders(reminders.filter(r => r.id !== id));
    } catch (e) { console.error(e); }
  };

  const parseEmailSender = (from) => {
    const match = from.match(/^(.+?)\s*<(.+)>$/);
    return match ? { name: match[1].replace(/"/g, ''), email: match[2] } : { name: from, email: from };
  };

  return (
    <div className="flex h-full">
      {/* Email List */}
      <div className="w-96 border-r border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="w-5 h-5 text-red-400" /> Gmail
            </h2>
            <div className="flex items-center gap-2">
              {googleStatus.isAuthenticated ? (
                <>
                  <button onClick={fetchEmails} className="p-2 rounded-lg hover:bg-zinc-800" title="Refresh">
                    <RefreshCw className={`w-4 h-4 ${loadingEmails ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => setShowCompose(true)} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500" title="Compose">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button onClick={() => setShowSetup(true)} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Connect Gmail
                </button>
              )}
            </div>
          </div>
          {googleStatus.isAuthenticated && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Check className="w-3 h-3" /> Connected
              <button onClick={disconnectGoogle} className="ml-auto text-zinc-500 hover:text-red-400">Disconnect</button>
            </div>
          )}
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {!googleStatus.isAuthenticated ? (
            <div className="p-6 text-center">
              <Mail className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
              <p className="text-zinc-400 mb-4">Connect your Gmail account to see your inbox</p>
              <button onClick={() => setShowSetup(true)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500">
                Connect Gmail
              </button>
            </div>
          ) : loadingEmails ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-zinc-500" />
            </div>
          ) : emails.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">No emails found</div>
          ) : (
            <div>
              {emails.map(email => {
                const sender = parseEmailSender(email.from);
                return (
                  <div
                    key={email.id}
                    onClick={() => openEmail(email)}
                    className={`p-3 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/50 ${selectedEmail?.id === email.id ? 'bg-zinc-800' : ''} ${email.isUnread ? 'bg-zinc-900' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {email.isUnread && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm truncate ${email.isUnread ? 'font-semibold' : ''}`}>{sender.name}</span>
                          <span className="text-xs text-zinc-500">{new Date(email.date).toLocaleDateString()}</span>
                        </div>
                        <p className={`text-sm truncate ${email.isUnread ? 'text-white' : 'text-zinc-400'}`}>{email.subject || '(no subject)'}</p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{email.snippet}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reminders Section */}
        <div className="border-t border-zinc-800 p-3">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" /> Reminders ({reminders.length})
          </h3>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newReminder}
              onChange={(e) => setNewReminder(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addReminder()}
              placeholder="Add reminder..."
              className="flex-1 px-2 py-1.5 text-sm rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-zinc-600"
            />
            <button onClick={addReminder} className="px-2 py-1.5 rounded bg-amber-600 hover:bg-amber-500">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {reminders.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-zinc-800/50 group">
                <span className="flex-1 truncate">{r.text}</span>
                <button onClick={() => deleteReminder(r.id)} className="opacity-0 group-hover:opacity-100 text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 flex flex-col">
        {selectedEmail ? (
          <>
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold mb-2">{selectedEmail.subject || '(no subject)'}</h3>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <span className="font-medium text-white">{parseEmailSender(selectedEmail.from).name}</span>
                <span>&lt;{parseEmailSender(selectedEmail.from).email}&gt;</span>
                <span className="ml-auto">{new Date(selectedEmail.date).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">{emailBody}</pre>
            </div>
            <div className="p-4 border-t border-zinc-800 flex gap-2">
              <button onClick={() => { setCompose({ to: parseEmailSender(selectedEmail.from).email, subject: `Re: ${selectedEmail.subject}`, body: '' }); setShowCompose(true); }} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Reply
              </button>
              <button onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.id}`, '_blank')} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Open in Gmail
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Select an email to read</p>
            </div>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showSetup && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowSetup(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-red-400" /> Connect Gmail
            </h2>

            {googleStatus.hasCredentials && !googleStatus.isAuthenticated ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Click below to authorize access to your Gmail account.</p>
                <button onClick={connectGoogle} className="w-full px-4 py-3 rounded-lg bg-red-600 hover:bg-red-500 flex items-center justify-center gap-2">
                  <Mail className="w-5 h-5" /> Authorize with Google
                </button>
                <button onClick={() => setShowSetup(false)} className="w-full px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700">Cancel</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
                  <p className="text-blue-300 font-medium mb-1">Setup Instructions:</p>
                  <ol className="text-zinc-400 space-y-1 list-decimal list-inside">
                    <li>Go to console.cloud.google.com</li>
                    <li>Create a new project or select existing</li>
                    <li>Enable Gmail API</li>
                    <li>Go to Credentials → Create OAuth 2.0 Client</li>
                    <li>Set redirect URI: http://localhost:3847/api/google/callback</li>
                    <li>Copy Client ID and Secret below</li>
                  </ol>
                </div>

                {setupError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {setupError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={googleCreds.client_id}
                    onChange={(e) => setGoogleCreds({ ...googleCreds, client_id: e.target.value })}
                    placeholder="xxxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Client Secret</label>
                  <input
                    type="password"
                    value={googleCreds.client_secret}
                    onChange={(e) => setGoogleCreds({ ...googleCreds, client_secret: e.target.value })}
                    placeholder="GOCSPX-xxxxx"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowSetup(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</button>
                  <button
                    onClick={saveGoogleCreds}
                    disabled={!googleCreds.client_id || !googleCreds.client_secret}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Save & Connect
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowCompose(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <span className="font-semibold">Compose Email</span>
              <button onClick={() => setShowCompose(false)} className="p-1 rounded hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">To</label>
                <input type="email" value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder="email@example.com" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Subject</label>
                <input type="text" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Email subject" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Message</label>
                <textarea value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} placeholder="Write your message..." rows={8} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 flex justify-between">
              <button onClick={() => setShowCompose(false)} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white">Cancel</button>
              {googleStatus.isAuthenticated ? (
                <button onClick={sendEmail} disabled={!compose.to || !compose.subject || sending} className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
                </button>
              ) : (
                <button onClick={() => { const mailto = `mailto:${compose.to}?subject=${encodeURIComponent(compose.subject)}&body=${encodeURIComponent(compose.body)}`; window.open(mailto); setShowCompose(false); }} className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Open in Email App
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// FINANCES VIEW
// ============================================================================

function FinancesView({ finances, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newSubscription, setNewSubscription] = useState({ name: '', amount: '', billingCycle: 'monthly', nextBilling: '', category: '' });
  const [newTransaction, setNewTransaction] = useState({ description: '', amount: '', type: 'expense', category: '', date: '' });

  const { subscriptions = [], transactions = [], summary = {} } = finances;

  const monthlyTotal = subscriptions.reduce((sum, s) => {
    const amount = parseFloat(s.amount) || 0;
    return sum + (s.billingCycle === 'yearly' ? amount / 12 : s.billingCycle === 'weekly' ? amount * 4 : amount);
  }, 0);

  const addSubscription = async () => {
    if (!newSubscription.name || !newSubscription.amount) return;
    try {
      await fetch(`${API}/finances/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubscription)
      });
      setShowAddSubscription(false);
      setNewSubscription({ name: '', amount: '', billingCycle: 'monthly', nextBilling: '', category: '' });
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const deleteSubscription = async (id) => {
    try {
      await fetch(`${API}/finances/subscriptions/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const addTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount) return;
    try {
      await fetch(`${API}/finances/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction)
      });
      setShowAddTransaction(false);
      setNewTransaction({ description: '', amount: '', type: 'expense', category: '', date: '' });
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const categories = ['Software', 'Services', 'Infrastructure', 'Marketing', 'Other'];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Finances</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAddSubscription(true)} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Subscription
          </button>
          <button onClick={() => setShowAddTransaction(true)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Transaction
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold">${summary.revenue?.toLocaleString() || '0'}</p>
          <p className="text-sm text-zinc-500">Total Revenue</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-red-400" />
            <span className="text-xs text-zinc-500">Monthly</span>
          </div>
          <p className="text-2xl font-bold">${monthlyTotal.toFixed(2)}</p>
          <p className="text-sm text-zinc-500">Subscriptions</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <Box className="w-5 h-5 text-indigo-400" />
            <span className="text-xs text-zinc-500">{subscriptions.length}</span>
          </div>
          <p className="text-2xl font-bold">{subscriptions.filter(s => s.status !== 'cancelled').length}</p>
          <p className="text-sm text-zinc-500">Active Subscriptions</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-zinc-500">This month</span>
          </div>
          <p className="text-2xl font-bold">{transactions.length}</p>
          <p className="text-sm text-zinc-500">Transactions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg ${activeTab === 'overview' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Overview</button>
        <button onClick={() => setActiveTab('subscriptions')} className={`px-4 py-2 rounded-lg ${activeTab === 'subscriptions' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Subscriptions ({subscriptions.length})</button>
        <button onClick={() => setActiveTab('transactions')} className={`px-4 py-2 rounded-lg ${activeTab === 'transactions' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Transactions ({transactions.length})</button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Subscriptions */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-400" /> Subscriptions
            </h3>
            {subscriptions.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">No subscriptions yet</p>
            ) : (
              <div className="space-y-2">
                {subscriptions.slice(0, 5).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                    <div>
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-xs text-zinc-500">{sub.billingCycle} · {sub.category}</p>
                    </div>
                    <span className="font-medium">${sub.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> Recent Transactions
            </h3>
            {transactions.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-xs text-zinc-500">{tx.category} · {tx.date}</p>
                    </div>
                    <span className={`font-medium ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Name</th>
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Amount</th>
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Billing</th>
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Category</th>
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Next Billing</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="p-4 font-medium">{sub.name}</td>
                  <td className="p-4">${sub.amount}</td>
                  <td className="p-4"><span className="px-2 py-1 rounded bg-zinc-800 text-xs">{sub.billingCycle}</span></td>
                  <td className="p-4 text-zinc-400">{sub.category}</td>
                  <td className="p-4 text-zinc-400">{sub.nextBilling}</td>
                  <td className="p-4">
                    <button onClick={() => deleteSubscription(sub.id)} className="p-2 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/20">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Description</th>
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Amount</th>
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Type</th>
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Category</th>
                <th className="text-left p-4 text-sm text-zinc-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="p-4 font-medium">{tx.description}</td>
                  <td className={`p-4 font-medium ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-400">{tx.category}</td>
                  <td className="p-4 text-zinc-400">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Subscription Modal */}
      {showAddSubscription && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowAddSubscription(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-semibold mb-4">Add Subscription</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Name</label>
                <input type="text" value={newSubscription.name} onChange={(e) => setNewSubscription({ ...newSubscription, name: e.target.value })} placeholder="e.g. GitHub Pro" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Amount ($)</label>
                  <input type="number" value={newSubscription.amount} onChange={(e) => setNewSubscription({ ...newSubscription, amount: e.target.value })} placeholder="9.99" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Billing Cycle</label>
                  <select value={newSubscription.billingCycle} onChange={(e) => setNewSubscription({ ...newSubscription, billingCycle: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Category</label>
                <select value={newSubscription.category} onChange={(e) => setNewSubscription({ ...newSubscription, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Next Billing Date</label>
                <input type="date" value={newSubscription.nextBilling} onChange={(e) => setNewSubscription({ ...newSubscription, nextBilling: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-zinc-600" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAddSubscription(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</button>
              <button onClick={addSubscription} disabled={!newSubscription.name || !newSubscription.amount} className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50">Add</button>
            </div>
          </div>
        </>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowAddTransaction(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-semibold mb-4">Add Transaction</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Description</label>
                <input type="text" value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} placeholder="e.g. Client payment" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Amount ($)</label>
                  <input type="number" value={newTransaction.amount} onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })} placeholder="100.00" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Type</label>
                  <select value={newTransaction.type} onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Category</label>
                <select value={newTransaction.category} onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Date</label>
                <input type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-zinc-600" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAddTransaction(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</button>
              <button onClick={addTransaction} disabled={!newTransaction.description || !newTransaction.amount} className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50">Add</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// AUTOMATIONS VIEW
// ============================================================================

function AutomationsView({ automations, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    trigger: 'schedule',
    triggerConfig: {},
    action: 'notification',
    actionConfig: {},
    enabled: true
  });

  const triggers = [
    { id: 'schedule', label: 'Schedule', description: 'Run at specific times' },
    { id: 'webhook', label: 'Webhook', description: 'Triggered by external services' },
    { id: 'file_change', label: 'File Change', description: 'When a file is modified' },
    { id: 'git_push', label: 'Git Push', description: 'When code is pushed' },
  ];

  const actions = [
    { id: 'notification', label: 'Send Notification', description: 'Desktop notification' },
    { id: 'email', label: 'Send Email', description: 'Send an email' },
    { id: 'script', label: 'Run Script', description: 'Execute a shell command' },
    { id: 'api_call', label: 'API Call', description: 'Make an HTTP request' },
  ];

  const createAutomation = async () => {
    if (!newAutomation.name) return;
    try {
      await fetch(`${API}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAutomation)
      });
      setShowCreate(false);
      setNewAutomation({ name: '', trigger: 'schedule', triggerConfig: {}, action: 'notification', actionConfig: {}, enabled: true });
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const toggleAutomation = async (id, enabled) => {
    try {
      await fetch(`${API}/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled })
      });
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const runAutomation = async (id) => {
    try {
      await fetch(`${API}/automations/${id}/run`, { method: 'POST' });
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const deleteAutomation = async (id) => {
    try {
      await fetch(`${API}/automations/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Automations</h2>
          <p className="text-zinc-500">Automate repetitive tasks with triggers and actions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Automation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-zinc-500">Total</span>
          </div>
          <p className="text-2xl font-bold">{automations.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-zinc-500">Active</span>
          </div>
          <p className="text-2xl font-bold">{automations.filter(a => a.enabled).length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <span className="text-sm text-zinc-500">Runs Today</span>
          </div>
          <p className="text-2xl font-bold">{automations.reduce((sum, a) => sum + (a.runCount || 0), 0)}</p>
        </div>
      </div>

      {/* Automation list */}
      {automations.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 rounded-xl border border-zinc-800">
          <Zap className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
          <h3 className="text-lg font-semibold mb-2">No automations yet</h3>
          <p className="text-zinc-500 mb-4">Create your first automation to save time on repetitive tasks</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500">
            Create Automation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => (
            <div key={auto.id} className={`p-4 rounded-xl bg-zinc-900 border ${auto.enabled ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'}`}>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleAutomation(auto.id, auto.enabled)}
                  className={`w-10 h-6 rounded-full transition-colors ${auto.enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${auto.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                <div className="flex-1">
                  <h3 className="font-semibold">{auto.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                    <span className="px-2 py-0.5 rounded bg-zinc-800">{auto.trigger}</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="px-2 py-0.5 rounded bg-zinc-800">{auto.action}</span>
                    {auto.lastRun && <span className="text-xs">Last run: {timeAgo(auto.lastRun)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runAutomation(auto.id)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/20"
                    title="Run now"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAutomation(auto.id)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/20"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowCreate(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-semibold mb-4">Create Automation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Name</label>
                <input type="text" value={newAutomation.name} onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })} placeholder="e.g. Daily backup reminder" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Trigger</label>
                <div className="grid grid-cols-2 gap-2">
                  {triggers.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setNewAutomation({ ...newAutomation, trigger: t.id })}
                      className={`p-3 rounded-lg border text-left ${newAutomation.trigger === t.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-600'}`}
                    >
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-zinc-500">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {newAutomation.trigger === 'schedule' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Schedule (cron)</label>
                  <input
                    type="text"
                    value={newAutomation.triggerConfig.cron || ''}
                    onChange={(e) => setNewAutomation({ ...newAutomation, triggerConfig: { cron: e.target.value } })}
                    placeholder="0 9 * * * (9 AM daily)"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Action</label>
                <div className="grid grid-cols-2 gap-2">
                  {actions.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setNewAutomation({ ...newAutomation, action: a.id })}
                      className={`p-3 rounded-lg border text-left ${newAutomation.action === a.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-600'}`}
                    >
                      <p className="font-medium text-sm">{a.label}</p>
                      <p className="text-xs text-zinc-500">{a.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {newAutomation.action === 'script' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Command</label>
                  <input
                    type="text"
                    value={newAutomation.actionConfig.command || ''}
                    onChange={(e) => setNewAutomation({ ...newAutomation, actionConfig: { command: e.target.value } })}
                    placeholder="npm run build"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              )}

              {newAutomation.action === 'notification' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Message</label>
                  <input
                    type="text"
                    value={newAutomation.actionConfig.message || ''}
                    onChange={(e) => setNewAutomation({ ...newAutomation, actionConfig: { message: e.target.value } })}
                    placeholder="Time to check your tasks!"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</button>
              <button onClick={createAutomation} disabled={!newAutomation.name} className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50">Create</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
