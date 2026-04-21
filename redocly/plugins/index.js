// deno:https://jsr.io/@std/internal/1.0.13/_os.ts
function checkWindows() {
  const global = globalThis;
  const os = global.Deno?.build?.os;
  return typeof os === "string" ? os === "windows" : global.navigator?.platform?.startsWith("Win") ?? global.process?.platform?.startsWith("win") ?? false;
}

// deno:https://jsr.io/@std/internal/1.0.13/os.ts
var isWindows = checkWindows();

// deno:https://jsr.io/@std/path/1.1.4/_common/assert_path.ts
function assertPath(path) {
  if (typeof path !== "string") {
    throw new TypeError(`Path must be a string, received "${JSON.stringify(path)}"`);
  }
}

// deno:https://jsr.io/@std/path/1.1.4/_common/from_file_url.ts
function assertArg(url) {
  url = url instanceof URL ? url : new URL(url);
  if (url.protocol !== "file:") {
    throw new TypeError(`URL must be a file URL: received "${url.protocol}"`);
  }
  return url;
}

// deno:https://jsr.io/@std/path/1.1.4/posix/from_file_url.ts
function fromFileUrl(url) {
  url = assertArg(url);
  return decodeURIComponent(url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}

// deno:https://jsr.io/@std/path/1.1.4/_common/strip_trailing_separators.ts
function stripTrailingSeparators(segment, isSep) {
  if (segment.length <= 1) {
    return segment;
  }
  let end = segment.length;
  for (let i = segment.length - 1; i > 0; i--) {
    if (isSep(segment.charCodeAt(i))) {
      end = i;
    } else {
      break;
    }
  }
  return segment.slice(0, end);
}

// deno:https://jsr.io/@std/path/1.1.4/_common/constants.ts
var CHAR_UPPERCASE_A = 65;
var CHAR_LOWERCASE_A = 97;
var CHAR_UPPERCASE_Z = 90;
var CHAR_LOWERCASE_Z = 122;
var CHAR_DOT = 46;
var CHAR_FORWARD_SLASH = 47;
var CHAR_BACKWARD_SLASH = 92;
var CHAR_COLON = 58;

// deno:https://jsr.io/@std/path/1.1.4/posix/_util.ts
function isPosixPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH;
}

// deno:https://jsr.io/@std/path/1.1.4/windows/_util.ts
function isPosixPathSeparator2(code) {
  return code === CHAR_FORWARD_SLASH;
}
function isPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
function isWindowsDeviceRoot(code) {
  return code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z || code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z;
}

// deno:https://jsr.io/@std/path/1.1.4/windows/from_file_url.ts
function fromFileUrl2(url) {
  url = assertArg(url);
  let path = decodeURIComponent(url.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
  if (url.hostname !== "") {
    path = `\\\\${url.hostname}${path}`;
  }
  return path;
}

// deno:https://jsr.io/@std/path/1.1.4/_common/dirname.ts
function assertArg2(path) {
  assertPath(path);
  if (path.length === 0) return ".";
}

// deno:https://jsr.io/@std/path/1.1.4/posix/dirname.ts
function dirname(path) {
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  assertArg2(path);
  let end = -1;
  let matchedNonSeparator = false;
  for (let i = path.length - 1; i >= 1; --i) {
    if (isPosixPathSeparator(path.charCodeAt(i))) {
      if (matchedNonSeparator) {
        end = i;
        break;
      }
    } else {
      matchedNonSeparator = true;
    }
  }
  if (end === -1) {
    return isPosixPathSeparator(path.charCodeAt(0)) ? "/" : ".";
  }
  return stripTrailingSeparators(path.slice(0, end), isPosixPathSeparator);
}

// deno:https://jsr.io/@std/path/1.1.4/windows/dirname.ts
function dirname2(path) {
  if (path instanceof URL) {
    path = fromFileUrl2(path);
  }
  assertArg2(path);
  const len = path.length;
  let rootEnd = -1;
  let end = -1;
  let matchedSlash = true;
  let offset = 0;
  const code = path.charCodeAt(0);
  if (len > 1) {
    if (isPathSeparator(code)) {
      rootEnd = offset = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        for (; j < len; ++j) {
          if (isPathSeparator(path.charCodeAt(j))) break;
        }
        if (j < len && j !== last) {
          last = j;
          for (; j < len; ++j) {
            if (!isPathSeparator(path.charCodeAt(j))) break;
          }
          if (j < len && j !== last) {
            last = j;
            for (; j < len; ++j) {
              if (isPathSeparator(path.charCodeAt(j))) break;
            }
            if (j === len) {
              return path;
            }
            if (j !== last) {
              rootEnd = offset = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code)) {
      if (path.charCodeAt(1) === CHAR_COLON) {
        rootEnd = offset = 2;
        if (len > 2) {
          if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
        }
      }
    }
  } else if (isPathSeparator(code)) {
    return path;
  }
  for (let i = len - 1; i >= offset; --i) {
    if (isPathSeparator(path.charCodeAt(i))) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else {
      matchedSlash = false;
    }
  }
  if (end === -1) {
    if (rootEnd === -1) return ".";
    else end = rootEnd;
  }
  return stripTrailingSeparators(path.slice(0, end), isPosixPathSeparator2);
}

// deno:https://jsr.io/@std/path/1.1.4/dirname.ts
function dirname3(path) {
  return isWindows ? dirname2(path) : dirname(path);
}

// deno:https://jsr.io/@std/path/1.1.4/posix/extname.ts
function extname(path) {
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  assertPath(path);
  let startDot = -1;
  let startPart = 0;
  let end = -1;
  let matchedSlash = true;
  let preDotState = 0;
  for (let i = path.length - 1; i >= 0; --i) {
    const code = path.charCodeAt(i);
    if (isPosixPathSeparator(code)) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1) {
      matchedSlash = false;
      end = i + 1;
    }
    if (code === CHAR_DOT) {
      if (startDot === -1) startDot = i;
      else if (preDotState !== 1) preDotState = 1;
    } else if (startDot !== -1) {
      preDotState = -1;
    }
  }
  if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
  preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
  preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return "";
  }
  return path.slice(startDot, end);
}

// deno:https://jsr.io/@std/path/1.1.4/windows/extname.ts
function extname2(path) {
  if (path instanceof URL) {
    path = fromFileUrl2(path);
  }
  assertPath(path);
  let start = 0;
  let startDot = -1;
  let startPart = 0;
  let end = -1;
  let matchedSlash = true;
  let preDotState = 0;
  if (path.length >= 2 && path.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path.charCodeAt(0))) {
    start = startPart = 2;
  }
  for (let i = path.length - 1; i >= start; --i) {
    const code = path.charCodeAt(i);
    if (isPathSeparator(code)) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1) {
      matchedSlash = false;
      end = i + 1;
    }
    if (code === CHAR_DOT) {
      if (startDot === -1) startDot = i;
      else if (preDotState !== 1) preDotState = 1;
    } else if (startDot !== -1) {
      preDotState = -1;
    }
  }
  if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
  preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
  preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return "";
  }
  return path.slice(startDot, end);
}

// deno:https://jsr.io/@std/path/1.1.4/extname.ts
function extname3(path) {
  return isWindows ? extname2(path) : extname(path);
}

// deno:https://jsr.io/@std/path/1.1.4/_common/normalize.ts
function assertArg4(path) {
  assertPath(path);
  if (path.length === 0) return ".";
}

// deno:https://jsr.io/@std/path/1.1.4/_common/normalize_string.ts
function normalizeString(path, allowAboveRoot, separator, isPathSeparator2) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i);
    else if (isPathSeparator2(code)) break;
    else code = CHAR_FORWARD_SLASH;
    if (isPathSeparator2(code)) {
      if (lastSlash === i - 1 || dots === 1) {
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length === 2 || res.length === 1) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) res += `${separator}..`;
          else res = "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
        else res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

// deno:https://jsr.io/@std/path/1.1.4/posix/normalize.ts
function normalize(path) {
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  assertArg4(path);
  const isAbsolute3 = isPosixPathSeparator(path.charCodeAt(0));
  const trailingSeparator = isPosixPathSeparator(path.charCodeAt(path.length - 1));
  path = normalizeString(path, !isAbsolute3, "/", isPosixPathSeparator);
  if (path.length === 0 && !isAbsolute3) path = ".";
  if (path.length > 0 && trailingSeparator) path += "/";
  if (isAbsolute3) return `/${path}`;
  return path;
}

// deno:https://jsr.io/@std/path/1.1.4/posix/join.ts
function join(path, ...paths) {
  if (path === void 0) return ".";
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  paths = path ? [
    path,
    ...paths
  ] : paths;
  paths.forEach((path2) => assertPath(path2));
  const joined = paths.filter((path2) => path2.length > 0).join("/");
  return joined === "" ? "." : normalize(joined);
}

// deno:https://jsr.io/@std/path/1.1.4/windows/normalize.ts
function normalize2(path) {
  if (path instanceof URL) {
    path = fromFileUrl2(path);
  }
  assertArg4(path);
  const len = path.length;
  let rootEnd = 0;
  let device;
  let isAbsolute3 = false;
  const code = path.charCodeAt(0);
  if (len > 1) {
    if (isPathSeparator(code)) {
      isAbsolute3 = true;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        for (; j < len; ++j) {
          if (isPathSeparator(path.charCodeAt(j))) break;
        }
        if (j < len && j !== last) {
          const firstPart = path.slice(last, j);
          last = j;
          for (; j < len; ++j) {
            if (!isPathSeparator(path.charCodeAt(j))) break;
          }
          if (j < len && j !== last) {
            last = j;
            for (; j < len; ++j) {
              if (isPathSeparator(path.charCodeAt(j))) break;
            }
            if (j === len) {
              return `\\\\${firstPart}\\${path.slice(last)}\\`;
            } else if (j !== last) {
              device = `\\\\${firstPart}\\${path.slice(last, j)}`;
              rootEnd = j;
            }
          }
        }
      } else {
        rootEnd = 1;
      }
    } else if (isWindowsDeviceRoot(code)) {
      if (path.charCodeAt(1) === CHAR_COLON) {
        device = path.slice(0, 2);
        rootEnd = 2;
        if (len > 2) {
          if (isPathSeparator(path.charCodeAt(2))) {
            isAbsolute3 = true;
            rootEnd = 3;
          }
        }
      }
    }
  } else if (isPathSeparator(code)) {
    return "\\";
  }
  let tail;
  if (rootEnd < len) {
    tail = normalizeString(path.slice(rootEnd), !isAbsolute3, "\\", isPathSeparator);
  } else {
    tail = "";
  }
  if (tail.length === 0 && !isAbsolute3) tail = ".";
  if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
    tail += "\\";
  }
  if (device === void 0) {
    if (isAbsolute3) {
      if (tail.length > 0) return `\\${tail}`;
      else return "\\";
    }
    return tail;
  } else if (isAbsolute3) {
    if (tail.length > 0) return `${device}\\${tail}`;
    else return `${device}\\`;
  }
  return device + tail;
}

// deno:https://jsr.io/@std/path/1.1.4/windows/join.ts
function join2(path, ...paths) {
  if (path instanceof URL) {
    path = fromFileUrl2(path);
  }
  paths = path ? [
    path,
    ...paths
  ] : paths;
  paths.forEach((path2) => assertPath(path2));
  paths = paths.filter((path2) => path2.length > 0);
  if (paths.length === 0) return ".";
  let needsReplace = true;
  let slashCount = 0;
  const firstPart = paths[0];
  if (isPathSeparator(firstPart.charCodeAt(0))) {
    ++slashCount;
    const firstLen = firstPart.length;
    if (firstLen > 1) {
      if (isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
          else {
            needsReplace = false;
          }
        }
      }
    }
  }
  let joined = paths.join("\\");
  if (needsReplace) {
    for (; slashCount < joined.length; ++slashCount) {
      if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
    }
    if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
  }
  return normalize2(joined);
}

// deno:https://jsr.io/@std/path/1.1.4/join.ts
function join3(path, ...paths) {
  return isWindows ? join2(path, ...paths) : join(path, ...paths);
}

// deno:https://jsr.io/@std/yaml/1.1.0/_chars.ts
var TAB = 9;
var LINE_FEED = 10;
var CARRIAGE_RETURN = 13;
var SPACE = 32;
var EXCLAMATION = 33;
var DOUBLE_QUOTE = 34;
var SHARP = 35;
var PERCENT = 37;
var AMPERSAND = 38;
var SINGLE_QUOTE = 39;
var ASTERISK = 42;
var PLUS = 43;
var COMMA = 44;
var MINUS = 45;
var DOT = 46;
var COLON = 58;
var SMALLER_THAN = 60;
var GREATER_THAN = 62;
var QUESTION = 63;
var COMMERCIAL_AT = 64;
var LEFT_SQUARE_BRACKET = 91;
var BACKSLASH = 92;
var RIGHT_SQUARE_BRACKET = 93;
var GRAVE_ACCENT = 96;
var LEFT_CURLY_BRACKET = 123;
var VERTICAL_LINE = 124;
var RIGHT_CURLY_BRACKET = 125;
function isEOL(c) {
  return c === LINE_FEED || c === CARRIAGE_RETURN;
}
function isWhiteSpace(c) {
  return c === TAB || c === SPACE;
}
function isWhiteSpaceOrEOL(c) {
  return isWhiteSpace(c) || isEOL(c);
}
function isFlowIndicator(c) {
  return c === COMMA || c === LEFT_SQUARE_BRACKET || c === RIGHT_SQUARE_BRACKET || c === LEFT_CURLY_BRACKET || c === RIGHT_CURLY_BRACKET;
}

// deno:https://jsr.io/@std/yaml/1.1.0/_type/binary.ts
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  let code;
  let bitlen = 0;
  const max = data.length;
  const map2 = BASE64_MAP;
  for (let idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  const input = data.replace(/[\r\n=]/g, "");
  const max = input.length;
  const map2 = BASE64_MAP;
  const result = [];
  let bits = 0;
  for (let idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  const tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  const max = object.length;
  const map2 = BASE64_MAP;
  let result = "";
  let bits = 0;
  for (let idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  const tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return obj instanceof Uint8Array;
}
var binary = {
  tag: "tag:yaml.org,2002:binary",
  construct: constructYamlBinary,
  kind: "scalar",
  predicate: isBinary,
  represent: representYamlBinary,
  resolve: resolveYamlBinary
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/bool.ts
var YAML_TRUE_BOOLEANS = [
  "true",
  "True",
  "TRUE"
];
var YAML_FALSE_BOOLEANS = [
  "false",
  "False",
  "FALSE"
];
var YAML_BOOLEANS = [
  ...YAML_TRUE_BOOLEANS,
  ...YAML_FALSE_BOOLEANS
];
var bool = {
  tag: "tag:yaml.org,2002:bool",
  kind: "scalar",
  defaultStyle: "lowercase",
  predicate: (value) => typeof value === "boolean" || value instanceof Boolean,
  construct: (data) => YAML_TRUE_BOOLEANS.includes(data),
  resolve: (data) => YAML_BOOLEANS.includes(data),
  represent: {
    // deno-lint-ignore ban-types
    lowercase: (object) => {
      const value = object instanceof Boolean ? object.valueOf() : object;
      return value ? "true" : "false";
    },
    // deno-lint-ignore ban-types
    uppercase: (object) => {
      const value = object instanceof Boolean ? object.valueOf() : object;
      return value ? "TRUE" : "FALSE";
    },
    // deno-lint-ignore ban-types
    camelcase: (object) => {
      const value = object instanceof Boolean ? object.valueOf() : object;
      return value ? "True" : "False";
    }
  }
};

// deno:https://jsr.io/@std/yaml/1.1.0/_utils.ts
function isObject(value) {
  return value !== null && typeof value === "object";
}
function isNegativeZero(i) {
  return i === 0 && Number.NEGATIVE_INFINITY === 1 / i;
}
function isPlainObject(object) {
  return Object.prototype.toString.call(object) === "[object Object]";
}

// deno:https://jsr.io/@std/yaml/1.1.0/_type/float.ts
var YAML_FLOAT_REGEXP = new RegExp("^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat(data) {
  if (!YAML_FLOAT_REGEXP.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  let value = data.replace(/_/g, "").toLowerCase();
  const sign = value[0] === "-" ? -1 : 1;
  if (value[0] && "+-".includes(value[0])) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value);
}
var SCIENTIFIC_WITHOUT_DOT_REGEXP = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  const value = object instanceof Number ? object.valueOf() : object;
  if (isNaN(value)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === value) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === value) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (isNegativeZero(value)) {
    return "-0.0";
  }
  const res = value.toString(10);
  return SCIENTIFIC_WITHOUT_DOT_REGEXP.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  if (object instanceof Number) object = object.valueOf();
  return typeof object === "number" && (object % 1 !== 0 || isNegativeZero(object));
}
var float = {
  tag: "tag:yaml.org,2002:float",
  construct: constructYamlFloat,
  defaultStyle: "lowercase",
  kind: "scalar",
  predicate: isFloat,
  represent: representYamlFloat,
  resolve: resolveYamlFloat
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/int.ts
function isCharCodeInRange(c, lower, upper) {
  return lower <= c && c <= upper;
}
function isHexCode(c) {
  return isCharCodeInRange(c, 48, 57) || // 0-9
  isCharCodeInRange(c, 65, 70) || // A-F
  isCharCodeInRange(c, 97, 102);
}
function isOctCode(c) {
  return isCharCodeInRange(c, 48, 55);
}
function isDecCode(c) {
  return isCharCodeInRange(c, 48, 57);
}
function resolveYamlInteger(data) {
  const max = data.length;
  let index = 0;
  let hasDigits = false;
  if (!max) return false;
  let ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max) return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    for (; index < max; index++) {
      ch = data[index];
      if (ch === "_") continue;
      if (!isOctCode(data.charCodeAt(index))) return false;
      hasDigits = true;
    }
    return hasDigits && ch !== "_";
  }
  if (ch === "_") return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
}
function constructYamlInteger(data) {
  let value = data;
  if (value.includes("_")) {
    value = value.replace(/_/g, "");
  }
  let sign = 1;
  let ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign * parseInt(value, 16);
    return sign * parseInt(value, 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  if (object instanceof Number) object = object.valueOf();
  return typeof object === "number" && object % 1 === 0 && !isNegativeZero(object);
}
var int = {
  tag: "tag:yaml.org,2002:int",
  construct: constructYamlInteger,
  defaultStyle: "decimal",
  kind: "scalar",
  predicate: isInteger,
  represent: {
    // deno-lint-ignore ban-types
    binary(object) {
      const value = object instanceof Number ? object.valueOf() : object;
      return value >= 0 ? `0b${value.toString(2)}` : `-0b${value.toString(2).slice(1)}`;
    },
    // deno-lint-ignore ban-types
    octal(object) {
      const value = object instanceof Number ? object.valueOf() : object;
      return value >= 0 ? `0${value.toString(8)}` : `-0${value.toString(8).slice(1)}`;
    },
    // deno-lint-ignore ban-types
    decimal(object) {
      const value = object instanceof Number ? object.valueOf() : object;
      return value.toString(10);
    },
    // deno-lint-ignore ban-types
    hexadecimal(object) {
      const value = object instanceof Number ? object.valueOf() : object;
      return value >= 0 ? `0x${value.toString(16).toUpperCase()}` : `-0x${value.toString(16).toUpperCase().slice(1)}`;
    }
  },
  resolve: resolveYamlInteger
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/map.ts
var map = {
  tag: "tag:yaml.org,2002:map",
  resolve() {
    return true;
  },
  construct(data) {
    return data !== null ? data : {};
  },
  kind: "mapping"
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/merge.ts
var merge = {
  tag: "tag:yaml.org,2002:merge",
  kind: "scalar",
  resolve: (data) => data === "<<" || data === null,
  construct: (data) => data
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/nil.ts
var nil = {
  tag: "tag:yaml.org,2002:null",
  kind: "scalar",
  defaultStyle: "lowercase",
  predicate: (object) => object === null,
  construct: () => null,
  resolve: (data) => {
    return data === "~" || data === "null" || data === "Null" || data === "NULL";
  },
  represent: {
    lowercase: () => "null",
    uppercase: () => "NULL",
    camelcase: () => "Null"
  }
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/omap.ts
function resolveYamlOmap(data) {
  const objectKeys = /* @__PURE__ */ new Set();
  for (const object of data) {
    if (!isPlainObject(object)) return false;
    const keys = Object.keys(object);
    if (keys.length !== 1) return false;
    for (const key of keys) {
      if (objectKeys.has(key)) return false;
      objectKeys.add(key);
    }
  }
  return true;
}
var omap = {
  tag: "tag:yaml.org,2002:omap",
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct(data) {
    return data;
  }
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/pairs.ts
function resolveYamlPairs(data) {
  if (data === null) return true;
  return data.every((it) => isPlainObject(it) && Object.keys(it).length === 1);
}
var pairs = {
  tag: "tag:yaml.org,2002:pairs",
  construct(data) {
    return data?.flatMap(Object.entries) ?? [];
  },
  kind: "sequence",
  resolve: resolveYamlPairs
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/regexp.ts
var REGEXP = /^\/(?<regexp>[\s\S]+)\/(?<modifiers>[gismuy]*)$/;
var regexp = {
  tag: "tag:yaml.org,2002:js/regexp",
  kind: "scalar",
  resolve(data) {
    if (data === null || !data.length) return false;
    if (data.charAt(0) === "/") {
      const groups = data.match(REGEXP)?.groups;
      if (!groups) return false;
      const modifiers = groups.modifiers ?? "";
      if (new Set(modifiers).size < modifiers.length) return false;
    }
    return true;
  },
  construct(data) {
    const { regexp: regexp2 = data, modifiers = "" } = data.match(REGEXP)?.groups ?? {};
    return new RegExp(regexp2, modifiers);
  },
  predicate: (object) => object instanceof RegExp,
  represent: (object) => object.toString()
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/seq.ts
var seq = {
  tag: "tag:yaml.org,2002:seq",
  kind: "sequence",
  resolve: () => true,
  construct: (data) => data !== null ? data : []
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/set.ts
var set = {
  tag: "tag:yaml.org,2002:set",
  kind: "mapping",
  construct: (data) => data !== null ? data : {},
  resolve: (data) => {
    if (data === null) return true;
    return Object.values(data).every((it) => it === null);
  }
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/str.ts
var str = {
  tag: "tag:yaml.org,2002:str",
  kind: "scalar",
  resolve: () => true,
  construct: (data) => data !== null ? data : ""
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/timestamp.ts
var YAML_DATE_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
var YAML_TIMESTAMP_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  let match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null) {
    throw new Error("Cannot construct YAML timestamp: date resolve error");
  }
  const year = +match[1];
  const month = +match[2] - 1;
  const day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  const hour = +match[4];
  const minute = +match[5];
  const second = +match[6];
  let fraction = 0;
  if (match[7]) {
    let partFraction = match[7].slice(0, 3);
    while (partFraction.length < 3) {
      partFraction += "0";
    }
    fraction = +partFraction;
  }
  let delta = null;
  if (match[9] && match[10]) {
    const tzHour = +match[10];
    const tzMinute = +(match[11] || 0);
    delta = (tzHour * 60 + tzMinute) * 6e4;
    if (match[9] === "-") delta = -delta;
  }
  const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(date) {
  return date.toISOString();
}
var timestamp = {
  tag: "tag:yaml.org,2002:timestamp",
  construct: constructYamlTimestamp,
  predicate(object) {
    return object instanceof Date;
  },
  kind: "scalar",
  represent: representYamlTimestamp,
  resolve: resolveYamlTimestamp
};

// deno:https://jsr.io/@std/yaml/1.1.0/_type/undefined.ts
var undefinedType = {
  tag: "tag:yaml.org,2002:js/undefined",
  kind: "scalar",
  resolve() {
    return true;
  },
  construct() {
    return void 0;
  },
  predicate(object) {
    return typeof object === "undefined";
  },
  represent() {
    return "";
  }
};

// deno:https://jsr.io/@std/yaml/1.1.0/_schema.ts
function createTypeMap(implicitTypes, explicitTypes) {
  const result = {
    fallback: /* @__PURE__ */ new Map(),
    mapping: /* @__PURE__ */ new Map(),
    scalar: /* @__PURE__ */ new Map(),
    sequence: /* @__PURE__ */ new Map()
  };
  const fallbackMap = result.fallback;
  for (const type of [
    ...implicitTypes,
    ...explicitTypes
  ]) {
    const map2 = result[type.kind];
    map2.set(type.tag, type);
    fallbackMap.set(type.tag, type);
  }
  return result;
}
function createSchema({ explicitTypes = [], implicitTypes = [], include }) {
  if (include) {
    implicitTypes.push(...include.implicitTypes);
    explicitTypes.push(...include.explicitTypes);
  }
  const typeMap = createTypeMap(implicitTypes, explicitTypes);
  return {
    implicitTypes,
    explicitTypes,
    typeMap
  };
}
var FAILSAFE_SCHEMA = createSchema({
  explicitTypes: [
    str,
    seq,
    map
  ]
});
var JSON_SCHEMA = createSchema({
  implicitTypes: [
    nil,
    bool,
    int,
    float
  ],
  include: FAILSAFE_SCHEMA
});
var CORE_SCHEMA = createSchema({
  include: JSON_SCHEMA
});
var DEFAULT_SCHEMA = createSchema({
  explicitTypes: [
    binary,
    omap,
    pairs,
    set
  ],
  implicitTypes: [
    timestamp,
    merge
  ],
  include: CORE_SCHEMA
});
var EXTENDED_SCHEMA = createSchema({
  explicitTypes: [
    regexp,
    undefinedType
  ],
  include: DEFAULT_SCHEMA
});
var SCHEMA_MAP = /* @__PURE__ */ new Map([
  [
    "core",
    CORE_SCHEMA
  ],
  [
    "default",
    DEFAULT_SCHEMA
  ],
  [
    "failsafe",
    FAILSAFE_SCHEMA
  ],
  [
    "json",
    JSON_SCHEMA
  ],
  [
    "extended",
    EXTENDED_SCHEMA
  ]
]);

// deno:https://jsr.io/@std/yaml/1.1.0/_loader_state.ts
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE_REGEXP = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS_REGEXP = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS_REGEXP = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE_REGEXP = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI_REGEXP = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
var ESCAPED_HEX_LENGTHS = /* @__PURE__ */ new Map([
  [
    120,
    2
  ],
  [
    117,
    4
  ],
  [
    85,
    8
  ]
]);
var SIMPLE_ESCAPE_SEQUENCES = /* @__PURE__ */ new Map([
  [
    48,
    "\0"
  ],
  [
    97,
    "\x07"
  ],
  [
    98,
    "\b"
  ],
  [
    116,
    "	"
  ],
  [
    9,
    "	"
  ],
  [
    110,
    "\n"
  ],
  [
    118,
    "\v"
  ],
  [
    102,
    "\f"
  ],
  [
    114,
    "\r"
  ],
  [
    101,
    "\x1B"
  ],
  [
    32,
    " "
  ],
  [
    34,
    '"'
  ],
  [
    47,
    "/"
  ],
  [
    92,
    "\\"
  ],
  [
    78,
    "\x85"
  ],
  [
    95,
    "\xA0"
  ],
  [
    76,
    "\u2028"
  ],
  [
    80,
    "\u2029"
  ]
]);
function hexCharCodeToNumber(charCode) {
  if (48 <= charCode && charCode <= 57) return charCode - 48;
  const lc = charCode | 32;
  if (97 <= lc && lc <= 102) return lc - 97 + 10;
  return -1;
}
function decimalCharCodeToNumber(charCode) {
  if (48 <= charCode && charCode <= 57) return charCode - 48;
  return -1;
}
function codepointToChar(codepoint) {
  if (codepoint <= 65535) return String.fromCharCode(codepoint);
  return String.fromCharCode((codepoint - 65536 >> 10) + 55296, (codepoint - 65536 & 1023) + 56320);
}
var INDENT = 4;
var MAX_LENGTH = 75;
var DELIMITERS = "\0\r\n\x85\u2028\u2029";
function getSnippet(buffer, position) {
  if (!buffer) return null;
  let start = position;
  let end = position;
  let head = "";
  let tail = "";
  while (start > 0 && !DELIMITERS.includes(buffer.charAt(start - 1))) {
    start--;
    if (position - start > MAX_LENGTH / 2 - 1) {
      head = " ... ";
      start += 5;
      break;
    }
  }
  while (end < buffer.length && !DELIMITERS.includes(buffer.charAt(end))) {
    end++;
    if (end - position > MAX_LENGTH / 2 - 1) {
      tail = " ... ";
      end -= 5;
      break;
    }
  }
  const snippet = buffer.slice(start, end);
  const indent = " ".repeat(INDENT);
  const caretIndent = " ".repeat(INDENT + position - start + head.length);
  return `${indent + head + snippet + tail}
${caretIndent}^`;
}
function markToString(buffer, position, line, column) {
  let where = `at line ${line + 1}, column ${column + 1}`;
  const snippet = getSnippet(buffer, position);
  if (snippet) where += `:
${snippet}`;
  return where;
}
function getIndentStatus(lineIndent, parentIndent) {
  if (lineIndent > parentIndent) return 1;
  if (lineIndent < parentIndent) return -1;
  return 0;
}
function writeFoldedLines(count) {
  if (count === 1) return " ";
  if (count > 1) return "\n".repeat(count - 1);
  return "";
}
var Scanner = class {
  source;
  #length;
  position = 0;
  constructor(source) {
    source += "\0";
    this.source = source;
    this.#length = source.length;
  }
  peek(offset = 0) {
    return this.source.charCodeAt(this.position + offset);
  }
  next() {
    this.position += 1;
  }
  eof() {
    return this.position >= this.#length - 1;
  }
};
var LoaderState = class {
  #scanner;
  lineIndent = 0;
  lineStart = 0;
  line = 0;
  onWarning;
  allowDuplicateKeys;
  implicitTypes;
  typeMap;
  checkLineBreaks = false;
  tagMap = /* @__PURE__ */ new Map();
  anchorMap = /* @__PURE__ */ new Map();
  constructor(input, { schema = DEFAULT_SCHEMA, onWarning, allowDuplicateKeys = false }) {
    this.#scanner = new Scanner(input);
    this.onWarning = onWarning;
    this.allowDuplicateKeys = allowDuplicateKeys;
    this.implicitTypes = schema.implicitTypes;
    this.typeMap = schema.typeMap;
    this.readIndent();
  }
  skipWhitespaces() {
    let ch = this.#scanner.peek();
    while (isWhiteSpace(ch)) {
      this.#scanner.next();
      ch = this.#scanner.peek();
    }
  }
  skipComment() {
    let ch = this.#scanner.peek();
    if (ch !== SHARP) return;
    this.#scanner.next();
    ch = this.#scanner.peek();
    while (ch !== 0 && !isEOL(ch)) {
      this.#scanner.next();
      ch = this.#scanner.peek();
    }
  }
  readIndent() {
    let ch = this.#scanner.peek();
    while (ch === SPACE) {
      this.lineIndent += 1;
      this.#scanner.next();
      ch = this.#scanner.peek();
    }
  }
  #createError(message) {
    const mark = markToString(this.#scanner.source, this.#scanner.position, this.line, this.#scanner.position - this.lineStart);
    return new SyntaxError(`${message} ${mark}`);
  }
  dispatchWarning(message) {
    const error = this.#createError(message);
    this.onWarning?.(error);
  }
  yamlDirectiveHandler(args) {
    if (args.length !== 1) {
      throw this.#createError("Cannot handle YAML directive: YAML directive accepts exactly one argument");
    }
    const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throw this.#createError("Cannot handle YAML directive: ill-formed argument");
    }
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (major !== 1) {
      throw this.#createError("Cannot handle YAML directive: unacceptable YAML version");
    }
    this.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      this.dispatchWarning("Cannot handle YAML directive: unsupported YAML version");
    }
    return args[0] ?? null;
  }
  tagDirectiveHandler(args) {
    if (args.length !== 2) {
      throw this.#createError(`Cannot handle tag directive: directive accepts exactly two arguments, received ${args.length}`);
    }
    const handle = args[0];
    const prefix = args[1];
    if (!PATTERN_TAG_HANDLE_REGEXP.test(handle)) {
      throw this.#createError(`Cannot handle tag directive: ill-formed handle (first argument) in "${handle}"`);
    }
    if (this.tagMap.has(handle)) {
      throw this.#createError(`Cannot handle tag directive: previously declared suffix for "${handle}" tag handle`);
    }
    if (!PATTERN_TAG_URI_REGEXP.test(prefix)) {
      throw this.#createError("Cannot handle tag directive: ill-formed tag prefix (second argument) of the TAG directive");
    }
    this.tagMap.set(handle, prefix);
  }
  captureSegment(start, end, checkJson) {
    if (start < end) {
      const result = this.#scanner.source.slice(start, end);
      if (checkJson) {
        for (let position = 0; position < result.length; position++) {
          const character = result.charCodeAt(position);
          if (!(character === 9 || 32 <= character && character <= 1114111)) {
            throw this.#createError(`Expected valid JSON character: received "${character}"`);
          }
        }
      } else if (PATTERN_NON_PRINTABLE_REGEXP.test(result)) {
        throw this.#createError("Stream contains non-printable characters");
      }
      return result;
    }
  }
  readBlockSequence(tag, anchor, nodeIndent) {
    let detected = false;
    const result = [];
    if (anchor !== null) this.anchorMap.set(anchor, result);
    let ch = this.#scanner.peek();
    while (ch !== 0) {
      if (ch !== MINUS) {
        break;
      }
      const following = this.#scanner.peek(1);
      if (!isWhiteSpaceOrEOL(following)) {
        break;
      }
      detected = true;
      this.#scanner.next();
      if (this.skipSeparationSpace(true, -1)) {
        if (this.lineIndent <= nodeIndent) {
          result.push(null);
          ch = this.#scanner.peek();
          continue;
        }
      }
      const line = this.line;
      const newState = this.composeNode({
        parentIndent: nodeIndent,
        nodeContext: CONTEXT_BLOCK_IN,
        allowToSeek: false,
        allowCompact: true
      });
      if (newState) result.push(newState.result);
      this.skipSeparationSpace(true, -1);
      ch = this.#scanner.peek();
      if ((this.line === line || this.lineIndent > nodeIndent) && ch !== 0) {
        throw this.#createError("Cannot read block sequence: bad indentation of a sequence entry");
      } else if (this.lineIndent < nodeIndent) {
        break;
      }
    }
    if (detected) return {
      tag,
      anchor,
      kind: "sequence",
      result
    };
  }
  mergeMappings(destination, source, overridableKeys) {
    if (!isObject(source)) {
      throw this.#createError("Cannot merge mappings: the provided source object is unacceptable");
    }
    for (const [key, value] of Object.entries(source)) {
      if (Object.hasOwn(destination, key)) continue;
      Object.defineProperty(destination, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });
      overridableKeys.add(key);
    }
  }
  storeMappingPair(result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
    if (Array.isArray(keyNode)) {
      keyNode = Array.prototype.slice.call(keyNode);
      for (let index = 0; index < keyNode.length; index++) {
        if (Array.isArray(keyNode[index])) {
          throw this.#createError("Cannot store mapping pair: nested arrays are not supported inside keys");
        }
        if (typeof keyNode === "object" && isPlainObject(keyNode[index])) {
          keyNode[index] = "[object Object]";
        }
      }
    }
    if (typeof keyNode === "object" && isPlainObject(keyNode)) {
      keyNode = "[object Object]";
    }
    keyNode = String(keyNode);
    if (keyTag === "tag:yaml.org,2002:merge") {
      if (Array.isArray(valueNode)) {
        for (let index = 0; index < valueNode.length; index++) {
          this.mergeMappings(result, valueNode[index], overridableKeys);
        }
      } else {
        this.mergeMappings(result, valueNode, overridableKeys);
      }
    } else {
      if (!this.allowDuplicateKeys && !overridableKeys.has(keyNode) && Object.hasOwn(result, keyNode)) {
        this.line = startLine || this.line;
        this.#scanner.position = startPos || this.#scanner.position;
        throw this.#createError("Cannot store mapping pair: duplicated key");
      }
      Object.defineProperty(result, keyNode, {
        value: valueNode,
        writable: true,
        enumerable: true,
        configurable: true
      });
      overridableKeys.delete(keyNode);
    }
    return result;
  }
  readLineBreak() {
    const ch = this.#scanner.peek();
    if (ch === LINE_FEED) {
      this.#scanner.next();
    } else if (ch === CARRIAGE_RETURN) {
      this.#scanner.next();
      if (this.#scanner.peek() === LINE_FEED) {
        this.#scanner.next();
      }
    } else {
      throw this.#createError("Cannot read line: line break not found");
    }
    this.line += 1;
    this.lineStart = this.#scanner.position;
  }
  skipSeparationSpace(allowComments, checkIndent) {
    let lineBreaks = 0;
    let ch = this.#scanner.peek();
    while (ch !== 0) {
      this.skipWhitespaces();
      ch = this.#scanner.peek();
      if (allowComments) {
        this.skipComment();
        ch = this.#scanner.peek();
      }
      if (isEOL(ch)) {
        this.readLineBreak();
        ch = this.#scanner.peek();
        lineBreaks++;
        this.lineIndent = 0;
        this.readIndent();
        ch = this.#scanner.peek();
      } else {
        break;
      }
    }
    if (checkIndent !== -1 && lineBreaks !== 0 && this.lineIndent < checkIndent) {
      this.dispatchWarning("deficient indentation");
    }
    return lineBreaks;
  }
  testDocumentSeparator() {
    let ch = this.#scanner.peek();
    if ((ch === MINUS || ch === DOT) && ch === this.#scanner.peek(1) && ch === this.#scanner.peek(2)) {
      ch = this.#scanner.peek(3);
      if (ch === 0 || isWhiteSpaceOrEOL(ch)) {
        return true;
      }
    }
    return false;
  }
  readPlainScalar(tag, anchor, nodeIndent, withinFlowCollection) {
    let ch = this.#scanner.peek();
    if (isWhiteSpaceOrEOL(ch) || isFlowIndicator(ch) || ch === SHARP || ch === AMPERSAND || ch === ASTERISK || ch === EXCLAMATION || ch === VERTICAL_LINE || ch === GREATER_THAN || ch === SINGLE_QUOTE || ch === DOUBLE_QUOTE || ch === PERCENT || ch === COMMERCIAL_AT || ch === GRAVE_ACCENT) {
      return;
    }
    let following;
    if (ch === QUESTION || ch === MINUS) {
      following = this.#scanner.peek(1);
      if (isWhiteSpaceOrEOL(following) || withinFlowCollection && isFlowIndicator(following)) {
        return;
      }
    }
    let result = "";
    let captureEnd = this.#scanner.position;
    let captureStart = this.#scanner.position;
    let hasPendingContent = false;
    let line = 0;
    while (ch !== 0) {
      if (ch === COLON) {
        following = this.#scanner.peek(1);
        if (isWhiteSpaceOrEOL(following) || withinFlowCollection && isFlowIndicator(following)) {
          break;
        }
      } else if (ch === SHARP) {
        const preceding = this.#scanner.peek(-1);
        if (isWhiteSpaceOrEOL(preceding)) {
          break;
        }
      } else if (this.#scanner.position === this.lineStart && this.testDocumentSeparator() || withinFlowCollection && isFlowIndicator(ch)) {
        break;
      } else if (isEOL(ch)) {
        line = this.line;
        const lineStart = this.lineStart;
        const lineIndent = this.lineIndent;
        this.skipSeparationSpace(false, -1);
        if (this.lineIndent >= nodeIndent) {
          hasPendingContent = true;
          ch = this.#scanner.peek();
          continue;
        } else {
          this.#scanner.position = captureEnd;
          this.line = line;
          this.lineStart = lineStart;
          this.lineIndent = lineIndent;
          break;
        }
      }
      if (hasPendingContent) {
        const segment2 = this.captureSegment(captureStart, captureEnd, false);
        if (segment2) result += segment2;
        result += writeFoldedLines(this.line - line);
        captureStart = captureEnd = this.#scanner.position;
        hasPendingContent = false;
      }
      if (!isWhiteSpace(ch)) {
        captureEnd = this.#scanner.position + 1;
      }
      this.#scanner.next();
      ch = this.#scanner.peek();
    }
    const segment = this.captureSegment(captureStart, captureEnd, false);
    if (segment) result += segment;
    if (anchor !== null) this.anchorMap.set(anchor, result);
    if (result) return {
      tag,
      anchor,
      kind: "scalar",
      result
    };
  }
  readSingleQuotedScalar(tag, anchor, nodeIndent) {
    let ch = this.#scanner.peek();
    if (ch !== SINGLE_QUOTE) return;
    let result = "";
    this.#scanner.next();
    let captureStart = this.#scanner.position;
    let captureEnd = this.#scanner.position;
    ch = this.#scanner.peek();
    while (ch !== 0) {
      if (ch === SINGLE_QUOTE) {
        const segment = this.captureSegment(captureStart, this.#scanner.position, true);
        if (segment) result += segment;
        this.#scanner.next();
        ch = this.#scanner.peek();
        if (ch === SINGLE_QUOTE) {
          captureStart = this.#scanner.position;
          this.#scanner.next();
          captureEnd = this.#scanner.position;
        } else {
          if (anchor !== null) this.anchorMap.set(anchor, result);
          return {
            tag,
            anchor,
            kind: "scalar",
            result
          };
        }
      } else if (isEOL(ch)) {
        const segment = this.captureSegment(captureStart, captureEnd, true);
        if (segment) result += segment;
        result += writeFoldedLines(this.skipSeparationSpace(false, nodeIndent));
        captureStart = captureEnd = this.#scanner.position;
      } else if (this.#scanner.position === this.lineStart && this.testDocumentSeparator()) {
        throw this.#createError("Unexpected end of the document within a single quoted scalar");
      } else {
        this.#scanner.next();
        captureEnd = this.#scanner.position;
      }
      ch = this.#scanner.peek();
    }
    throw this.#createError("Unexpected end of the stream within a single quoted scalar");
  }
  readDoubleQuotedScalar(tag, anchor, nodeIndent) {
    let ch = this.#scanner.peek();
    if (ch !== DOUBLE_QUOTE) return;
    let result = "";
    this.#scanner.next();
    let captureEnd = this.#scanner.position;
    let captureStart = this.#scanner.position;
    let tmp;
    ch = this.#scanner.peek();
    while (ch !== 0) {
      if (ch === DOUBLE_QUOTE) {
        const segment = this.captureSegment(captureStart, this.#scanner.position, true);
        if (segment) result += segment;
        this.#scanner.next();
        if (anchor !== null) this.anchorMap.set(anchor, result);
        return {
          tag,
          anchor,
          kind: "scalar",
          result
        };
      }
      if (ch === BACKSLASH) {
        const segment = this.captureSegment(captureStart, this.#scanner.position, true);
        if (segment) result += segment;
        this.#scanner.next();
        ch = this.#scanner.peek();
        if (isEOL(ch)) {
          this.skipSeparationSpace(false, nodeIndent);
        } else if (ch < 256 && SIMPLE_ESCAPE_SEQUENCES.has(ch)) {
          result += SIMPLE_ESCAPE_SEQUENCES.get(ch);
          this.#scanner.next();
        } else if ((tmp = ESCAPED_HEX_LENGTHS.get(ch) ?? 0) > 0) {
          let hexLength = tmp;
          let hexResult = 0;
          for (; hexLength > 0; hexLength--) {
            this.#scanner.next();
            ch = this.#scanner.peek();
            if ((tmp = hexCharCodeToNumber(ch)) >= 0) {
              hexResult = (hexResult << 4) + tmp;
            } else {
              throw this.#createError("Cannot read double quoted scalar: expected hexadecimal character");
            }
          }
          result += codepointToChar(hexResult);
          this.#scanner.next();
        } else {
          throw this.#createError("Cannot read double quoted scalar: unknown escape sequence");
        }
        captureStart = captureEnd = this.#scanner.position;
      } else if (isEOL(ch)) {
        const segment = this.captureSegment(captureStart, captureEnd, true);
        if (segment) result += segment;
        result += writeFoldedLines(this.skipSeparationSpace(false, nodeIndent));
        captureStart = captureEnd = this.#scanner.position;
      } else if (this.#scanner.position === this.lineStart && this.testDocumentSeparator()) {
        throw this.#createError("Unexpected end of the document within a double quoted scalar");
      } else {
        this.#scanner.next();
        captureEnd = this.#scanner.position;
      }
      ch = this.#scanner.peek();
    }
    throw this.#createError("Unexpected end of the stream within a double quoted scalar");
  }
  readFlowCollection(tag, anchor, nodeIndent) {
    let ch = this.#scanner.peek();
    let terminator;
    let isMapping = true;
    let result = {};
    if (ch === LEFT_SQUARE_BRACKET) {
      terminator = RIGHT_SQUARE_BRACKET;
      isMapping = false;
      result = [];
    } else if (ch === LEFT_CURLY_BRACKET) {
      terminator = RIGHT_CURLY_BRACKET;
    } else {
      return;
    }
    if (anchor !== null) this.anchorMap.set(anchor, result);
    this.#scanner.next();
    ch = this.#scanner.peek();
    let readNext = true;
    let valueNode = null;
    let keyNode = null;
    let keyTag = null;
    let isExplicitPair = false;
    let isPair = false;
    let following = 0;
    let line = 0;
    const overridableKeys = /* @__PURE__ */ new Set();
    while (ch !== 0) {
      this.skipSeparationSpace(true, nodeIndent);
      ch = this.#scanner.peek();
      if (ch === terminator) {
        this.#scanner.next();
        const kind = isMapping ? "mapping" : "sequence";
        return {
          tag,
          anchor,
          kind,
          result
        };
      }
      if (!readNext) {
        throw this.#createError("Cannot read flow collection: missing comma between flow collection entries");
      }
      keyTag = keyNode = valueNode = null;
      isPair = isExplicitPair = false;
      if (ch === QUESTION) {
        following = this.#scanner.peek(1);
        if (isWhiteSpaceOrEOL(following)) {
          isPair = isExplicitPair = true;
          this.#scanner.next();
          this.skipSeparationSpace(true, nodeIndent);
        }
      }
      line = this.line;
      const newState = this.composeNode({
        parentIndent: nodeIndent,
        nodeContext: CONTEXT_FLOW_IN,
        allowToSeek: false,
        allowCompact: true
      });
      if (newState) {
        keyTag = newState.tag || null;
        keyNode = newState.result;
      }
      this.skipSeparationSpace(true, nodeIndent);
      ch = this.#scanner.peek();
      if ((isExplicitPair || this.line === line) && ch === COLON) {
        isPair = true;
        this.#scanner.next();
        ch = this.#scanner.peek();
        this.skipSeparationSpace(true, nodeIndent);
        const newState2 = this.composeNode({
          parentIndent: nodeIndent,
          nodeContext: CONTEXT_FLOW_IN,
          allowToSeek: false,
          allowCompact: true
        });
        if (newState2) valueNode = newState2.result;
      }
      if (isMapping) {
        this.storeMappingPair(result, overridableKeys, keyTag, keyNode, valueNode);
      } else if (isPair) {
        result.push(this.storeMappingPair({}, overridableKeys, keyTag, keyNode, valueNode));
      } else {
        result.push(keyNode);
      }
      this.skipSeparationSpace(true, nodeIndent);
      ch = this.#scanner.peek();
      if (ch === COMMA) {
        readNext = true;
        this.#scanner.next();
        ch = this.#scanner.peek();
      } else {
        readNext = false;
      }
    }
    throw this.#createError("Cannot read flow collection: unexpected end of the stream within a flow collection");
  }
  // Handles block scaler styles: e.g. '|', '>', '|-' and '>-'.
  // https://yaml.org/spec/1.2.2/#81-block-scalar-styles
  readBlockScalar(tag, anchor, nodeIndent) {
    let chomping = CHOMPING_CLIP;
    let didReadContent = false;
    let detectedIndent = false;
    let textIndent = nodeIndent;
    let emptyLines = 0;
    let atMoreIndented = false;
    let ch = this.#scanner.peek();
    let folding = false;
    if (ch === VERTICAL_LINE) {
      folding = false;
    } else if (ch === GREATER_THAN) {
      folding = true;
    } else {
      return;
    }
    let result = "";
    let tmp = 0;
    while (ch !== 0) {
      this.#scanner.next();
      ch = this.#scanner.peek();
      if (ch === PLUS || ch === MINUS) {
        if (CHOMPING_CLIP === chomping) {
          chomping = ch === PLUS ? CHOMPING_KEEP : CHOMPING_STRIP;
        } else {
          throw this.#createError("Cannot read block: chomping mode identifier repeated");
        }
      } else if ((tmp = decimalCharCodeToNumber(ch)) >= 0) {
        if (tmp === 0) {
          throw this.#createError("Cannot read block: indentation width must be greater than 0");
        } else if (!detectedIndent) {
          textIndent = nodeIndent + tmp - 1;
          detectedIndent = true;
        } else {
          throw this.#createError("Cannot read block: indentation width identifier repeated");
        }
      } else {
        break;
      }
    }
    if (isWhiteSpace(ch)) {
      this.skipWhitespaces();
      this.skipComment();
      ch = this.#scanner.peek();
    }
    while (ch !== 0) {
      this.readLineBreak();
      this.lineIndent = 0;
      ch = this.#scanner.peek();
      while ((!detectedIndent || this.lineIndent < textIndent) && ch === SPACE) {
        this.lineIndent++;
        this.#scanner.next();
        ch = this.#scanner.peek();
      }
      if (!detectedIndent && this.lineIndent > textIndent) {
        textIndent = this.lineIndent;
      }
      if (isEOL(ch)) {
        emptyLines++;
        continue;
      }
      if (this.lineIndent < textIndent) {
        if (chomping === CHOMPING_KEEP) {
          result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
        } else if (chomping === CHOMPING_CLIP) {
          if (didReadContent) {
            result += "\n";
          }
        }
        break;
      }
      if (folding) {
        if (isWhiteSpace(ch)) {
          atMoreIndented = true;
          result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
        } else if (atMoreIndented) {
          atMoreIndented = false;
          result += "\n".repeat(emptyLines + 1);
        } else if (emptyLines === 0) {
          if (didReadContent) {
            result += " ";
          }
        } else {
          result += "\n".repeat(emptyLines);
        }
      } else {
        result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
      }
      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      const captureStart = this.#scanner.position;
      while (!isEOL(ch) && ch !== 0) {
        this.#scanner.next();
        ch = this.#scanner.peek();
      }
      const segment = this.captureSegment(captureStart, this.#scanner.position, false);
      if (segment) result += segment;
    }
    if (anchor !== null) this.anchorMap.set(anchor, result);
    return {
      tag,
      anchor,
      kind: "scalar",
      result
    };
  }
  readBlockMapping(tag, anchor, nodeIndent, flowIndent) {
    const result = {};
    const overridableKeys = /* @__PURE__ */ new Set();
    let allowCompact = false;
    let line;
    let pos;
    let keyTag = null;
    let keyNode = null;
    let valueNode = null;
    let atExplicitKey = false;
    let detected = false;
    if (anchor !== null) this.anchorMap.set(anchor, result);
    let ch = this.#scanner.peek();
    while (ch !== 0) {
      const following = this.#scanner.peek(1);
      line = this.line;
      pos = this.#scanner.position;
      if ((ch === QUESTION || ch === COLON) && isWhiteSpaceOrEOL(following)) {
        if (ch === QUESTION) {
          if (atExplicitKey) {
            this.storeMappingPair(result, overridableKeys, keyTag, keyNode, null);
            keyTag = null;
            keyNode = null;
            valueNode = null;
          }
          detected = true;
          atExplicitKey = true;
          allowCompact = true;
        } else if (atExplicitKey) {
          atExplicitKey = false;
          allowCompact = true;
        } else {
          throw this.#createError("Cannot read block as explicit mapping pair is incomplete: a key node is missed or followed by a non-tabulated empty line");
        }
        this.#scanner.next();
        ch = following;
      } else {
        const newState = this.composeNode({
          parentIndent: flowIndent,
          nodeContext: CONTEXT_FLOW_OUT,
          allowToSeek: false,
          allowCompact: true
        });
        if (!newState) break;
        if (this.line === line) {
          ch = this.#scanner.peek();
          this.skipWhitespaces();
          ch = this.#scanner.peek();
          if (ch === COLON) {
            this.#scanner.next();
            ch = this.#scanner.peek();
            if (!isWhiteSpaceOrEOL(ch)) {
              throw this.#createError("Cannot read block: a whitespace character is expected after the key-value separator within a block mapping");
            }
            if (atExplicitKey) {
              this.storeMappingPair(result, overridableKeys, keyTag, keyNode, null);
              keyTag = null;
              keyNode = null;
              valueNode = null;
            }
            detected = true;
            atExplicitKey = false;
            allowCompact = false;
            keyTag = newState.tag;
            keyNode = newState.result;
          } else if (detected) {
            throw this.#createError("Cannot read an implicit mapping pair: missing colon");
          } else {
            const { kind, result: result2 } = newState;
            return {
              tag,
              anchor,
              kind,
              result: result2
            };
          }
        } else if (detected) {
          throw this.#createError("Cannot read a block mapping entry: a multiline key may not be an implicit key");
        } else {
          const { kind, result: result2 } = newState;
          return {
            tag,
            anchor,
            kind,
            result: result2
          };
        }
      }
      if (this.line === line || this.lineIndent > nodeIndent) {
        const newState = this.composeNode({
          parentIndent: nodeIndent,
          nodeContext: CONTEXT_BLOCK_OUT,
          allowToSeek: true,
          allowCompact
        });
        if (newState) {
          if (atExplicitKey) {
            keyNode = newState.result;
          } else {
            valueNode = newState.result;
          }
        }
        if (!atExplicitKey) {
          this.storeMappingPair(result, overridableKeys, keyTag, keyNode, valueNode, line, pos);
          keyTag = keyNode = valueNode = null;
        }
        this.skipSeparationSpace(true, -1);
        ch = this.#scanner.peek();
      }
      if (this.lineIndent > nodeIndent && ch !== 0) {
        throw this.#createError("Cannot read block: bad indentation of a mapping entry");
      } else if (this.lineIndent < nodeIndent) {
        break;
      }
    }
    if (atExplicitKey) {
      this.storeMappingPair(result, overridableKeys, keyTag, keyNode, null);
    }
    if (detected) return {
      tag,
      anchor,
      kind: "mapping",
      result
    };
  }
  readTagProperty(tag) {
    let isVerbatim = false;
    let isNamed = false;
    let tagHandle = "";
    let tagName;
    let ch = this.#scanner.peek();
    if (ch !== EXCLAMATION) return;
    if (tag !== null) {
      throw this.#createError("Cannot read tag property: duplication of a tag property");
    }
    this.#scanner.next();
    ch = this.#scanner.peek();
    if (ch === SMALLER_THAN) {
      isVerbatim = true;
      this.#scanner.next();
      ch = this.#scanner.peek();
    } else if (ch === EXCLAMATION) {
      isNamed = true;
      tagHandle = "!!";
      this.#scanner.next();
      ch = this.#scanner.peek();
    } else {
      tagHandle = "!";
    }
    let position = this.#scanner.position;
    if (isVerbatim) {
      do {
        this.#scanner.next();
        ch = this.#scanner.peek();
      } while (ch !== 0 && ch !== GREATER_THAN);
      if (!this.#scanner.eof()) {
        tagName = this.#scanner.source.slice(position, this.#scanner.position);
        this.#scanner.next();
        ch = this.#scanner.peek();
      } else {
        throw this.#createError("Cannot read tag property: unexpected end of stream");
      }
    } else {
      while (ch !== 0 && !isWhiteSpaceOrEOL(ch)) {
        if (ch === EXCLAMATION) {
          if (!isNamed) {
            tagHandle = this.#scanner.source.slice(position - 1, this.#scanner.position + 1);
            if (!PATTERN_TAG_HANDLE_REGEXP.test(tagHandle)) {
              throw this.#createError("Cannot read tag property: named tag handle contains invalid characters");
            }
            isNamed = true;
            position = this.#scanner.position + 1;
          } else {
            throw this.#createError("Cannot read tag property: tag suffix cannot contain an exclamation mark");
          }
        }
        this.#scanner.next();
        ch = this.#scanner.peek();
      }
      tagName = this.#scanner.source.slice(position, this.#scanner.position);
      if (PATTERN_FLOW_INDICATORS_REGEXP.test(tagName)) {
        throw this.#createError("Cannot read tag property: tag suffix cannot contain flow indicator characters");
      }
    }
    if (tagName && !PATTERN_TAG_URI_REGEXP.test(tagName)) {
      throw this.#createError(`Cannot read tag property: invalid characters in tag name "${tagName}"`);
    }
    if (isVerbatim) {
      return tagName;
    } else if (this.tagMap.has(tagHandle)) {
      return this.tagMap.get(tagHandle) + tagName;
    } else if (tagHandle === "!") {
      return `!${tagName}`;
    } else if (tagHandle === "!!") {
      return `tag:yaml.org,2002:${tagName}`;
    }
    throw this.#createError(`Cannot read tag property: undeclared tag handle "${tagHandle}"`);
  }
  readAnchorProperty(anchor) {
    let ch = this.#scanner.peek();
    if (ch !== AMPERSAND) return;
    if (anchor !== null) {
      throw this.#createError("Cannot read anchor property: duplicate anchor property");
    }
    this.#scanner.next();
    ch = this.#scanner.peek();
    const position = this.#scanner.position;
    while (ch !== 0 && !isWhiteSpaceOrEOL(ch) && !isFlowIndicator(ch)) {
      this.#scanner.next();
      ch = this.#scanner.peek();
    }
    if (this.#scanner.position === position) {
      throw this.#createError("Cannot read anchor property: name of an anchor node must contain at least one character");
    }
    return this.#scanner.source.slice(position, this.#scanner.position);
  }
  readAlias() {
    if (this.#scanner.peek() !== ASTERISK) return;
    this.#scanner.next();
    let ch = this.#scanner.peek();
    const position = this.#scanner.position;
    while (ch !== 0 && !isWhiteSpaceOrEOL(ch) && !isFlowIndicator(ch)) {
      this.#scanner.next();
      ch = this.#scanner.peek();
    }
    if (this.#scanner.position === position) {
      throw this.#createError("Cannot read alias: alias name must contain at least one character");
    }
    const alias = this.#scanner.source.slice(position, this.#scanner.position);
    if (!this.anchorMap.has(alias)) {
      throw this.#createError(`Cannot read alias: unidentified alias "${alias}"`);
    }
    this.skipSeparationSpace(true, -1);
    return this.anchorMap.get(alias);
  }
  resolveTag(state) {
    switch (state.tag) {
      case null:
      case "!":
        return state;
      case "?": {
        for (const type2 of this.implicitTypes) {
          if (!type2.resolve(state.result)) continue;
          const result2 = type2.construct(state.result);
          state.result = result2;
          state.tag = type2.tag;
          const { anchor: anchor2 } = state;
          if (anchor2 !== null) this.anchorMap.set(anchor2, result2);
          return state;
        }
        return state;
      }
    }
    const kind = state.kind ?? "fallback";
    const map2 = this.typeMap[kind];
    const type = map2.get(state.tag);
    if (!type) {
      throw this.#createError(`Cannot resolve unknown tag !<${state.tag}>`);
    }
    if (state.result !== null && type.kind !== state.kind) {
      throw this.#createError(`Unacceptable node kind for !<${state.tag}> tag: it should be "${type.kind}", not "${state.kind}"`);
    }
    if (!type.resolve(state.result)) {
      throw this.#createError(`Cannot resolve a node with !<${state.tag}> explicit tag`);
    }
    const result = type.construct(state.result);
    state.result = result;
    const { anchor } = state;
    if (anchor !== null) this.anchorMap.set(anchor, result);
    return state;
  }
  composeNode({ parentIndent, nodeContext, allowToSeek, allowCompact }) {
    let indentStatus = 1;
    let atNewLine = false;
    const allowBlockScalars = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
    let allowBlockCollections = allowBlockScalars;
    const allowBlockStyles = allowBlockScalars;
    if (allowToSeek) {
      if (this.skipSeparationSpace(true, -1)) {
        atNewLine = true;
        indentStatus = getIndentStatus(this.lineIndent, parentIndent);
      }
    }
    let tag = null;
    let anchor = null;
    if (indentStatus === 1) {
      while (true) {
        const newTag = this.readTagProperty(tag);
        if (newTag) {
          tag = newTag;
        } else {
          const newAnchor = this.readAnchorProperty(anchor);
          if (!newAnchor) break;
          anchor = newAnchor;
        }
        if (this.skipSeparationSpace(true, -1)) {
          atNewLine = true;
          allowBlockCollections = allowBlockStyles;
          indentStatus = getIndentStatus(this.lineIndent, parentIndent);
        } else {
          allowBlockCollections = false;
        }
      }
    }
    if (allowBlockCollections) {
      allowBlockCollections = atNewLine || allowCompact;
    }
    if (indentStatus === 1) {
      const cond = CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext;
      const flowIndent = cond ? parentIndent : parentIndent + 1;
      if (allowBlockCollections) {
        const blockIndent = this.#scanner.position - this.lineStart;
        const blockSequenceState = this.readBlockSequence(tag, anchor, blockIndent);
        if (blockSequenceState) return this.resolveTag(blockSequenceState);
        const blockMappingState = this.readBlockMapping(tag, anchor, blockIndent, flowIndent);
        if (blockMappingState) return this.resolveTag(blockMappingState);
      }
      const flowCollectionState = this.readFlowCollection(tag, anchor, flowIndent);
      if (flowCollectionState) return this.resolveTag(flowCollectionState);
      if (allowBlockScalars) {
        const blockScalarState = this.readBlockScalar(tag, anchor, flowIndent);
        if (blockScalarState) return this.resolveTag(blockScalarState);
      }
      const singleQuoteState = this.readSingleQuotedScalar(tag, anchor, flowIndent);
      if (singleQuoteState) return this.resolveTag(singleQuoteState);
      const doubleQuoteState = this.readDoubleQuotedScalar(tag, anchor, flowIndent);
      if (doubleQuoteState) return this.resolveTag(doubleQuoteState);
      const alias = this.readAlias();
      if (alias) {
        if (tag !== null || anchor !== null) {
          throw this.#createError("Cannot compose node: alias node should not have any properties");
        }
        return this.resolveTag({
          tag,
          anchor,
          kind: null,
          result: alias
        });
      }
      const plainScalarState = this.readPlainScalar(tag, anchor, flowIndent, CONTEXT_FLOW_IN === nodeContext);
      if (plainScalarState) {
        plainScalarState.tag ??= "?";
        return this.resolveTag(plainScalarState);
      }
    } else if (indentStatus === 0 && CONTEXT_BLOCK_OUT === nodeContext && allowBlockCollections) {
      const blockIndent = this.#scanner.position - this.lineStart;
      const newState2 = this.readBlockSequence(tag, anchor, blockIndent);
      if (newState2) return this.resolveTag(newState2);
    }
    const newState = this.resolveTag({
      tag,
      anchor,
      kind: null,
      result: null
    });
    if (newState.tag !== null || newState.anchor !== null) return newState;
  }
  readDirectives() {
    let hasDirectives = false;
    let version = null;
    let ch = this.#scanner.peek();
    while (ch !== 0) {
      this.skipSeparationSpace(true, -1);
      ch = this.#scanner.peek();
      if (this.lineIndent > 0 || ch !== PERCENT) {
        break;
      }
      hasDirectives = true;
      this.#scanner.next();
      ch = this.#scanner.peek();
      let position = this.#scanner.position;
      while (ch !== 0 && !isWhiteSpaceOrEOL(ch)) {
        this.#scanner.next();
        ch = this.#scanner.peek();
      }
      const directiveName = this.#scanner.source.slice(position, this.#scanner.position);
      const directiveArgs = [];
      if (directiveName.length < 1) {
        throw this.#createError("Cannot read document: directive name length must be greater than zero");
      }
      while (ch !== 0) {
        this.skipWhitespaces();
        this.skipComment();
        ch = this.#scanner.peek();
        if (isEOL(ch)) break;
        position = this.#scanner.position;
        while (ch !== 0 && !isWhiteSpaceOrEOL(ch)) {
          this.#scanner.next();
          ch = this.#scanner.peek();
        }
        directiveArgs.push(this.#scanner.source.slice(position, this.#scanner.position));
      }
      if (ch !== 0) this.readLineBreak();
      switch (directiveName) {
        case "YAML":
          if (version !== null) {
            throw this.#createError("Cannot handle YAML directive: duplication of %YAML directive");
          }
          version = this.yamlDirectiveHandler(directiveArgs);
          break;
        case "TAG":
          this.tagDirectiveHandler(directiveArgs);
          break;
        default:
          this.dispatchWarning(`unknown document directive "${directiveName}"`);
          break;
      }
      ch = this.#scanner.peek();
    }
    return hasDirectives;
  }
  readDocument() {
    const documentStart = this.#scanner.position;
    this.checkLineBreaks = false;
    this.tagMap = /* @__PURE__ */ new Map();
    this.anchorMap = /* @__PURE__ */ new Map();
    const hasDirectives = this.readDirectives();
    this.skipSeparationSpace(true, -1);
    let result = null;
    if (this.lineIndent === 0 && this.#scanner.peek() === MINUS && this.#scanner.peek(1) === MINUS && this.#scanner.peek(2) === MINUS) {
      this.#scanner.position += 3;
      this.skipSeparationSpace(true, -1);
    } else if (hasDirectives) {
      throw this.#createError("Cannot read document: directives end mark is expected");
    }
    const newState = this.composeNode({
      parentIndent: this.lineIndent - 1,
      nodeContext: CONTEXT_BLOCK_OUT,
      allowToSeek: false,
      allowCompact: true
    });
    if (newState) result = newState.result;
    this.skipSeparationSpace(true, -1);
    if (this.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS_REGEXP.test(this.#scanner.source.slice(documentStart, this.#scanner.position))) {
      this.dispatchWarning("non-ASCII line breaks are interpreted as content");
    }
    if (this.#scanner.position === this.lineStart && this.testDocumentSeparator()) {
      if (this.#scanner.peek() === DOT) {
        this.#scanner.position += 3;
        this.skipSeparationSpace(true, -1);
      }
    } else if (!this.#scanner.eof()) {
      throw this.#createError("Cannot read document: end of the stream or a document separator is expected");
    }
    return result;
  }
  *readDocuments() {
    while (!this.#scanner.eof()) {
      yield this.readDocument();
    }
  }
};

// deno:https://jsr.io/@std/yaml/1.1.0/parse.ts
function sanitizeInput(input) {
  input = String(input);
  if (input.length > 0) {
    if (!isEOL(input.charCodeAt(input.length - 1))) input += "\n";
    if (input.charCodeAt(0) === 65279) input = input.slice(1);
  }
  return input;
}
function parse3(content, options = {}) {
  content = sanitizeInput(content);
  const state = new LoaderState(content, {
    ...options,
    schema: SCHEMA_MAP.get(options.schema)
  });
  const documentGenerator = state.readDocuments();
  const document = documentGenerator.next().value;
  if (!documentGenerator.next().done) {
    throw new SyntaxError("Found more than 1 document in the stream: expected a single document");
  }
  return document ?? null;
}

// redocly/plugins/preprocessors/bundle-examples.ts
var isContainer = (value) => typeof value === "object" && value !== null;
var getYaml = (p) => {
  const result = parse3(Deno.readTextFileSync(p));
  return typeof result === "object" && result !== null && !Array.isArray(result) ? result : {};
};
var bundle = (target, baseDir) => {
  if (Array.isArray(target)) {
    return target.map((value) => isContainer(value) ? bundle(value, baseDir) : value);
  }
  const result = {};
  for (const [key, value] of Object.entries(target)) {
    if (key === "$ref" && typeof value === "string" && extname3(value) === ".yaml") {
      const targetPath = join3(baseDir, value);
      Object.assign(result, bundle(getYaml(targetPath), dirname3(targetPath)));
    } else {
      result[key] = isContainer(value) ? bundle(value, baseDir) : value;
    }
  }
  return result;
};
var bundleEntry = (target, baseDir) => {
  if (Array.isArray(target)) {
    return target.map((value) => isContainer(value) ? bundleEntry(value, baseDir) : value);
  }
  return Object.fromEntries(Object.entries(target).map(([key, value]) => {
    if (isContainer(value)) {
      return [
        key,
        key === "examples" ? bundle(value, baseDir) : bundleEntry(value, baseDir)
      ];
    }
    return [
      key,
      value
    ];
  }));
};
var BundleExamples = () => ({
  Operation: {
    leave(target, ctx) {
      const basedir = dirname3(ctx.location.source.absoluteRef);
      if (target.requestBody && isContainer(target.requestBody)) {
        target.requestBody = bundleEntry(target.requestBody, basedir);
      }
      if (target.responses && isContainer(target.responses)) {
        target.responses = bundleEntry(target.responses, basedir);
      }
    }
  }
});

// redocly/plugins/index.ts
var preprocessors = {
  "bundle-examples": BundleExamples
};
var plugin = () => ({
  id: "my",
  preprocessors: {
    oas3: preprocessors
  }
});
var plugins_default = plugin;
export {
  plugins_default as default,
  preprocessors
};
