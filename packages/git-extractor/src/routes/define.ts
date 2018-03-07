import { Context } from 'koa';
import createSandbox from '@codesandbox/import-utils/lib/create-sandbox';
import { INormalizedModules, IModule } from '../utils/sandbox/normalize';

export const define = async (ctx: Context, next: () => Promise<any>) => {
  const { files } = ctx.request.body;

  const normalizedFiles: INormalizedModules = files
    .map((file: IModule) => {
      if (typeof file.content === 'object') {
        return { ...file, content: JSON.stringify(file.content, null, 2) };
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

  const sandbox = await createSandbox(normalizedFiles);

  ctx.body = {
    sandbox,
  };
};
