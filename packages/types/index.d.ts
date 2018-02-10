export interface IModule {
  content: string;
  isBinary: boolean;
}

export interface INormalizedModules {
  [path: string]: IModule;
}

export interface ISandboxFile {
  title: string;
  code: string;
  shortid: string;
  isBinary: boolean;
  directoryShortid: string | undefined;
}

export interface ISandboxDirectory {
  shortid: string;
  title: string;
  directoryShortid: string | undefined;
}
