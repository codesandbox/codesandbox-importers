import { INormalizedModules } from "codesandbox-import-util-types";
import { ITemplate } from "codesandbox-import-util-types";

export function getMainFile(template: ITemplate) {
  switch (template) {
    case "vue-cli":
      return "src/main.js";
    case "angular-cli":
      return "src/main.ts";
    case "create-react-app-typescript":
      return "src/main.tsx";
    case "parcel":
    case "static":
      return "index.html";
    case "gatsby":
      return "src/pages/index.js";
    case "gridsome":
      return "src/pages/Index.vue";
    case "mdx-deck":
      return "deck.mdx";

    case "styleguidist":
    case "nuxt":
    case "next":
    case "apollo":
    case "reason":
    case "sapper":
    case "nest":
    case "vuepress":
    case "styleguidist":
      return "package.json";
    default:
      return "src/index.js";
  }
}

const SANDBOX_CONFIG = "sandbox.config.json";

export function getTemplate(
  packageJSONPackage: {
    dependencies: { [key: string]: string };
    devDependencies: { [key: string]: string };
  },
  modules: INormalizedModules
): ITemplate | undefined {
  const sandboxConfig =
    modules[SANDBOX_CONFIG] || modules[`/${SANDBOX_CONFIG}`];
  if (sandboxConfig && sandboxConfig.type !== "directory") {
    try {
      const config = JSON.parse(sandboxConfig.content);

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
  const moduleNames = Object.keys(modules);

  const nuxt = ["nuxt", "nuxt-edge", "nuxt-ts", "nuxt-ts-edge"];

  if (totalDependencies.some(dep => nuxt.indexOf(dep) > -1)) {
    return "nuxt";
  }

  if (totalDependencies.indexOf("next") > -1) {
    return "next";
  }

  const apollo = [
    "apollo-server",
    "apollo-server-express",
    "apollo-server-hapi",
    "apollo-server-koa",
    "apollo-server-lambda",
    "apollo-server-micro"
  ];

  if (totalDependencies.some(dep => apollo.indexOf(dep) > -1)) {
    return "apollo";
  }

  if (totalDependencies.indexOf("mdx-deck") > -1) {
    return "mdx-deck";
  }

  if (totalDependencies.indexOf("gridsome") > -1) {
    return "gridsome";
  }

  if (totalDependencies.indexOf("vuepress") > -1) {
    return "vuepress";
  }

  if (totalDependencies.indexOf("ember-cli") > -1) {
    return "ember";
  }

  if (totalDependencies.indexOf("sapper") > -1) {
    return "sapper";
  }

  if (totalDependencies.indexOf("gatsby") > -1) {
    return "gatsby";
  }

  // CLIENT

  if (moduleNames.some(m => m.endsWith(".re"))) {
    return "reason";
  }

  const parcel = ["parcel-bundler", "parcel"];
  if (totalDependencies.some(dep => parcel.indexOf(dep) > -1)) {
    return "parcel";
  }

  const dojo = ["@dojo/core", "@dojo/framework"];
  if (totalDependencies.some(dep => dojo.indexOf(dep) > -1)) {
    return "@dojo/cli-create-app";
  }
  if (
    totalDependencies.indexOf("@nestjs/core") > -1 ||
    totalDependencies.indexOf("@nestjs/common") > -1
  ) {
    return "nest";
  }

  if (totalDependencies.indexOf("react-styleguidist") > -1) {
    return "styleguidist";
  }

  if (totalDependencies.indexOf("react-scripts") > -1) {
    return "create-react-app";
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

  if (totalDependencies.indexOf("cx") > -1) {
    return "cxjs";
  }

  const nodeDeps = ["express", "koa"];
  if (totalDependencies.some(dep => nodeDeps.indexOf(dep) > -1)) {
    return "node";
  }

  return undefined;
}
