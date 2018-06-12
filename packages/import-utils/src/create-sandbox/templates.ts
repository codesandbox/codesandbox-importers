import { INormalizedModules } from "codesandbox-import-util-types";
import { ITemplate } from "codesandbox-import-util-types";

export function getMainFile(template: ITemplate) {
  if (template === "vue-cli") {
    return "src/main.js";
  }

  if (template === "angular-cli") {
    return "src/main.ts";
  }

  if (template === "create-react-app-typescript") {
    return "src/index.tsx";
  }

  if (template === "parcel") {
    return "index.html";
  }

  if (template === "gatsby") {
    return "src/pages/index.js";
  }

  if (template === "nuxt") {
    // Wildcard, because nuxt is not specific on this
    return "package.json";
  }

  return "src/index.js";
}

const SANDBOX_CONFIG = "sandbox.config.json";

export function getTemplate(
  packageJSONPackage: {
    dependencies: { [key: string]: string };
    devDependencies: { [key: string]: string };
  },
  modules: INormalizedModules
): ITemplate {
  if (modules[SANDBOX_CONFIG]) {
    try {
      const config = JSON.parse(modules[SANDBOX_CONFIG].content);

      if (config.template) {
        return config.template;
      }
    } catch (e) {}
  }
  const { dependencies = {}, devDependencies = {} } = packageJSONPackage;

  const totalDependencies = [
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies)
  ];

  if (totalDependencies.indexOf("nuxt") > -1) {
    return "nuxt";
  }

  if (Object.keys(modules).find(m => m.endsWith(".vue"))) {
    return "vue-cli";
  }

  if (totalDependencies.indexOf("gatsby") > -1) {
    return "gatsby";
  }

  if (totalDependencies.indexOf("parcel-bundler") > -1) {
    return "parcel";
  }

  if (totalDependencies.indexOf("react-scripts-ts") > -1) {
    return "create-react-app-typescript";
  }

  if (totalDependencies.indexOf("@angular/core") > -1) {
    return "angular-cli";
  }

  if (totalDependencies.indexOf("preact-cli") > -1) {
    return "preact-cli";
  }

  if (totalDependencies.indexOf("svelte") > -1) {
    return "svelte";
  }

  if (totalDependencies.indexOf("vue") > -1) {
    return "vue-cli";
  }

  if (totalDependencies.indexOf("@dojo/core") > -1) {
    return "@dojo/cli-create-app";
  }

  if (totalDependencies.indexOf("cx") > -1) {
    return "cxjs";
  }

  return "create-react-app";
}
