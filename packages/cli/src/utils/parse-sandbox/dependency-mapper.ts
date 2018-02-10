import * as pacote from 'pacote';

// Dependencies we don't want to include in the dependencies of CodeSandbox
const BLACKLISTED_DEPENDENCIES = [
  'react-scripts',
  'html-loader',
  'json-loader',
  'markdown-loader',
  'raw-loader',
  'flow-bin',
];

export interface IDependencies {
  [name: string]: string;
}

/**
 * Filters dependencies that are not needed
 *
 * @param {IDependencies} dependencies
 * @returns
 */
function filterDependences(dependencies: IDependencies) {
  return Object.keys(dependencies).reduce((deps, depName) => {
    if (BLACKLISTED_DEPENDENCIES.indexOf(depName) === -1) {
      return { ...deps, [depName]: dependencies[depName] };
    }

    return deps;
  }, {});
}

/**
 * Gets the absolute versions of all dependencies
 *
 * @param {IDependencies} dependencies
 * @returns
 */
async function getAbsoluteVersions(dependencies: IDependencies) {
  const dependencyNames = Object.keys(dependencies);

  // First build an array with name and absolute version, allows parallel
  // fetching of version numbers
  const absoluteDependencies = await Promise.all(
    dependencyNames.map(async depName => {
      const depString = `${depName}@${dependencies[depName]}`;

      try {
        const manifest = await pacote.manifest(depString);
        const absoluteVersion = manifest.version;

        return { name: depName, version: absoluteVersion };
      } catch (e) {
        e.message = `Could not fetch version for ${depString}: ${e.message}`;
        throw e;
      }
    })
  );

  return absoluteDependencies.reduce((total: IDependencies, next) => {
    total[next.name] = next.version;
    return total;
  }, {});
}

/**
 * This filters all dependencies that are not needed for CodeSandbox and normalizes
 * the versions from semantic to absolute version, eg: ^1.0.0 -> 1.2.1
 *
 * @export
 * @param {object} dependencies
 */
export default async function mapDependencies(dependencies: IDependencies) {
  const filteredDependencies = filterDependences(dependencies);
  const absoluteDependencies = await getAbsoluteVersions(filteredDependencies);

  return absoluteDependencies;
}
