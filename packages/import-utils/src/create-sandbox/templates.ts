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

  if (template === "next") {
    // Wildcard, because next is not specific on this
    return "package.json";
  }

  if (template === "apollo") {
    // Wildcard, because apollo is not specific on this
    return "package.json";
  }

  if (template === "reason") {
    // Wildcard, because reason is not specific on this
    return "package.json";
  }

  if (template === "sapper") {
    // Wildcard, because sapper is not specific on this
    return "package.json";
  }

  if(template === "nest") {
    return "src/main.ts"
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
): ITemplate | undefined {
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

  if (
    totalDependencies.indexOf("nuxt") > -1 ||
    totalDependencies.indexOf("nuxt-edge") > -1
  ) {
    return "nuxt";
  }

  if (totalDependencies.indexOf("next") > -1) {
    return "next";
  }

  if (totalDependencies.indexOf("apollo-server") > -1) {
    return "apollo";
  }

  if (totalDependencies.indexOf("sapper") > -1) {
    return "sapper";
  }

  const moduleNames = Object.keys(modules);
  if (moduleNames.some(m => m.endsWith(".vue"))) {
    return "vue-cli";
  }

  if (moduleNames.some(m => m.endsWith(".re"))) {
    return "reason";
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

  if (
    totalDependencies.indexOf("@dojo/core") > -1 ||
    totalDependencies.indexOf("@dojo/framework") > -1
  ) {
    return "@dojo/cli-create-app";
  }

  if (totalDependencies.indexOf("cx") > -1) {
    return "cxjs";
  }

  if(
    totalDependencies.indexOf("@nestjs/core") > -1 ||
    totalDependencies.indexOf("@nestjs/common") > -1
  )  {
    return "nest"
  }

  return undefined;
}
