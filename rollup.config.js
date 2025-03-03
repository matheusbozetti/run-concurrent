import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/cjs/index.cjs",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "./dist/esm/index.mjs",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [resolve(), typescript({ tsconfig: "./tsconfig.json" })],
  },
];
