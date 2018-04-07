import * as api from "../api";
import { INormalizedModules } from "../../../utils/sandbox/normalize";

import getDelta from "./utils/delta";
import { createBlobs } from "./utils/create-blobs";
import { join } from "path";
import delay from "../../../utils/delay";

export interface IGitInfo {
  username: string;
  repo: string;
  branch: string;
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
  { username, repo, branch, path }: IGitInfo,
  commitSha: string,
  makeRelative = true
) {
  // 1. Get commit tree from GitHub based on path
  let { tree, truncated } = await api.fetchTree(
    username,
    repo,
    path,
    commitSha
  );

  if (truncated) {
    throw new Error("This repository is too big to make a commit.");
  }

  if (path && makeRelative) {
    tree = tree
      .filter(t => t.path.startsWith(path + "/"))
      .map(t => ({ ...t, path: t.path.replace(path + "/", "") }));
  }

  // 2. Filter tree on files only (check for size property)
  tree = tree.filter(t => t.size);

  return tree;
}

export async function getFileDifferences(
  gitInfo: IGitInfo,
  commitSha: string,
  sandboxFiles: INormalizedModules
) {
  const tree = await getNormalizedTree(gitInfo, commitSha);

  return getDelta(tree, sandboxFiles);
}

function generateBranchName() {
  const id = Date.now();
  return `csb-${id}`;
}

export async function createBranch(
  gitInfo: IGitInfo,
  refSha: string,
  userToken: string,
  branchName: string = generateBranchName()
) {
  const res = await api.createReference(
    gitInfo.username,
    gitInfo.repo,
    branchName,
    refSha,
    userToken
  );

  return { url: res.url, ref: res.ref, branchName };
}

export async function createFork(
  gitInfo: IGitInfo,
  currentUser: string,
  userToken: string
): Promise<IGitInfo> {
  const forkGitInfo: IGitInfo = { ...gitInfo, username: currentUser };

  const existingRepo = await api.doesRepoExist(
    forkGitInfo.username,
    forkGitInfo.repo
  );

  if (!existingRepo) {
    await api.createFork(gitInfo.username, gitInfo.repo, userToken);

    // Forking is asynchronous, so we need to poll for when the repo has been created
    let repoExists = false;
    let tryCount = 0;
    while (!repoExists) {
      tryCount++;

      if (tryCount > 300) {
        throw new Error(
          "Forking repo takes longer than 5 minutes, try again later."
        );
      }

      repoExists = await api.doesRepoExist(
        forkGitInfo.username,
        forkGitInfo.repo
      );

      await delay(1000);
    }
  }

  return forkGitInfo;
}

export async function createCommit(
  gitInfo: IGitInfo,
  sandboxFiles: INormalizedModules,
  commitSha: string,
  message: string,
  userToken: string
) {
  const { username, repo, branch, path = "" } = gitInfo;

  const tree = await getNormalizedTree(gitInfo, commitSha, false);
  let absoluteSandboxFiles = sandboxFiles;

  if (path) {
    absoluteSandboxFiles = Object.keys(sandboxFiles).reduce(
      (total, next) => ({
        ...total,
        [join(path, next)]: sandboxFiles[next]
      }),
      {}
    );
  }

  const delta = getDelta(tree, absoluteSandboxFiles);
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
    t => relevantRemovedFiles.indexOf(t.path) === -1
  );

  const treeResponse = await api.createTree(username, repo, newTree, userToken);

  return await api.createCommit(
    gitInfo.username,
    gitInfo.repo,
    treeResponse.sha,
    commitSha,
    message,
    userToken
  );
}

export async function createRepo(
  username: string,
  name: string,
  sandboxFiles: INormalizedModules,
  userToken: string
) {
  const data = await api.createRepo(username, name, userToken);

  const latestData = await api.fetchRepoInfo(username, name);

  const gitInfo: IGitInfo = {
    username: latestData.username,
    repo: latestData.repo,
    branch: latestData.branch,
    path: latestData.path
  };

  const commit = await createCommit(
    gitInfo,
    sandboxFiles,
    latestData.commitSha,
    "Initial commit",
    userToken
  );

  const res = await api.updateReference(
    username,
    gitInfo.repo,
    gitInfo.branch,
    commit.sha,
    userToken
  );

  api.resetShaCache(gitInfo);

  return gitInfo;
}
