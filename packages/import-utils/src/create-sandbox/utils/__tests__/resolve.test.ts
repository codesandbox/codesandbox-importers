import { getDirectoryPaths } from "../resolve";

describe("resolve", () => {
  describe("getDirectoryPaths", () => {
    it("can resolve dir paths", () => {
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
      ];

      expect(getDirectoryPaths(existingDirs)).toMatchSnapshot();
    });
  });
});
