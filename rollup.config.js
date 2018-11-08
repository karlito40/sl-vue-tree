import babel from 'rollup-plugin-babel';
import VuePlugin from 'rollup-plugin-vue';
import copy from 'rollup-plugin-copy-glob';

export default {
  external: ['vue'],
  input: './src/sl-vue-tree.vue',
  output: [
    {
      name: 'SlVueTree',
      file: 'dist/sl-vue-tree.umd.js',
      format: 'umd'
    },
    {
      file: 'dist/sl-vue-tree.esm.js',
      format: 'es'
    },
    {
      name: 'SlVueTree',
      file: 'dist/sl-vue-tree.min.js',
      format: 'iife'
    },
  ],
  plugins: [
    VuePlugin(),
    babel({exclude: 'node_modules/**'}),
    copy([
      { files: 'src/*.css', dest: 'dist' },
      { files: 'src/*.d.ts', dest: 'dist' },
    ], { verbose: true })
  ]
};