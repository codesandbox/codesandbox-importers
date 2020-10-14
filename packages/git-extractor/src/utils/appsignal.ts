import { Appsignal } from "@appsignal/nodejs";

export const appsignal = new Appsignal({
  active: process.env.NODE_ENV === "production",
  name: "Importers",
  environment: String(process.env.ENVIRONMENT),
});
