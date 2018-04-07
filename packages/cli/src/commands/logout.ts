import * as Commander from "commander";

import { deleteUser, getUser } from "../cfg";
import confirm from "../utils/confirm";
import { error, info } from "../utils/log";

export default function registerCLI(program: typeof Commander) {
  program
    .command("logout")
    .description("sign out from CodeSandbox")
    .action(async () => {
      const user = await getUser();
      if (user) {
        const confirmed = await confirm("Are you sure you want to log out?");

        if (confirmed) {
          await deleteUser();
          info("Succesfully logged out");
        }
      } else {
        error("You are already signed out");
      }
    });
}
