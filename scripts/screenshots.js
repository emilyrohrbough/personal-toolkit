const fs = require('fs-extra');
const glob = require('glob');

const analyzeScreenshots = ({
  browser,
  formFactor,
  locale,
  theme,
  removeStale,
  screenshotDirs,
  update,
}) => {
  const themePattern = theme ? `${theme}/` : '';
  const localePattern = locale ? `${locale}/` : '';
  const browserPattern = browser ? `${browser}` : '*';
  let formFactorPattern = '';
  if (formFactor) {
    formFactorPattern = `${browserPattern}_${formFactor}/`;
  } else if (browser) {
    formFactorPattern = `${browserPattern}_*/`;
  }

  const searchPatterns = screenshotDirs.map(dir => `${dir}/**/__snapshots__/reference/${themePattern}${localePattern}${formFactorPattern}**`);

  let referenceScreenshots = [];
  searchPatterns.forEach(pattern => {
    const matches = glob.sync(pattern, { nodir: true, ignore: '**/node_modules/**' });
    referenceScreenshots = referenceScreenshots.concat(matches);
  });

  if (!referenceScreenshots.length) {
    console.log('No reference screenshots found with: ', searchPatterns);
    return;
  }

  const updatedScreenshots = [];
  const staleScreenshots = [];
  const diffScreenshots = [];
  /**
   * Find all Reference screenshots. Check for stale screenshots & for diff screenshots.
   * Replace the Reference screenshots with the latest screenshots.
   */
  Promise.all(referenceScreenshots.map((referenceScreenshot) => {
    const latestScreenshot = referenceScreenshot.replace('reference', 'latest');
    const diffScreenshot = referenceScreenshot.replace('reference', 'diff');

    if (!fs.pathExistsSync(latestScreenshot)) {
      staleScreenshots.push(referenceScreenshot);
    } else if (fs.pathExistsSync(diffScreenshot)) {
      diffScreenshots.push(diffScreenshot);
      if (!update) {
        return Promise.resolve();
      }
      return fs.copy(latestScreenshot, referenceScreenshot, { overwrite: true })
        .then(() => {
          updatedScreenshots.push(referenceScreenshot);
          return fs.unlink(diffScreenshot);
        })
        .catch((err) => {
          console.error(`Error during file copy of ${latestScreenshot}`);
          console.error(err);
        });
    }
    return Promise.resolve();
  })).then(() => {
    if (!removeStale) {
      return Promise.resolve();
    }

    return Promise.all(staleScreenshots.map((screenshot) => fs.unlink(screenshot)));
  }).then(() => {
    if (!updatedScreenshots.length && !diffScreenshots.length && !staleScreenshots.length) {
      console.log('\n\u2714 All screenshots look up to date!\n');
    }

    if (update && updatedScreenshots.length) {
      console.log('\n\u2714 Updated screenshots:\n', updatedScreenshots, '\n');
    } else if (!update && diffScreenshots.length) {
      console.log('\n\u2718 Diff screenshots:\n', diffScreenshots, '\n');
    }

    if (staleScreenshots.length) {
      if (removeStale) {
        console.log('\n\u2714 Removes stale screenshots:\n', staleScreenshots, '\n');
      } else {
        console.log('\n\u2718 Stale screenshots --> clean up with `-- --removeStale`\n', staleScreenshots, '\n     `');
      }
    }
  });
};

exports.analyzeScreenshots = analyzeScreenshots;
