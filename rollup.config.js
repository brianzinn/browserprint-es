import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import filesize from 'rollup-plugin-filesize'

const extensions = ['.ts']

const babelOptions = {
  babelrc: false,
  extensions,
  exclude: '**/node_modules/**',
  babelHelpers: 'bundled',
  presets: [
    [
      '@babel/preset-env',
      {
        loose: true,
        modules: false,
        targets: '>1%, not dead, not ie 11, not op_mini all',
      },
    ],
    '@babel/preset-typescript',
  ],
}

export default [
  {
    input: `./src/index`,
    output: { file: `dist/browserprint-es.js`, format: 'esm' },
    plugins: [resolve({ extensions }), babel(babelOptions), filesize()],
  },
  {
    input: `./src/index`,
    output: { file: `dist/browserprint-es.cjs.js`, format: 'cjs' },
    plugins: [
      resolve({ extensions }),
      babel(babelOptions),
      filesize(),
    ],
  },
]