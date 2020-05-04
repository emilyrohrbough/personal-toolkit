const fs = require('fs');
const path = require('path');
const glob = require('glob');

const REGEX = new RegExp(/(@include terra-inline-svg-var\(){0,1}'{0,1}'{0,1}--terra-[a-z]+([a-z0-9-]+[a-z0-9]+)?'{0,1}((:|,) ([#."=':/><,A-Za-z0-9-()\s]+);){0,1}/, 'g');

const VAR_REGEX = new RegExp(/--terra-[a-z]+([a-z0-9-]+[a-z0-9]+)?/, 'g');
const INLINE_SVG = 'inline-svg(';
const INLINE_SVG_MIXIN = '@include terra-inline-svg-var(';
const MIXIN_IMPORT = '@import \'~terra-mixins/lib/Mixins\';\n';

const THEMES = [
  'orion-fusion-theme',
  'clinical-lowlight-theme',
];

const getDefaultSCSSFiles = modulePath => glob.sync(`${modulePath}/src/*.module.scss`);
const getThemeFiles = (modulePath, theme) => glob.sync(`${modulePath}/src/${theme}/*.module.scss`);
const getDeprecatedThemeFiles = (modulePath, theme) => glob.sync(`${modulePath}/themes/${theme}/*.scss`);

const fixParentheses = (cssValue) => {
  const openPar = cssValue.match(new RegExp(/\(/, 'g')) || [];
  const closePar = cssValue.match(new RegExp(/\)/, 'g')) || [];

  if (openPar.length < closePar.length) {
    return fixParentheses(cssValue.replace(')', ''));
  }
  if (openPar.length > closePar.length) {
    return fixParentheses(cssValue.replace('(', ''));
  }
  return cssValue;
};

const extractVars = (filePath) => {
  const file = fs.readFileSync(filePath, { encoding: 'UTF-8' });
  const varValuePairs = file.match(REGEX);
  const themeVars = {};

  varValuePairs.forEach((varValuePair) => {
    const cssVar = varValuePair.match(VAR_REGEX)[0];
    const cssValueStartIndex = varValuePair.indexOf(cssVar) + cssVar.length + 2; // ignore the separator + space OR ' + separator
    const varValuePairLength = varValuePair.length - 1;

    let cssValue = varValuePair.slice(cssValueStartIndex, varValuePairLength).trim();

    if (varValuePair.includes(INLINE_SVG_MIXIN)) {
      cssValue = `inline-svg(${cssValue}`;
    }
    cssValue = fixParentheses(cssValue);
    themeVars[cssVar] = cssValue;
  });

  return themeVars;
};

const getThemeVars = (scssFiles) => {
  const result = {};

  scssFiles.forEach((filePath) => {
    const themeVars = extractVars(filePath);
    result[path.parse(filePath).name] = themeVars;
  });

  return result;
};

const updateThemeVariables = (currentVars, overrideVars) => {
  const vars = currentVars;
  const usedVars = [];

  Object.entries(overrideVars).forEach(([variable, value]) => {
    if (vars[variable] !== undefined || vars[variable] !== '') {
      vars[variable] = value;
      usedVars.push(variable);
    }
  });

  return { vars, usedVars };
};

const formatThemeVarForOutput = (variable, value, content, endContent) => {
  let message = content;
  let endMessage = endContent;

  if (value.includes(INLINE_SVG)) {
    const updatedValue = value.substring(INLINE_SVG.length, value.length - 1);
    endMessage = `${endMessage}\n    ${INLINE_SVG_MIXIN}'${variable}', ${updatedValue});`;
  } else if (value === '') {
    message = `${content}\n    // ${variable}`;
  } else {
    message = `${content}\n    ${variable}: ${value};`;
  }
  return { message, endMessage };
};

const writeThemeFile = (defaultThemeFilePath, theme, themeVars) => {
  const { dir, base } = path.parse(defaultThemeFilePath);
  const outputPath = path.resolve(dir, theme, base);

  if (!fs.existsSync(path.resolve(dir, theme))) {
    fs.mkdirSync(path.resolve(dir, theme));
  }
  let content = '';
  let endContent = '';

  let startContent = `:local {\n  .${theme} {`;

  Object.entries(themeVars).forEach(([variable, value]) => {
    const { message, endMessage } = formatThemeVarForOutput(variable, value, content, endContent);
    content = message;
    endContent = endMessage;
  });

  if (endContent.length > 0) {
    startContent = `${MIXIN_IMPORT}\n${startContent}`;
    endContent = `\n${endContent}`;
  }
  endContent = `${endContent}\n  }\n}\n`;

  fs.writeFileSync(outputPath, `${startContent}${content}${endContent}`);
};

const tryRemovingThemeDir = (themeDir) => {
  if (fs.existsSync(themeDir) && fs.readdirSync(themeDir).length === 0) {
    fs.rmdirSync(themeDir);
  }
};

const updateDeprecatedFile = (filePath, updatedVars) => {
  if (Object.keys(updatedVars).length === 0) {
    const { dir } = path.parse(filePath);
    fs.unlinkSync(filePath);
    fs.rmdirSync(path.resolve(dir));
    const { dir: themeDir } = path.parse(dir);
    tryRemovingThemeDir(themeDir);
    return;
  }
  const file = fs.readFileSync(filePath, { encoding: 'UTF-8' });

  let content = `${file.split(/{/)[0]}{`;
  Object.entries(updatedVars).forEach(([variable, value]) => {
    content = `${content}\n  ${variable}: ${value};`;
  });
  content = `${content}\n}\n`;

  fs.writeFileSync(filePath, content);
};

const validateTheme = ({
  modulePath,
  defaultSCSSFiles,
  defaultCssVars,
  theme,
  update,
}) => {
  // const modulePath = options.modulePath || './';
  // const { theme } = options;
  // const update = options.update || false;

  if (!theme) {
    return {
      themeVars: {},
      expectedThemeVars: {},
    };
  }

  console.log(modulePath)
  console.log(theme)
  console.log(update)
  console.log(defaultSCSSFiles)
  console.log(defaultVars)
  const deprecatedThemeFiles = getDeprecatedThemeFiles(modulePath, theme);
  const deprecatedThemeVars = getThemeVars(deprecatedThemeFiles)[theme] || {};

  const themeFiles = getThemeFiles(modulePath, theme);
  const actualThemeVars = getThemeVars(themeFiles);
  const expectedThemeVars = getThemeVars(themeFiles);

  defaultSCSSFiles.forEach((filePath) => {
    const fileName = path.parse(filePath).name;

    // if new theme strategy file does not exist, create one with all css vars using default theme value
    if (!themeFiles.some(name => name.match(fileName))) {
      const { vars, usedVars } = updateThemeVariables(defaultCssVars[fileName], deprecatedThemeVars);
      expectedThemeVars[fileName] = vars;
      // remove used vars from the deprecated theme file
      usedVars.forEach((variable) => {
        delete deprecatedThemeVars[variable];
      });
    } else {
      // add any new css vars to the theme with the default value
      const { vars } = updateThemeVariables(defaultCssVars[fileName], actualThemeVars[fileName]);
      expectedThemeVars[fileName] = vars;
    }
    if (update) {
      writeThemeFile(filePath, theme, expectedThemeVars[fileName]);
    }
  });

  if (update && deprecatedThemeFiles[0]) {
    updateDeprecatedFile(deprecatedThemeFiles[0], deprecatedThemeVars);
  }

  return {
    themeVars: actualThemeVars,
    expectedThemeVars: actualThemeVars,
  };
};

const validateThemes = ((options) => {
  const modulePath = options.modulePath || './';
  const themes = options.themes || THEMES;
  const update = options.update || false;

  const defaultSCSSFiles = getDefaultSCSSFiles(modulePath);
  const defaultCssVars = getThemeVars(defaultSCSSFiles);

  // console.log(defaultSCSSFiles)
  // console.log('modulePaht', modulePath, 'themes', themes, 'update', update)
  themes.forEach(theme => validateTheme({
    modulePath, theme, update, defaultSCSSFiles, defaultCssVars,
  }));
});

// console.log(validateTheme('./', 'orion-fusion-theme'));
// console.log(validateThemes('terra-dialog-modal'))
exports.validateTheme = validateTheme;
exports.validateThemes = validateThemes;