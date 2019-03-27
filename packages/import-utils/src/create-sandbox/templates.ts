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

  if (template === "styleguidist") {
    // Wildcard, because styleguidist is not specific on this
    return "package.json";
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

  if (template === "nest") {
    return "src/main.ts";
  }

  if (template === "static") {
    return "index.html";
  }

  if (template === "mdx-deck") {
    return "deck.mdx";
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

  if (totalDependencies.indexOf("ember-cli") > -1) {
    return "ember";
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

  if (totalDependencies.indexOf("react-styleguidist") > -1) {
    return "styleguidist";
  }

  const parcel = ["parcel-bundler", "parcel"];
  if (totalDependencies.some(dep => parcel.indexOf(dep) > -1)) {
    return "parcel";
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

  if (totalDependencies.indexOf("mdx-deck") > -1) {
    return "mdx-deck";
  }

  const dojo = ["@dojo/core", "@dojo/framework"];

  if (totalDependencies.some(dep => dojo.indexOf(dep) > -1)) {
    return "@dojo/cli-create-app";
  }

  if (totalDependencies.indexOf("cx") > -1) {
    return "cxjs";
  }

  if (
    totalDependencies.indexOf("@nestjs/core") > -1 ||
    totalDependencies.indexOf("@nestjs/common") > -1
  ) {
    return "nest";
  }

  return undefined;
}
