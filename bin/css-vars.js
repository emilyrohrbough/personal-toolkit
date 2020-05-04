const { program } = require('commander');
const { version } = require('../package.json');
const { validateThemes } = require('../scripts/validate-css-vars');

program.version(version)
  .name('theme-var-helper');

program
  .command('validate <modulePath>')
  .description('Validates the css variables in the theme files against the default theme. Outputs any missing vars and has the option to update.')
  .option('-t, --theme <theme-name>', 'theme name to validate')
  .option('--report', 'output report on theme coverage')
  .option('-u, --update', 'update theme files with missing css vars')
  .action((modulePath, { theme, report, update }) => {
    console.log(modulePath, theme, report, update);
    validateThemes({
      modulePath,
      ...theme && { themes: [theme] },
      ...update && { update: true },
    });
  });

program.parse(process.argv);
