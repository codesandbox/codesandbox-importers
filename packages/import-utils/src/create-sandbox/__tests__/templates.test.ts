import { getTemplate } from "../templates";

describe("template detection", () => {
  it("detects a react template", () => {
    expect(
      getTemplate(
        {
          dependencies: {},
          devDependencies: {
            "react-scripts": "latest",
          },
        },
        {}
      )
    ).toEqual("create-react-app");
  });

  it("detects a react template from forked create-react-app", () => {
    expect(
      getTemplate(
        {
          dependencies: {},
          devDependencies: {
            "@fork/react-scripts": "latest",
          },
        },
        {}
      )
    ).toEqual("create-react-app");
  });

  it("detects a nuxt template", () => {
    expect(
      getTemplate(
        {
          dependencies: {},
          devDependencies: {
            nuxt: "latest",
          },
        },
        {}
      )
    ).toEqual("nuxt");
  });

  it("detects a nuxt template when using nuxt3", () => {
    expect(
      getTemplate(
        {
          dependencies: {},
          devDependencies: {
            nuxt3: "latest",
          },
        },
        {}
      )
    ).toEqual("nuxt");
  });

  it("detects an apollo template", () => {
    expect(
      getTemplate(
        {
          dependencies: {},
          devDependencies: {
            "apollo-server": "latest",
          },
        },
        {}
      )
    ).toEqual("apollo");
  });
});
