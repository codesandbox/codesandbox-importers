export interface IGitInfo {
  user: string;
  repo: string;
  branch: string;
  path?: string;
}

export interface INormalizedModules {
  [path: string]: {
    content: string;
  };
}

export interface ITreeFile {
  path: string;
  mode: string;
  type: string;
  size: number;
  sha: string;
  url: string;
}

export type ITree = ITreeFile[];

export function getFileDifferences(
  userToken: string,
  { user, repo, branch, path }: IGitInfo
) {
  // 1. Get commit tree from GitHub based on path
  // 2. Filter tree on files only (check for size property)
  // 3. Get sandbox files
}
