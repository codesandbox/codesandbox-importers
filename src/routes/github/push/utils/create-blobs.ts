import { INormalizedModules } from '../../../../utils/sandbox/normalize';
import { IGitInfo, ITree } from '../index';
import { createBlob } from '../../api';

export async function createBlobs(
  files: string[],
  sandboxFiles: INormalizedModules,
  gitInfo: IGitInfo,
  token: string
): Promise<ITree> {
  return Promise.all(
    files.map(async path => {
      const result = await createBlob(
        gitInfo.user,
        gitInfo.repo,
        sandboxFiles[path].content,
        token
      );

      return {
        path,
        sha: result.sha,
        size: sandboxFiles[path].content.length,
        mode: '100644', // blob
        type: 'blob',
        url: result.url,
      };
    })
  );
}
