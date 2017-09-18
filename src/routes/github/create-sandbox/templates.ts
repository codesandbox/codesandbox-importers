type Template =
  | 'vue-cli'
  | 'preact-cli'
  | 'svelte'
  | 'react-scripts-ts'
  | 'create-react-app';

export function alterFilesForTemplate(
  template: Template,
  modules: SandboxFile[]
) {
  if (template === 'vue-cli') {
    // Rename the main.js from src to index.js

    const entryModule = modules.find(
      m => m.title === 'main.js' && m.directoryShortid == null
    );

    const indexModule = modules.find(
      m => m.title === 'index.js' && m.directoryShortid == null
    );

    if (entryModule && !indexModule) {
      entryModule.title = 'index.js';
    }

    return modules;
  }

  return modules;
}

export function getTemplate(
  packageJSONPackage: {
    dependencies: { [key: string]: string };
    devDependencies: { [key: string]: string };
  },
  modules: SandboxFile[]
): Template {
  if (modules.find(m => m.title.includes('.vue'))) {
    return 'vue-cli';
  }

  const dependencies = [
    ...Object.keys(packageJSONPackage.dependencies),
    ...Object.keys(packageJSONPackage.devDependencies),
  ];

  if (dependencies.indexOf('preact-cli') > -1) {
    return 'preact-cli';
  }

  if (dependencies.indexOf('svelte') > -1) {
    return 'svelte';
  }

  if (dependencies.indexOf('react-scripts-ts') > -1) {
    return 'create-react-typescript-app';
  }

  return 'create-react-app';
}
