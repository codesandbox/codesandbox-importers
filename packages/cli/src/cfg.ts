import { homedir } from "os";

import * as fs from "fs-extra";
import * as path from "path";

import * as api from "./utils/api";
import { error } from "./utils/log";
import { IS_STAGING } from "./utils/env";

// tslint:disable no-var-requires
const ms = require("ms");
const TTL = ms("8h");

export interface IUser {
  avatar_url: string;
  email: string;
  id: string;
  name: string;
  username: string;
  jwt: string;
}

export interface IConfig {
  [key: string]: any | undefined;
  lastUpdate?: number;
  user?: IUser;
}

const CONFIG_NAME = IS_STAGING
  ? ".codesandbox-staging.json"
  : ".codesandbox.json";

const file = process.env.CODESANDBOX_JSON
  ? path.resolve(process.env.CODESANDBOX_JSON)
  : path.resolve(homedir(), CONFIG_NAME);

/**
 * Save config file
 *
 * @param {Object} data data to save
 */
async function save(data: object) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

/**
 * Load and parse config file
 */
export async function read(): Promise<IConfig> {
  let existing: IConfig = {};
  try {
    const fileData = await (fs.readFile(file, "utf8") as Promise<string>);
    existing = JSON.parse(fileData);
  } catch (err) {
    /* Do nothing */
  }

  if (!existing.token) {
    return {};
  }

  if (!existing.lastUpdate || Date.now() - existing.lastUpdate > TTL) {
    const token = existing.token;
    try {
      const user = await api.fetchUser(token);

      if (user) {
        existing = { ...existing, user, lastUpdate: Date.now() };

        await save(existing);
      } else {
        await deleteUser();
      }
    } catch (e) {
      error("Could not authorize the user.");
      await deleteUser();
    }
  }

  return existing;
}

// Removes a key from the config and store the result
export async function remove(key: string) {
  const cfg = await read();
  if (key in cfg) {
    delete cfg[key];
  }
  await fs.writeFile(file, JSON.stringify(cfg, null, 2));
}

/**
 * Merge the given data in the current config
 * @param data
 */
export async function merge(data: object) {
  const oldConfig = await read();
  const cfg = { ...oldConfig, ...data };
  await save(cfg);

  return cfg;
}

/**
 * Delete given user from config
 *
 * @export
 */
export async function deleteUser() {
  await save({});
}

/**
 * Save specific user in state
 *
 * @export
 * @param {User} user
 * @returns
 */
export function saveUser(token: string, user: IUser) {
  return merge({ user, token, lastUpdate: Date.now() });
}

/**
 * Gets user from config
 *
 * @export
 * @returns
 */
export async function getUser(): Promise<IUser | undefined> {
  const cfg = await read();
  return cfg.user;
}

export async function getToken(): Promise<string | undefined> {
  const cfg = await read();
  return cfg.token;
}

export const removeFile = async () => fs.remove(file);
