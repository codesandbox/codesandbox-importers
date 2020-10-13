import { Context } from "koa";
import createSandbox from "codesandbox-import-utils/lib/create-sandbox";
import { INormalizedModules, IModule } from "codesandbox-import-util-types";

export const createSandboxFromDefine = async (files: any) => {
  const normalizedFiles: INormalizedModules = files
    .map((file: IModule & { path: string }) => {
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
      (total: INormalizedModules, next: IModule & { path: string }) => ({
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

export const define = async (ctx: Context, next: () => Promise<any>) => {
  const { files } = ctx.request.body;

  const sandbox = await createSandboxFromDefine(files);
  ctx.body = {
    sandbox,
  };
};
