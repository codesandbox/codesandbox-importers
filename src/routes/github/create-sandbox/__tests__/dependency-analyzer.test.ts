import getDependencies from '../dependency-analyzer';

const CODE = `
import React from "react"
import ReactDOM from "react-dom"
import { Provider } from "mobx-react"
import { observable, reaction } from "mobx"
import { onSnapshot, onAction, onPatch, applySnapshot, applyAction, applyPatch, getSnapshot } from "mobx-state-tree"
import "todomvc-app-css/index.css"
importoijaa from 'dawpoefk';
import createRouter from "./utils/router"
import App from "./components/App"
import SingleQuote from 'singlquote'
import "./index.css"

import { ShopStore } from "./stores/ShopStore"

require('test')

connectReduxDevtools(require("remotedev"), store)
`;

describe('dependency-analyzer', () => {
  it('can detect dependencies in the code', () => {
    const file = {
      title: '',
      code: CODE,
    };
    expect(getDependencies([file])).toMatchSnapshot();
  });

  it('can detect from multiple files', () => {
    const file = {
      title: '',
      code: CODE,
    };
    expect(getDependencies([file, file])).toMatchSnapshot();
  });
});
