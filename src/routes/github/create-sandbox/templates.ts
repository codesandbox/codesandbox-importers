type Template =
  | 'vue-cli'
  | 'preact-cli'
  | 'svelte'
  | 'create-react-typescript-app'
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

  const { dependencies = {}, devDependencies = {} } = packageJSONPackage;

  const totalDependencies = [
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies),
  ];

  if (totalDependencies.indexOf('preact-cli') > -1) {
    return 'preact-cli';
  }

  if (totalDependencies.indexOf('svelte') > -1) {
    return 'svelte';
  }

  if (totalDependencies.indexOf('react-scripts-ts') > -1) {
    return 'create-react-typescript-app';
  }

  return 'create-react-app';
}
