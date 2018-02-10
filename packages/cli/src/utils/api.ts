import axios, { AxiosRequestConfig } from 'axios';
import { values } from 'lodash';

import { getToken } from '../cfg';
import {
  ISandboxDirectory,
  ISandboxModule,
} from '../utils/parse-sandbox/file-mapper';
import { CREATE_SANDBOX_URL, GET_USER_URL, verifyUserTokenUrl } from './url';

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

export async function uploadSandbox(
  modules: ISandboxModule[],
  directories: ISandboxDirectory[],
  externalResources: string[],
  dependencies: { [name: string]: string }
) {
  const token = await getToken();

  if (token == null) {
    throw new Error("You're not signed in");
  }

  const sandbox = {
    directories,
    external_resources: externalResources,
    from_cli: true,
    modules,
    npm_dependencies: dependencies,
  };

  const options: AxiosRequestConfig = {
    data: {
      sandbox,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'POST',
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
    method: 'GET',
    url: GET_USER_URL,
  };

  return callApi(options);
}

export async function verifyUser(token: string) {
  const options: AxiosRequestConfig = {
    method: 'GET',
    url: verifyUserTokenUrl(token),
  };

  return callApi(options);
}
