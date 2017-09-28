import getDependencies from '../dependency-analyzer';

const CODE = `
import React from "react"
import ReactDOM from "react-dom"
import { Provider } from "mobx-react"
import { observable, reaction } from "mobx"
import { onSnapshot, onAction, onPatch, applySnapshot, applyAction, applyPatch, getSnapshot } from "mobx-state-tree"
import "todomvc-app-css/index.css"
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

  it('can detect multiline dependencies', () => {
    const file = {
      title: '',
      code: `
      import React from "react";
      import PropTypes from "prop-types";

      import { format } from "d3-format";
      import { timeFormat } from "d3-time-format";

      import {
        Modal,
        Button,
        FormGroup,
        ControlLabel,
        FormControl,
      } from "react-bootstrap";

      import { CandlestickSeries, BarSeries, MACDSeries } from "react-stockcharts/lib/series";
      import { XAxis, YAxis } from "react-stockcharts/lib/axes";
      import {
        CrossHairCursor,
        EdgeIndicator,
        MouseCoordinateY,
        MouseCoordinateX
      } from "react-stockcharts/lib/coordinates";

      import { discontinuousTimeScaleProvider } from "react-stockcharts/lib/scale";
      import { OHLCTooltip, MACDTooltip } from "react-stockcharts/lib/tooltip";
      import { macd } from "react-stockcharts/lib/indicator";

      import { fitWidth } from "react-stockcharts/lib/helper";
      import { InteractiveText, DrawingObjectSelector } from "react-stockcharts/lib/interactive";
      import { getMorePropsForChart } from "react-stockcharts/lib/interactive/utils";
      import { head, last, toObject } from "react-stockcharts/lib/utils";

      `,
    };
    expect(getDependencies([file])).toMatchSnapshot();
  });
});
