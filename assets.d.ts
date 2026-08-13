// Lets TypeScript accept `require('*.png')` (and friends) for bundled Metro
// assets — Metro/babel already handle these as static asset modules at
// bundle time, TS just needs to know the shape of what `require()` returns.
declare module '*.png' {
  const value: number;
  export default value;
}
declare module '*.jpg' {
  const value: number;
  export default value;
}
declare module '*.jpeg' {
  const value: number;
  export default value;
}
