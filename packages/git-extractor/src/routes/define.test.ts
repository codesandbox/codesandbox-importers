import { createSandboxFromDefine } from "./define";

it("can infer title and description", async () => {
  const payload = [
    {
      path: "package.json",
      content: JSON.stringify({
        title: "test",
        description: "test description",
        dependencies: {},
      }),
      isBinary: false,
    },
  ];

  const result = await createSandboxFromDefine(payload);

  expect(result.title).toBe("test");
  expect(result.description).toBe("test description");
});

it("works with leading slashes", async () => {
  const payload = [
    {
      path: "/package.json",
      content: JSON.stringify({
        title: "test",
        description: "test description",
        dependencies: {},
      }),
      isBinary: false,
    },
  ];

  const result = await createSandboxFromDefine(payload);

  expect(result.title).toBe("test");
  expect(result.description).toBe("test description");
});
