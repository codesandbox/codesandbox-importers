declare module 'pacote' {
  export function manifest(
    dependency: string,
  ): Promise<{ [key: string]: string }>;
}
