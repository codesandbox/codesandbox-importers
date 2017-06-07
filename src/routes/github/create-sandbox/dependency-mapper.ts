import * as pacote from 'pacote';

// Dependencies we don't want to include in the dependencies of CodeSandbox
const BLACKLISTED_DEPENDENCIES = [
  'react-scripts',
  'html-loader',
  'json-loader',
  'markdown-loader',
  'raw-loader',
];

/**
 * Filters dependencies that are not needed
 *
 * @param {Dependencies} dependencies
 * @returns
 */
function filterDependences(dependencies: Dependencies) {
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
 * @param {Dependencies} dependencies
 * @returns
 */
async function getAbsoluteVersions(dependencies: Dependencies) {
  const absoluteDependencies: Dependencies = {};

  const dependencyNames = Object.keys(dependencies);
  for (let i = 0; i < dependencyNames.length; i++) {
    const depName = dependencyNames[i];
    const depString = `${depName}@${dependencies[depName]}`;
    try {
      const manifest = await pacote.manifest(depString);

      absoluteDependencies[depName] = manifest.version;
    } catch (e) {
      throw new Error(`Could not fetch version for ${depString}: ${e.message}`);
    }
  }

  return absoluteDependencies;
}

/**
 * This filters all dependencies that are not needed for CodeSandbox and normalizes
 * the versions from semantic to absolute version, eg: ^1.0.0 -> 1.2.1
 *
 * @export
 * @param {object} dependencies
 */
export default async function mapDependencies(dependencies: Dependencies) {
  const filteredDependencies = filterDependences(dependencies);
  const absoluteDependencies = await getAbsoluteVersions(filteredDependencies);

  return absoluteDependencies;
}
