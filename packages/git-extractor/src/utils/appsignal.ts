import { Appsignal } from "@appsignal/nodejs";

export const appsignal = new Appsignal({
  active: true,
  name: "Importers",
  environment: String(process.env.ENVIRONMENT),
});
