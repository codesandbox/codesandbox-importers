import * as acorn from "acorn";
import * as babel from "@babel/core";
import traverse from "@babel/traverse";
import { ImportDeclaration, CallExpression, Literal } from "estree";
const walk = require("acorn/dist/walk");

require("acorn-dynamic-import/lib/inject").default(acorn);
require("acorn-jsx/inject")(acorn);
require("acorn-object-spread/inject")(acorn);

const ECMA_VERSION = 2017;

const config = {
  presets: [require("babel-preset-env"), require("babel-preset-react")],
  plugins: [
    require("babel-plugin-transform-async-to-generator"),
    require("babel-plugin-transform-object-rest-spread"),
    require("babel-plugin-transform-class-properties"),
    require("babel-plugin-transform-decorators-legacy").default,
    require("babel-plugin-dynamic-import-node").default,
  ],
};

export default function exportRequires(code: string) {
  const requires: string[] = [];
  try {
    const { ast } = babel.transformSync(code, config)!;

    if (ast) {
      traverse(ast, {
        enter(path: any) {
          if (
            path.node.type === "CallExpression" &&
            path.node.callee.name === "require" &&
            path.node.arguments[0]
          ) {
            if (path.node.arguments[0].type === "StringLiteral") {
              requires.push(path.node.arguments[0].value);
            }
          }
        },
      });
    }
  } catch (e) {
    console.error(e);
  }

  return requires;
}
