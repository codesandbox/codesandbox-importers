import axios, { AxiosRequestConfig } from "axios";
import { ISandbox } from "codesandbox-import-util-types";
import { values } from "lodash";
import { decamelizeKeys } from "humps";

import { getToken } from "../cfg";
import {
  CREATE_SANDBOX_URL,
  GET_USER_URL,
  verifyUserTokenUrl,
  CREATE_UPLOAD_URL,
} from "./url";

// tslint:disable-next-line:no-var-requires
const DatauriParser = require("datauri/parser");

const callApi = async (options: AxiosRequestConfig) => {
  try {
    const response = await axios(options);
    return response.data.data;
  } catch (e) {
    if (e.response && e.response.data && e.response.data.errors) {
      e.message = values(e.response.data.errors)[0];
    }
    throw e;
  }
};

export async function uploadSandbox(sandbox: ISandbox) {
  const token = await getToken();

  if (token == null) {
    throw new Error("You're not signed in");
  }

  const sandboxData = {
    ...decamelizeKeys(sandbox),
    from_cli: true,
  };

  const options: AxiosRequestConfig = {
    data: {
      sandbox: sandboxData,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
    url: CREATE_SANDBOX_URL,
  };

  return callApi(options);
}

export async function fetchUser(token: string) {
  const Authorization = `Bearer ${token}`;
  const options: AxiosRequestConfig = {
    headers: {
      Authorization,
    },
    method: "GET",
    url: GET_USER_URL,
  };

  return callApi(options);
}

export async function verifyUser(token: string) {
  const options: AxiosRequestConfig = {
    method: "GET",
    url: verifyUserTokenUrl(token),
  };

  return callApi(options);
}

export async function createUpload(filename: string, buffer: Buffer) {
  const parser = new DatauriParser();

  parser.format(filename, buffer);
  const uri = parser.content;

  const token = await getToken();

  if (token == null) {
    throw new Error("You're not signed in");
  }

  const options: AxiosRequestConfig = {
    data: {
      name: filename,
      content: uri,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
    url: CREATE_UPLOAD_URL,
  };

  return callApi(options);
}
