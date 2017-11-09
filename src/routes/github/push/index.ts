import {
  fetchTree,
  createTree,
  createCommit as createCommitApi,
  createMerge,
  fetchRepoInfo,
  updateReference,
} from '../api';
import { INormalizedModules } from '../../../utils/sandbox/normalize';

import getDelta from './utils/delta';
import { createBlobs } from './utils/create-blobs';
import { join } from 'path';

export interface IGitInfo {
  username: string;
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

async function getNormalizedTree(
  { username, commitSha, repo, branch, path }: IGitInfo,
  makeRelative = true
) {
  // 1. Get commit tree from GitHub based on path
  let { tree, truncated } = await fetchTree(username, repo, path, commitSha);

  if (truncated) {
    throw new Error('This repository is too big to make a commit.');
  }

  if (path && makeRelative) {
    tree = tree
      .filter(t => t.path.startsWith(path))
      .map(t => ({ ...t, path: t.path.replace(path + '/', '') }));
  }

  // 2. Filter tree on files only (check for size property)
  tree = tree.filter(t => t.size);

  return tree;
}

export async function getFileDifferences(
  gitInfo: IGitInfo,
  sandboxFiles: INormalizedModules
) {
  const tree = await getNormalizedTree(gitInfo);

  return getDelta(tree, sandboxFiles);
}

export async function createCommit(
  gitInfo: IGitInfo,
  sandboxFiles: INormalizedModules,
  message: string,
  userToken: string
) {
  const { username, commitSha, repo, branch, path = '' } = gitInfo;

  const tree = await getNormalizedTree(gitInfo, false);
  let absoluteSandboxFiles = sandboxFiles;

  if (path) {
    absoluteSandboxFiles = Object.keys(sandboxFiles).reduce(
      (total, next) => ({
        ...total,
        [join(path, next)]: sandboxFiles[next],
      }),
      {}
    );
  }

  const delta = getDelta(tree, sandboxFiles);
  // Remove the files from removed that are out of scope
  const relevantRemovedFiles = delta.deleted.filter(p => p.startsWith(path));

  // Now create blobs for all modified/new files
  const createdBlobs = await createBlobs(
    [...delta.modified, ...delta.added],
    absoluteSandboxFiles,
    gitInfo,
    userToken
  );

  // Create new tree with deleted blobs
  const newTree = [...tree, ...createdBlobs].filter(
    t => delta.deleted.indexOf(t.path) === -1
  );

  const treeResponse = await createTree(username, repo, newTree, userToken);
  const commit = await createCommitApi(
    gitInfo.username,
    gitInfo.repo,
    treeResponse.sha,
    commitSha,
    message,
    userToken
  );

  const lastInfo = await fetchRepoInfo(username, repo, branch, path, true);

  // If we're up to date we just move the head, if that's not the cache we create
  // a merge
  if (lastInfo.commitSha === commitSha) {
    try {
      return await updateReference(
        username,
        repo,
        branch,
        commit.sha,
        userToken
      );
    } catch (e) {
      console.error(e);
      /* Let's try to create the merge then */
    }
  }

  return await createMerge(username, repo, branch, commit.sha, userToken);
}
