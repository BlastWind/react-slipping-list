import sass from 'rollup-plugin-sass'
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import external from 'rollup-plugin-peer-deps-external'
import visualizer from 'rollup-plugin-visualizer'

import pkg from "./package.json"

// continued
export default {
  input: 'src/index.js',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
      strict: false
    }
  ],
  plugins: [
    sass({ insert: true }),
    peerDepsExternal(), resolve(), babel({ exclude: 'node_modules/**' }), commonjs(), external(), visualizer()
  ],
  external: ['react', 'react-dom']
}