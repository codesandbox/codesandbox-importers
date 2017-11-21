import { Context } from 'koa';
import { INormalizedModules, IModule } from '../utils/sandbox/normalize';
import createSandbox from '../utils/sandbox/create-sandbox/index';

export const define = async (ctx: Context, next: () => Promise<any>) => {
  const { files } = ctx.request.body;

  const normalizedFiles: INormalizedModules = files.reduce(
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
