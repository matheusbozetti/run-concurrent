import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/cjs/index.cjs",
        format: "cjs",
        sourcemap: false,
      },
      {
        file: "./dist/esm/index.mjs",
        format: "esm",
        sourcemap: false,
      },
    ],
    plugins: [
      resolve(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "./dist/esm",
        exclude: ["src/**/*.spec.ts"],
      }),
    ],
  },
];
