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
  directoryShortid: string | undefined | null;
}

export interface ISandboxDirectory {
  shortid: string;
  title: string;
  directoryShortid: string | undefined | null;
}

export type ITemplate =
  | "vue-cli"
  | "preact-cli"
  | "svelte"
  | "create-react-app-typescript"
  | "create-react-app"
  | "angular-cli"
  | "parcel"
  | "@dojo/cli-create-app"
  | "cxjs"
  | "gatsby"
  | "nuxt"
  | "next"
  | "reason"
  | "apollo"
  | "sapper"
  | "ember"
  | "nest"
  | "static";

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
