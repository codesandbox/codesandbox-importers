import { Context } from "koa";
import createSandbox from "codesandbox-import-utils/lib/create-sandbox";
import {
  INormalizedModules,
  IModule,
  ITemplate,
} from "codesandbox-import-util-types";

export const createSandboxFromDefine = async (
  files: Array<IModule & { path: string }>
) => {
  const normalizedFiles: INormalizedModules = files
    .map((file) => {
      if (file.path[0] === "/") {
        // Remove the leading slash
        const p = file.path.split("");
        p.shift();
        file.path = p.join("");
      }

      if (typeof file.content === "object") {
        file.content = JSON.stringify(file.content, null, 2);
      }

      return file;
    })
    .reduce(
      (total: INormalizedModules, next) => ({
        ...total,
        [next.path]: next,
      }),
      {}
    );

  try {
    const pkg = normalizedFiles["/package.json"];

    if (pkg && pkg.type === "file") {
      const parsed = JSON.parse(pkg.content);
      console.log(
        `Creating defined sandbox with ${JSON.stringify(
          parsed.dependencies
        )} deps, ${JSON.stringify(parsed.devDependencies)} devDeps.`
      );
    }
  } catch (e) {
    /* nothing */
  }

  return createSandbox(normalizedFiles);
};

export const define = async (ctx: Context, _next: () => Promise<any>) => {
  const { files, template } = ctx.request.body;

  const sandbox = await createSandboxFromDefine(files);

  if (template) {
    sandbox.template = template as ITemplate;
  }

  ctx.body = {
    sandbox,
  };
};
