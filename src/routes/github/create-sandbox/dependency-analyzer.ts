export default function getDependencyRequiresFromFiles(files: SandboxFile[]) {
  const dependencyRegex = /import\s.*[from]?["|']([\w|@].*)["|']|require\(["|']([\w|@].*)["|']\)/;

  // Get all dependencies called in sandbox
  return files.reduce((depList: string[], file: SandboxFile) => {
    const dependenciesInFile = file.code
      .split('\n')
      .map((line: string) => {
        const depMatch = line.match(dependencyRegex);

        if (depMatch && (depMatch[1] || depMatch[2])) {
          return depMatch[1] || depMatch[2];
        }
      })
      .filter(x => x) as string[];

    return [...depList, ...dependenciesInFile];
  }, []) as string[];
}
