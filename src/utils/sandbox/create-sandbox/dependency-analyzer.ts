import extractRequires from './utils/extract-requires';
import { uniq } from 'lodash';

import { ISandboxFile } from '../denormalize';
import { INormalizedModules, IModule } from '../normalize';

/**
 * This finds all dependencies that are called in a sandbox, it's important to
 * do this check so we know what dependencies to include from the devDependencies
 *
 * @export
 * @param {ISandboxFile[]} files
 * @returns
 */
export default function getDependencyRequiresFromFiles(
  files: INormalizedModules
) {
  // Get all dependencies called in sandbox
  const dependencies = Object.keys(files)
    .filter(p => /\.(j|t)sx?$/.test(p) && p.startsWith('src/'))
    .reduce((depList: string[], filePath: string) => {
      const file = files[filePath];

      if (file.isBinary) {
        return depList;
      }

      try {
        const dependenciesInFile = extractRequires(file.content)
          .filter(req => /^\w|@\w/.test(req))
          .map(dep => {
            const parts = dep.split('/');

            if (dep.startsWith('@')) {
              return `${parts[0]}/${parts[1]}`;
            } else {
              return parts[0];
            }
          });
        return [...depList, ...dependenciesInFile];
      } catch (e) {
        console.error(e);

        return depList;
      }
    }, []) as string[];

  return uniq(dependencies);
}
