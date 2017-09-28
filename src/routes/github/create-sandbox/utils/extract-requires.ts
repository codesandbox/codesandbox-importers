import * as acorn from 'acorn';
import { ImportDeclaration, CallExpression, Literal } from 'estree';
const walk = require('acorn/dist/walk');

require('acorn-dynamic-import/lib/inject').default(acorn);

const ECMA_VERSION = 2017;

type NewCallExpression = CallExpression & {
  callee: {
    type: 'Import';
    name: string;
  };
};

export default function exportRequires(code: string) {
  const ast = acorn.parse(code, {
    ranges: true,
    locations: true,
    ecmaVersion: ECMA_VERSION,
    sourceType: 'module',
    plugins: {
      dynamicImport: true,
    },
  });

  const requires: string[] = [];

  walk.simple(
    ast,
    {
      ImportDeclaration(node: ImportDeclaration) {
        if (typeof node.source.value === 'string') {
          requires.push(node.source.value);
        }
      },
      CallExpression(node: NewCallExpression) {
        if (
          (node.callee.type === 'Identifier' &&
            node.callee.name === 'require') ||
          node.callee.type === 'Import'
        ) {
          if (
            node.arguments.length === 1 &&
            node.arguments[0].type === 'Literal'
          ) {
            const literalArgument = <Literal>node.arguments[0];
            if (typeof literalArgument.value === 'string') {
              requires.push(literalArgument.value);
            }
          }
        }
      },
    },
    {
      ...walk.base,
      Import: function(node: any, st: any, c: any) {
        // Do nothing
      },
    }
  );

  return requires;
}
