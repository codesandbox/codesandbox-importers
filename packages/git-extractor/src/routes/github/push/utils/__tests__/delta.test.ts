import { INormalizedModules } from "codesandbox-import-util-types";
import getDelta from "../delta";

describe("commit", () => {
  describe("delta", () => {
    const SAMPLE_TREE = [
      {
        path: "src/App.css",
        mode: "100644",
        type: "blob",
        sha: "15adfdc710ca89d2c427dcbb6716943e1029c73a",
        size: 341,
        url:
          "https://api.github.com/repos/CompuIves/codesandbox-test-git-app/git/blobs/15adfdc710ca89d2c427dcbb6716943e1029c73a",
      },
      {
        path: "src/App.js",
        mode: "100644",
        type: "blob",
        sha: "d7d52a7f38a321668d4fa83409a7c47d1bfccd7c",
        size: 496,
        url:
          "https://api.github.com/repos/CompuIves/codesandbox-test-git-app/git/blobs/d7d52a7f38a321668d4fa83409a7c47d1bfccd7c",
      },
    ];

    const SAMPLE_MODULES: INormalizedModules = {
      "src/App.css": {
        content: `.App {
  text-align: center;
}

.App-logo {
  animation: App-logo-spin infinite 20s linear;
  height: 80px;
}

.App-header {
  background-color: #222;
  height: 150px;
  padding: 20px;
  color: white;
}

.App-intro {
  font-size: large;
}

@keyframes App-logo-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`,
        isBinary: false,
      },
      "src/App.js": {
        content: `import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React</h2>
        </div>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
`,
        isBinary: false,
      },
    };

    it("detects no change", () => {
      expect(getDelta(SAMPLE_TREE, SAMPLE_MODULES)).toEqual({
        added: [],
        deleted: [],
        modified: [],
      });
    });

    it("detects added files", () => {
      const newModules = {
        ...SAMPLE_MODULES,
        "test.js": { content: "Hey", isBinary: false },
      };

      expect(getDelta(SAMPLE_TREE, newModules)).toEqual({
        added: ["test.js"],
        deleted: [],
        modified: [],
      });
    });

    it("detects modified files", () => {
      const newModules = {
        ...SAMPLE_MODULES,
        "src/App.js": { content: "Hey", isBinary: false },
      };

      expect(getDelta(SAMPLE_TREE, newModules)).toEqual({
        added: [],
        deleted: [],
        modified: ["src/App.js"],
      });
    });

    it("detects deleted files", () => {
      const newModules = {
        ...SAMPLE_MODULES,
        "src/App.js": null,
      };

      expect(getDelta(SAMPLE_TREE, newModules)).toEqual({
        added: [],
        deleted: ["src/App.js"],
        modified: [],
      });
    });
  });
});
