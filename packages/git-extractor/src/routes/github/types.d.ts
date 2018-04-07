type Module = {
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

type NormalizedDirectory = {
  path: string;
  name: string;
  files: Array<Module>;
  directories: Array<NormalizedDirectory>;
};

type DownloadedFile = Module & {
  code: string;
  isBinary: boolean;
};
