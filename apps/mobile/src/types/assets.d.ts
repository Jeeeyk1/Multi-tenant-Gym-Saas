// Metro resolves bundled images to an asset id (a number) that <Image source> accepts.
declare module '*.png' {
  const asset: number;
  export default asset;
}
