import { build } from 'esbuild';

build({
  entryPoints: ['src/index.jsx'],
  bundle: true,
  minify: true,
  outfile: 'www/bundle.js',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.js': 'jsx' },
}).then(() => {
  console.log('Bundle listo.');
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
