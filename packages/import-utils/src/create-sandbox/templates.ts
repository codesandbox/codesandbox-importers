import { INormalizedModules, ITemplate } from "codesandbox-import-util-types";

export function getMainFile(template: ITemplate) {
  switch (template) {
    case "adonis":
      return "server.js";
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
    case "quasar":
      return "src/pages/Index.vue";

    case "styleguidist":
    case "nuxt":
    case "next":
    case "apollo":
    case "reason":
    case "sapper":
    case "nest":
    case "remix":
    case "vuepress":
    case "styleguidist":
      return "package.json";
    default:
      return "src/index.js";
  }
}

const SANDBOX_CONFIG = "sandbox.config.json";
const TEMPLATE_CONFIG = ".codesandbox/template.json";
const MAX_CLIENT_DEPENDENCY_COUNT = 50;

type Dependencies = { [name: string]: string };
type PackageJSON = {
  dependencies?: Dependencies;
  devDependencies?: Dependencies;
};
export function getTemplate(
  pkg: PackageJSON | null,
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

  const templateConfig =
    modules[TEMPLATE_CONFIG] || modules[`/${TEMPLATE_CONFIG}`];
  if (templateConfig && templateConfig.type !== "directory") {
    try {
      const config = JSON.parse(templateConfig.content);

      if (config.runtime) {
        return config.runtime;
      }
    } catch (e) {}
  }

  if (
    ".codesandbox/Dockerfile" in modules ||
    ".devcontainer/devcontainer.json" in modules
  ) {
    // We should return "cloud" here, once the server supports it.
    return "node";
  }

  if (!pkg) {
    return "static";
  }

  const { dependencies = {}, devDependencies = {} } = pkg;

  const totalDependencies = [
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies),
  ];
  const moduleNames = Object.keys(modules);

  const adonis = ["@adonisjs/framework", "@adonisjs/core"];

  if (totalDependencies.some((dep) => adonis.indexOf(dep) > -1)) {
    return "adonis";
  }

  const nuxt = ["nuxt", "nuxt-edge", "nuxt-ts", "nuxt-ts-edge", "nuxt3"];

  if (totalDependencies.some((dep) => nuxt.indexOf(dep) > -1)) {
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
    "apollo-server-micro",
  ];

  if (totalDependencies.some((dep) => apollo.indexOf(dep) > -1)) {
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

  if (totalDependencies.indexOf("quasar") > -1) {
    return "quasar";
  }

  if (totalDependencies.indexOf("@docusaurus/core") > -1) {
    return "docusaurus";
  }

  if (totalDependencies.indexOf("remix") > -1) {
    return "remix";
  }

  if (totalDependencies.indexOf("astro") > -1) {
    return "node";
  }

  if (totalDependencies.indexOf("vite") > -1) {
    return "node";
  }

  if (totalDependencies.indexOf("vanjs-core") > -1) {
    return "node";
  }

  if (totalDependencies.indexOf("mini-van-plate") > -1) {
    return "node";
  }

  // CLIENT

  if (moduleNames.some((m) => m.endsWith(".re"))) {
    return "reason";
  }

  const parcel = ["parcel-bundler", "parcel"];
  if (totalDependencies.some((dep) => parcel.indexOf(dep) > -1)) {
    return "parcel";
  }

  const dojo = ["@dojo/core", "@dojo/framework"];
  if (totalDependencies.some((dep) => dojo.indexOf(dep) > -1)) {
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

  if (
    totalDependencies.some((dependency) =>
      /^(@[\w-]+\/)?react-scripts$/.test(dependency)
    )
  ) {
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

  if (
    totalDependencies.indexOf("@sveltech/routify") > -1 ||
    totalDependencies.indexOf("@roxi/routify") > -1
  ) {
    return "node";
  }

  if (totalDependencies.indexOf("vite") > -1) {
    if (totalDependencies.indexOf("react-redux") > -1) {
      // Pretty bad hack to ensure that the examples of Redux
      // still run in the old embed: https://github.com/codesandbox/codesandbox-client/issues/8282
      //
      // We should remove this once either:
      // 1. the existing embed works with VMs
      // 2. our new embeds support all query params
      return "create-react-app";
    }

    return "node";
  }

  if (totalDependencies.indexOf("@frontity/core") > -1) {
    return "node";
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

  const nodeDeps = [
    "express",
    "koa",
    "nodemon",
    "ts-node",
    "@tensorflow/tfjs-node",
    "webpack-dev-server",
    "snowpack",
  ];
  if (totalDependencies.some((dep) => nodeDeps.indexOf(dep) > -1)) {
    return "node";
  }

  if (Object.keys(dependencies).length >= MAX_CLIENT_DEPENDENCY_COUNT) {
    // The dependencies are too much for client sandboxes to handle
    return "node";
  }

  return undefined;
}
