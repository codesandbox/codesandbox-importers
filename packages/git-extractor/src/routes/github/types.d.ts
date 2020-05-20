export type Module = {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: "file" | "dir";
};

export type NormalizedDirectory = {
  path: string;
  name: string;
  files: Array<Module>;
  directories: Array<NormalizedDirectory>;
};

export type DownloadedFile = Module & {
  code: string;
  isBinary: boolean;
};
