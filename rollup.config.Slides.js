import svelte from 'rollup-plugin-svelte'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'

const production = !process.env.ROLLUP_WATCH

const cmp = 'slides';

export default {
	input: `src/lib/components/${cmp}.js`,

	output: {
		format: 'es',
		file: `static/js/${cmp}.js`,
		sourcemap: true,
	},

	plugins: [
		svelte({
			emitCss: false,
			compilerOptions: {
				dev: !production,
			},
		}),
		resolve({
			browser: true,
			dedupe: ['svelte'],
		}),
		commonjs(),
	],
}
