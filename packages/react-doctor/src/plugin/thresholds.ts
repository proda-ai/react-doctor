interface RuleOverride {
  files: string[];
  maxLines: number;
}

interface RuleConfig {
  maxLines?: number;
  overrides?: RuleOverride[];
}

type RulesMap = Record<string, RuleConfig | undefined>;

const REGEX_SPECIAL_CHARACTERS = /[.+^${}()|[\]\\]/g;

const compileGlobPattern = (pattern: string): RegExp => {
  const normalizedPattern = pattern.replace(/\\/g, "/").replace(/^\//, "");
  let regexSource = "^";
  let i = 0;

  while (i < normalizedPattern.length) {
    if (normalizedPattern[i] === "*" && normalizedPattern[i + 1] === "*") {
      if (normalizedPattern[i + 2] === "/") {
        regexSource += "(?:.+/)?";
        i += 3;
      } else {
        regexSource += ".*";
        i += 2;
      }
    } else if (normalizedPattern[i] === "*") {
      regexSource += "[^/]*";
      i++;
    } else if (normalizedPattern[i] === "?") {
      regexSource += "[^/]";
      i++;
    } else {
      regexSource += (normalizedPattern[i] as string).replace(REGEX_SPECIAL_CHARACTERS, "\\$&");
      i++;
    }
  }

  regexSource += "$";
  return new RegExp(regexSource);
};

const getRulesMap = (): RulesMap | undefined => {
  try {
    return (globalThis as Record<string, unknown>).__REACT_DOCTOR_RULES__ as RulesMap | undefined;
  } catch {
    return undefined;
  }
};

export const getThreshold = (ruleName: string, filename: string, defaultValue: number): number => {
  const rules = getRulesMap();
  if (!rules) return defaultValue;

  const config = rules[ruleName];
  if (config === undefined) return defaultValue;

  const normalizedFilename = filename.replace(/\\/g, "/").replace(/^\.\//, "");

  if (Array.isArray(config.overrides)) {
    for (const override of config.overrides) {
      for (const pattern of override.files) {
        if (compileGlobPattern(pattern).test(normalizedFilename)) {
          return override.maxLines;
        }
      }
    }
  }

  return config.maxLines ?? defaultValue;
};
