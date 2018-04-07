declare module "*.json" {
  const package: {
    name: string;
    version: string;
  };
  export = package;
}
