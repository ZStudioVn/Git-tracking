import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { join, resolve } from 'node:path';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { inspectLocalGit, getProjectDiff } from './services/local-git';
import { listProjects, saveProject, removeProject } from './services/projects';
import { readGitConfig, writeGitConfig } from './services/git-config';

const execFileAsync = promisify(execFile);

const DEV_URL = 'http://localhost:3000';
const APP_PORT = 3100;

const RUNNABLE_GIT_COMMANDS = new Set(['status', 'log', 'branch', 'remote', 'fetch', 'pull', 'push', 'diff', 'rev-parse', 'show', 'config']);

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

function startNextServer(): void {
  const { execPath } = process;
  const serverEntry = resolve(__dirname, '../node_modules/next/dist/bin/next');
  serverProcess = spawn(execPath, [serverEntry, 'start', '-p', String(APP_PORT)], {
    stdio: 'ignore',
    env: { ...process.env, PORT: String(APP_PORT), HOSTNAME: '127.0.0.1' },
    windowsHide: true,
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (!app.isPackaged) {
    void mainWindow.loadURL(DEV_URL);
  } else {
    startNextServer();
    void mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}`);
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('projects:list', async () => listProjects());

  ipcMain.handle('projects:pick', async () => {
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, {
          title: 'Select a Git project folder',
          properties: ['openDirectory'],
        })
      : await dialog.showOpenDialog({
          title: 'Select a Git project folder',
          properties: ['openDirectory'],
        });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('projects:add', async (_event: IpcMainInvokeEvent, rootPath: unknown) => {
    if (typeof rootPath !== 'string' || rootPath.trim().length === 0) throw new Error('Invalid project path');
    const status = await inspectLocalGit(rootPath);
    return saveProject(status);
  });

  ipcMain.handle('projects:refresh', async (_event: IpcMainInvokeEvent, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Invalid project id');
    const project = await listProjects().then((items) => items.find((item) => item.id === id));
    if (!project) throw new Error('Project not found');
    const status = await inspectLocalGit(project.rootPath);
    const updated = await saveProject(status);
    return { project: updated, status };
  });

  ipcMain.handle('projects:diff', async (_event: IpcMainInvokeEvent, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Invalid project id');
    const project = await listProjects().then((items) => items.find((item) => item.id === id));
    if (!project) throw new Error('Project not found');
    return getProjectDiff(project.rootPath);
  });

  ipcMain.handle('projects:remove', async (_event: IpcMainInvokeEvent, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Invalid project id');
    return removeProject(id);
  });

  ipcMain.handle('projects:open-folder', async (_event: IpcMainInvokeEvent, rootPath: unknown) => {
    if (typeof rootPath !== 'string') throw new Error('Invalid project path');
    await shell.openPath(rootPath);
  });

  ipcMain.handle('git:inspect', async (_event: IpcMainInvokeEvent, rootPath: unknown) => {
    if (typeof rootPath !== 'string') throw new Error('Invalid project path');
    return inspectLocalGit(rootPath);
  });

  ipcMain.handle('git:run', async (_event: IpcMainInvokeEvent, rootPath: unknown, args: unknown) => {
    if (typeof rootPath !== 'string') throw new Error('Invalid project path');
    if (!Array.isArray(args) || args.length === 0 || !args.every((arg) => typeof arg === 'string')) {
      throw new Error('Invalid command arguments');
    }
    const project = (await listProjects()).find((item) => item.rootPath === rootPath);
    if (!project) throw new Error('Project is not registered');
    const [command] = args as string[];
    if (!RUNNABLE_GIT_COMMANDS.has(command)) throw new Error(`Command not allowed: ${command}`);
    try {
      const { stdout, stderr } = await execFileAsync('git', ['-C', rootPath, ...(args as string[])], {
        timeout: 30_000,
        maxBuffer: 4_000_000,
      });
      return { code: 0, stdout, stderr };
    } catch (error) {
      const failure = error as { code?: number; stdout?: string; stderr?: string };
      return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? String(error) };
    }
  });

  ipcMain.handle('git-config:read', async (_event: IpcMainInvokeEvent, rootPath: unknown) => {
    if (typeof rootPath !== 'string') throw new Error('Invalid project path');
    return readGitConfig(resolve(rootPath));
  });

  ipcMain.handle('git-config:write', async (_event: IpcMainInvokeEvent, rootPath: unknown, scope: unknown, name: unknown, email: unknown) => {
    if (typeof rootPath !== 'string' || (scope !== 'global' && scope !== 'local')) throw new Error('Invalid request');
    if (typeof name !== 'string' || typeof email !== 'string') throw new Error('Invalid config');
    return writeGitConfig(resolve(rootPath), scope, name, email);
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});
