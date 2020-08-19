import * as inquirer from "inquirer";

export default async function confirm(question: string, defaultNo = false) {
  const { confirmed } = await inquirer.prompt([
    {
      default: !defaultNo,
      message: question,
      name: "confirmed",
      type: "confirm",
    },
  ]);
  return confirmed;
}
