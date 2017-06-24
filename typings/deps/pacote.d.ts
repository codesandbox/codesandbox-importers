declare module 'pacote' {
  export declare function manifest(
    dependency: string,
  ): Promise<{ [key: string]: string }>;
}
