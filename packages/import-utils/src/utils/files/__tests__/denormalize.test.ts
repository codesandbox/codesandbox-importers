import denormalize from "../denormalize";

let count = 0;

jest.mock("shortid", () => ({
  generate: () => "" + count++,
}));

describe("denormalize", () => {
  beforeEach(() => {
    count = 0;
  });

  it("can denormalize", () => {
    const paths = {
      "/index.js": { content: "hello", isBinary: false },
      "/world/index.js": { content: "hello2", isBinary: false },
      "/world/hello/index.js": {
        content: "hello3",
        isBinary: false,
        uploadId: "123",
      },
    };

    expect(denormalize(paths)).toMatchSnapshot();
  });

  it("can denormalize with and without leading slash", () => {
    const paths = {
      "index.js": { content: "hello", isBinary: false },
      "world/index.js": { content: "hello2", isBinary: false },
      "world/hello/index.js": { content: "hello3", isBinary: false },
    };

    const slashPaths = {
      "/index.js": { content: "hello", isBinary: false },
      "/world/index.js": { content: "hello2", isBinary: false },
      "/world/hello/index.js": { content: "hello3", isBinary: false },
    };

    const firstDenormalize = denormalize(paths);
    count = 0;

    const secondDenormalize = denormalize(slashPaths);

    expect(firstDenormalize).toEqual(secondDenormalize);
  });

  it("can filter out existing directories", () => {
    const paths = {
      "index.js": { content: "hello", isBinary: false },
      "world/index.js": { content: "hello2", isBinary: false },
      "world/hello/index.js": { content: "hello3", isBinary: false },
      ".github/ISSUE_TEMPLATES/template.md": {
        content: "hello4",
        isBinary: false,
      },
      ".github/workflows/config.yml": { content: "hello5", isBinary: false },
    };

    const existingDirs = [
      {
        directoryShortid: undefined,
        title: "world",
        shortid: "dir1",
      },
      {
        directoryShortid: "dir1",
        title: "hello",
        shortid: "dir2",
      },
      {
        directoryShortid: undefined,
        title: ".github",
        shortid: "dir3",
      },
      {
        directoryShortid: "dir3",
        title: "ISSUE_TEMPLATES",
        shortid: "dir4",
      },
      {
        directoryShortid: "dir3",
        title: "workflows",
        shortid: "dir5",
      },
    ];

    const denormalized = denormalize(paths, existingDirs);

    expect(denormalized).toMatchSnapshot();
    expect(denormalized.directories).toEqual([]);
  });

  it("can create nested directories", () => {
    const paramFiles = {
      "/src/test/new-file.js": { isBinary: false, content: "" },
    };
    const existingDirs = [
      {
        directoryShortid: null,
        shortid: "rgkK4",
        title: "public",
      },
      {
        directoryShortid: null,
        shortid: "GXOoy",
        title: "src",
      },
    ];
    const denormalized = denormalize(paramFiles, existingDirs);

    expect(denormalized).toMatchSnapshot();
  });

  it("can create only directory", () => {
    const paramFiles: { "/src/test/test2": { type: "directory" } } = {
      "/src/test/test2": { type: "directory" },
    };
    const existingDirs = [
      {
        directoryShortid: null,
        shortid: "rgkK4",
        title: "public",
      },
      {
        directoryShortid: null,
        shortid: "GXOoy",
        title: "src",
      },
    ];
    const denormalized = denormalize(paramFiles, existingDirs);

    expect(denormalized).toMatchSnapshot();
  });
});
