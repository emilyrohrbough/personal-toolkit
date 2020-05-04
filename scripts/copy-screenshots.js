const fs = require('fs-extra');
const glob = require('glob');

// const referenceScreenshots = glob.sync(`${process.cwd()}/**/__snapshots__/reference/${program.theme}${program.locale}/**`, { nodir: true, ignore: '**/node_modules/**' });
const referenceScreenshots = glob.sync(`${process.cwd()}/**/__snapshots__/reference/**`, { nodir: true, ignore: '**/node_modules/**' });

const updatedScreenshots = [];
const staleScreenshots = [];
const diffScreenshots = [];

if (!referenceScreenshots.length) {
  console.log('no reference screenshots found.');
}
/**
 * Find all Reference screenshots. Check for stale screenshots & for diff screenshots.
 * Replace the Reference screenshots with the latest screenshots.
 */
Promise.all(referenceScreenshots.map((referenceScreenshot) => {
  const latestScreenshot = referenceScreenshot.replace('reference', 'latest');
  const diffScreenshot = referenceScreenshot.replace('reference', 'diff');
  console.log(latestScreenshot)
  if (!fs.pathExistsSync(latestScreenshot)) {
    staleScreenshots.push(referenceScreenshot);
  } else if (fs.pathExistsSync(diffScreenshot)) {
    diffScreenshots.push(diffScreenshot);
    return fs.copy(latestScreenshot, referenceScreenshot, { overwrite: true })
      .then(() => {
        updatedScreenshots.push(referenceScreenshot);
      })
      .catch((err) => {
        console.error(`Error during file copy of ${latestScreenshot}`);
        console.error(err);
      });
  }
  return Promise.resolve();
})).then(() => {
  console.log('Updated Screenshots', updatedScreenshots, '\n\n');
  console.log('Stale Screenshots', staleScreenshots, '\n\n');
}).then(() => {
  const diffDirectories = glob.sync(`${process.cwd()}/**/__snapshots__/diff`, { ignore: '**/node_modules/**' });

  diffDirectories.forEach(diffDir => fs.emptyDirSync(diffDir));
});
