import { IS_STAGING } from "./env";

export const BASE_URL = IS_STAGING
  ? "https://codesandbox.stream"
  : "https://codesandbox.io";

export const CREATE_SANDBOX_URL = BASE_URL + "/api/v1/sandboxes";
export const CREATE_UPLOAD_URL =
  BASE_URL + "/api/v1/users/current_user/uploads";
export const GET_USER_URL = BASE_URL + "/api/v1/users/current";
export const LOGIN_URL = BASE_URL + "/cli/login";

const VERIFY_USER_TOKEN_URL = BASE_URL + "/api/v1/auth/verify/";
export const verifyUserTokenUrl = (token: string) =>
  VERIFY_USER_TOKEN_URL + token;

export const createSandboxUrl = (sandbox: { id: string }) =>
  BASE_URL + "/s/" + sandbox.id;
