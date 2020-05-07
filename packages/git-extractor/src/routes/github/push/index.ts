import delay from "../../../utils/delay";
import * as api from "../api";
import { createBlobs } from "./utils/create-blobs";

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

export interface IChanges {
  added: Array<{
    path: string;
    content: string;
    encoding: "base64" | "utf-8";
  }>;
  deleted: string[];
  modified: Array<{
    path: string;
    content: string;
    encoding: "base64" | "utf-8";
  }>;
}

export type ITree = ITreeFile[];

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

export async function createInitialCommit(
  gitInfo: IGitInfo,
  changes: IChanges,
  parentSha: string,
  userToken: string
) {
  return createCommit(gitInfo, changes, parentSha, "initial commit", userToken);
}

export async function createCommit(
  gitInfo: IGitInfo,
  changes: IChanges,
  parentSha: string,
  message: string,
  userToken: string
) {
  const { username, repo } = gitInfo;

  const treeSha = await api.getCommitTreeSha(
    username,
    repo,
    parentSha,
    userToken
  );
  let tree: ITree = [];

  if (changes.deleted.length) {
    tree = await api.getTreeWithDeletedFiles(
      username,
      repo,
      treeSha,
      changes.deleted,
      userToken
    );
  }
  const createdBlobs = await createBlobs(
    [...changes.modified, ...changes.added],
    gitInfo,
    userToken
  );
  const updatedTree = tree.concat(createdBlobs);

  const treeResponse = await api.createTree(
    username,
    repo,
    updatedTree,
    changes.deleted.length ? null : treeSha,
    userToken
  );

  return await api.createCommit(
    gitInfo.username,
    gitInfo.repo,
    treeResponse.sha,
    [parentSha],
    message,
    userToken
  );
}

export async function createRepo(
  username: string,
  name: string,
  changes: IChanges,
  userToken: string,
  privateRepo?: boolean
) {
  await api.createRepo(username, name, userToken, privateRepo);

  const latestData = await api.fetchRepoInfo(
    username,
    name,
    "master",
    "",
    true,
    userToken
  );

  const gitInfo: IGitInfo = {
    username: latestData.username,
    repo: latestData.repo,
    branch: latestData.branch,
    path: latestData.path,
  };

  const commit = await createCommit(
    gitInfo,
    changes,
    latestData.commitSha,
    "Initial commit",
    userToken
  );

  await api.updateReference(
    username,
    gitInfo.repo,
    gitInfo.branch,
    commit.sha,
    userToken
  );

  api.resetShaCache(gitInfo);

  return gitInfo;
}
