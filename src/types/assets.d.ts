/** Metro 에셋 임포트 타입 — 폰트 등 정적 에셋을 require 대신 import로 불러온다. */
declare module '*.ttf' {
  const asset: number;
  export default asset;
}

declare module '*.otf' {
  const asset: number;
  export default asset;
}
