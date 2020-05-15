const commander = require('commander');
const packageJson = require('../package.json');
const { analyzeScreenshots } = require('./screenshots');
const { validateThemes } = require('./css-vars');

commander
  .version(packageJson.version);

commander
  .command('screenshots <dir> [otherDirs...]')
  .description('\n   Tool to help update screenshots for wdio run. This will check for screenshot updates and stale screenshots that need to be removed.\n\n   Default search pattern is as follows:\n\n      dir/**/__snapshots__/reference/**')
  .option('-t, --theme [theme]', 'use to add theme to search regex pattern', undefined)
  .option('-l, --locale [locale]', 'use to add locale to search regex pattern', 'en')
  .option('-b, --browser [browser]', 'use to add browser to search regex pattern')
  .option('-f, --formFactor [formFactor]>', 'use to add form factor to search regex pattern', undefined)
  .option('-u, --update', 'use to copy all latest screenshots to reference dir if a diff screenshot exists')
  .option('--removeStale', 'use to remove all stale screenshots from reference dir')
  .action((dir, otherDirs, cmdOpts) => {
    const {
      browser,
      formFactor,
      locale,
      removeStale,
      theme,
      update,
    } = cmdOpts;

    analyzeScreenshots({
      screenshotDirs: [dir].concat(otherDirs),
      browser,
      formFactor,
      locale,
      removeStale,
      theme,
      update,
    });
  });

commander
  .command('styles <modulePath>')
  .description('Validates the css variables in the theme files against the default theme. Outputs any missing vars and has the option to update.')
  .option('-t, --theme <theme-name>', 'theme name to validate')
  .option('--report', 'output report on theme coverage')
  .option('-u, --update', 'update theme files with missing css vars')
  .action((modulePath, { theme, report, update }) => {
    validateThemes({
      modulePath,
      ...theme && { themes: [theme] },
      ...update && { update: true },
      ...report && { report: true },
    });
  });

commander.parse(process.argv);
