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

export type ITemplate =
  | 'vue-cli'
  | 'preact-cli'
  | 'svelte'
  | 'create-react-app-typescript'
  | 'create-react-app'
  | 'angular-cli';

export interface ISandbox {
  title: string;
  description: string;
  tags: string;
  modules: ISandboxFile[];
  directories: ISandboxDirectory[];
  externalResources: string[];
  template: ITemplate;
  entry: string;
}
