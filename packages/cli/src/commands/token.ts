import * as cfg from "../cfg";

// TYPES
import * as Commander from "commander";

export default function registerToken(program: typeof Commander) {
  program
    .command("token")
    .description("get your login token to CodeSandbox")
    .action(async () => {
      const token = await cfg.getToken();

      if (token === undefined) {
        process.exit(1);
      }

      console.log(token);
    });
}
