import { INormalizedModules } from '../../../../utils/sandbox/normalize';

export type ITemplate =
  | 'vue-cli'
  | 'preact-cli'
  | 'svelte'
  | 'create-react-app-typescript'
  | 'create-react-app';

export function getMainFile(template: ITemplate) {
  if (template === 'vue-cli') {
    return 'src/main.js';
  }

  if (template === 'create-react-app-typescript') {
    return 'src/index.tsx';
  }

  return 'src/index.js';
}

export function getTemplate(
  packageJSONPackage: {
    dependencies: { [key: string]: string };
    devDependencies: { [key: string]: string };
  },
  modules: INormalizedModules
): ITemplate {
  if (Object.keys(modules).find(m => m.endsWith('.vue'))) {
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
    return 'create-react-app-typescript';
  }

  if (totalDependencies.indexOf('vue') > -1) {
    return 'vue-cli';
  }

  return 'create-react-app';
}
