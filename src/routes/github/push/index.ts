import { fetchTree } from '../api';
import { INormalizedModules } from '../../../utils/sandbox/normalize';

import getDelta from './utils/delta';

export interface IGitInfo {
  user: string;
  repo: string;
  branch: string;
  commitSha: string;
  path?: string;
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

export async function getFileDifferences(
  userToken: string,
  { user, commitSha, repo, branch, path }: IGitInfo,
  sandboxFiles: INormalizedModules
) {
  // 1. Get commit tree from GitHub based on path
  let { tree } = await fetchTree(user, repo, path, commitSha);

  if (path) {
    tree = tree
      .filter(t => t.path.startsWith(path))
      .map(t => ({ ...t, path: t.path.replace(path + '/', '') }));
  }

  // 2. Filter tree on files only (check for size property)
  tree = tree.filter(t => t.size);

  return getDelta(tree, sandboxFiles);
}
