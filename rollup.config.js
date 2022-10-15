import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import typescript from 'rollup-plugin-typescript2'
import filesize from 'rollup-plugin-filesize'

const isProduction = process.env.NODE_ENV === 'production'

export default async () => {
  const result = {
    input: `./src/index.ts`,
    output: [
      {
        file: 'dist/browserprint-es.js',
        format: 'es',
        sourcemap: false,
      },
    ],
    context: 'window',
    plugins: [
      json(),
      resolve(),
      typescript({
        clean: true,
        useTsconfigDeclarationDir: true,
        abortOnError: true,
      }),
    ],
  }
  // console.log(`rollup config:\n -> external \n${JSON.stringify(result.external)}\n ->${JSON.stringify(result.output)}`);
  return result
}