import { contextBridge, ipcRenderer } from 'electron';

const api = {
  projects: {
    list: () => ipcRenderer.invoke('projects:list') as Promise<unknown>,
    pick: () => ipcRenderer.invoke('projects:pick') as Promise<string | null>,
    add: (rootPath: string) => ipcRenderer.invoke('projects:add', rootPath) as Promise<unknown>,
    refresh: (id: string) => ipcRenderer.invoke('projects:refresh', id) as Promise<unknown>,
    diff: (id: string) => ipcRenderer.invoke('projects:diff', id) as Promise<unknown>,
    remove: (id: string) => ipcRenderer.invoke('projects:remove', id) as Promise<unknown>,
    openFolder: (rootPath: string) => ipcRenderer.invoke('projects:open-folder', rootPath) as Promise<void>,
  },
  git: {
    inspect: (rootPath: string) => ipcRenderer.invoke('git:inspect', rootPath) as Promise<unknown>,
    run: (rootPath: string, args: string[]) => ipcRenderer.invoke('git:run', rootPath, args) as Promise<unknown>,
  },
  gitConfig: {
    read: (rootPath: string) => ipcRenderer.invoke('git-config:read', rootPath) as Promise<unknown>,
    write: (rootPath: string, scope: 'global' | 'local', name: string, email: string) =>
      ipcRenderer.invoke('git-config:write', rootPath, scope, name, email) as Promise<unknown>,
  },
};

contextBridge.exposeInMainWorld('gitTracking', api);
