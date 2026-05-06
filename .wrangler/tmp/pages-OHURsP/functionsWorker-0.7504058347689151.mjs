var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-ryUyzS/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// api/clear.js
async function onRequest(context) {
  try {
    const { request, env } = context;
    const KV = env.CALENDAR_DATA;
    if (!KV) {
      return new Response(JSON.stringify({ error: "KV binding 'CALENDAR_DATA' not found." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    const authHeader = request.headers.get("Authorization");
    if (!authHeader)
      return new Response("Unauthorized", { status: 401 });
    let usersStr = await KV.get("calendar_users");
    let users = usersStr ? JSON.parse(usersStr) : {};
    const [authUser, authPw] = atob(authHeader).split(":");
    if (authUser !== "robson" || users[authUser]?.password !== authPw) {
      return new Response("Forbidden: Root access only", { status: 403 });
    }
    if (request.method === "POST") {
      const payload = await request.json();
      const { action, confirmPassword } = payload;
      if (action === "clearAll") {
        if (confirmPassword !== "R545e545!#") {
          return new Response("Senha de confirma\xE7\xE3o incorreta", { status: 401 });
        }
        await KV.delete("calendar_json");
        await KV.delete("calendar_logs");
        await KV.delete("calendar_comments");
        return new Response("OK", { status: 200 });
      }
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequest, "onRequest");

// api/comments.js
async function onRequest2(context) {
  try {
    const { request, env } = context;
    const KV = env.CALENDAR_DATA;
    const url = new URL(request.url);
    if (!KV) {
      return new Response(JSON.stringify({ error: "KV binding 'CALENDAR_DATA' not found." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (request.method === "GET") {
      const date = url.searchParams.get("date");
      if (!date)
        return new Response("Missing date", { status: 400 });
      const commentsDataStr = await KV.get("calendar_comments");
      const commentsData = commentsDataStr ? JSON.parse(commentsDataStr) : {};
      const dateComments = commentsData[date] || [];
      return new Response(JSON.stringify(dateComments), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const authHeader = request.headers.get("Authorization");
    if (!authHeader)
      return new Response("Unauthorized", { status: 401 });
    const usersStr = await KV.get("calendar_users");
    const users = usersStr ? JSON.parse(usersStr) : {};
    const [authUser, authPw] = atob(authHeader).split(":");
    if (!users[authUser] || users[authUser].password !== authPw) {
      return new Response("Forbidden", { status: 403 });
    }
    if (request.method === "POST") {
      const payload = await request.json();
      const { date, text } = payload;
      if (!date || !text)
        return new Response("Missing date or text", { status: 400 });
      const userProfile = users[authUser];
      let displayIdentifier = authUser;
      if (userProfile.displayName && userProfile.department) {
        displayIdentifier = `${userProfile.displayName} - ${userProfile.department}`;
      } else if (userProfile.displayName) {
        displayIdentifier = userProfile.displayName;
      }
      let commentsDataStr = await KV.get("calendar_comments");
      let commentsData = commentsDataStr ? JSON.parse(commentsDataStr) : {};
      if (!commentsData[date])
        commentsData[date] = [];
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      commentsData[date].push({
        user: displayIdentifier,
        timestamp,
        text: text.trim()
      });
      if (commentsData[date].length > 50)
        commentsData[date].shift();
      await KV.put("calendar_comments", JSON.stringify(commentsData));
      let logsStr = await KV.get("calendar_logs");
      let logs = logsStr ? JSON.parse(logsStr) : [];
      logs.push({
        type: "comment",
        timestamp,
        // Matches comment timestamp
        date,
        user: displayIdentifier,
        text: text.trim()
      });
      if (logs.length > 100)
        logs.shift();
      await KV.put("calendar_logs", JSON.stringify(logs));
      return new Response("OK", { status: 200 });
    }
    if (request.method === "DELETE") {
      if (!users[authUser].isAdmin) {
        return new Response("Forbidden: Admin only", { status: 403 });
      }
      const payload = await request.json();
      const { date, timestamp } = payload;
      if (!date || !timestamp)
        return new Response("Missing parameters", { status: 400 });
      let commentsDataStr = await KV.get("calendar_comments");
      let commentsData = commentsDataStr ? JSON.parse(commentsDataStr) : {};
      if (commentsData[date]) {
        const commentIdx = commentsData[date].findIndex((c) => c.timestamp === timestamp);
        if (commentIdx !== -1) {
          commentsData[date][commentIdx].isDeleted = true;
          await KV.put("calendar_comments", JSON.stringify(commentsData));
          let logsStr = await KV.get("calendar_logs");
          if (logsStr) {
            let logs = JSON.parse(logsStr);
            const updatedLogs = logs.filter((l) => !(l.type === "comment" && l.date === date && l.timestamp === timestamp));
            await KV.put("calendar_logs", JSON.stringify(updatedLogs));
          }
          return new Response("OK", { status: 200 });
        }
      }
      return new Response("Comment not found", { status: 404 });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequest2, "onRequest");

// api/data.js
async function onRequest3(context) {
  try {
    const { request, env } = context;
    const KV = env.CALENDAR_DATA;
    if (!KV) {
      return new Response(JSON.stringify({ error: "KV binding 'CALENDAR_DATA' not found." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (request.method === "GET") {
      let data = await KV.get("calendar_json");
      if (!data) {
        data = JSON.stringify(getInitialData());
        await KV.put("calendar_json", data);
      }
      return new Response(data, { headers: { "Content-Type": "application/json" } });
    }
    if (request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader)
        return new Response("Unauthorized", { status: 401 });
      let usersStr = await KV.get("calendar_users");
      let users = usersStr ? JSON.parse(usersStr) : {};
      const [authUser, authPw] = atob(authHeader).split(":");
      if (!users[authUser] || users[authUser].password !== authPw || !users[authUser].isAdmin) {
        return new Response("Forbidden", { status: 403 });
      }
      const payload = await request.json();
      const { date, sector, user, oldSector } = payload;
      if (!date)
        return new Response("Missing date", { status: 400 });
      const userProfile = users[authUser];
      let displayIdentifier = authUser;
      if (userProfile.displayName && userProfile.department) {
        displayIdentifier = `${userProfile.displayName} - ${userProfile.department}`;
      } else if (userProfile.displayName) {
        displayIdentifier = userProfile.displayName;
      }
      let dataStr = await KV.get("calendar_json");
      let data = dataStr ? JSON.parse(dataStr) : {};
      if (sector) {
        data[date] = sector;
      } else {
        delete data[date];
      }
      await KV.put("calendar_json", JSON.stringify(data));
      let logsStr = await KV.get("calendar_logs");
      let logs = logsStr ? JSON.parse(logsStr) : [];
      logs.push({
        type: "sector",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        date,
        sector: sector || "(Vazio)",
        user: displayIdentifier,
        oldSector: oldSector || "(Vazio)"
      });
      if (logs.length > 100)
        logs.shift();
      await KV.put("calendar_logs", JSON.stringify(logs));
      return new Response("OK", { status: 200 });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequest3, "onRequest");
function getInitialData() {
  return {
    "2026-05-01": "Feriado",
    "2026-05-04": "Terrazzo",
    "2026-05-05": "Casa de Festa",
    "2026-05-11": "Loja",
    "2026-05-18": "Hortifruti",
    "2026-05-19": "Peixaria",
    "2026-05-20": "Frios",
    "2026-05-25": "A\xE7ougue",
    "2026-05-29": "Especiarias"
  };
}
__name(getInitialData, "getInitialData");

// api/logs.js
async function onRequest4(context) {
  try {
    const { request, env } = context;
    const KV = env.CALENDAR_DATA;
    if (!KV) {
      return new Response(JSON.stringify({ error: "KV binding 'CALENDAR_DATA' not found." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }
    let logsStr = await KV.get("calendar_logs");
    let logs = logsStr ? JSON.parse(logsStr) : [];
    return new Response(JSON.stringify(logs), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequest4, "onRequest");

// api/sectors.js
async function onRequest5(context) {
  try {
    const { request, env } = context;
    const KV = env.CALENDAR_DATA;
    if (!KV) {
      return new Response(JSON.stringify({ error: "KV binding 'CALENDAR_DATA' not found." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (request.method === "GET") {
      let sectorsStr = await KV.get("calendar_sectors");
      let sectors;
      if (!sectorsStr) {
        sectors = getInitialSectors();
        await KV.put("calendar_sectors", JSON.stringify(sectors));
      } else {
        sectors = JSON.parse(sectorsStr);
      }
      return new Response(JSON.stringify(sectors), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader)
        return new Response("Unauthorized", { status: 401 });
      let usersStr = await KV.get("calendar_users");
      let users = usersStr ? JSON.parse(usersStr) : {};
      const [authUser, authPw] = atob(authHeader).split(":");
      if (!users[authUser] || users[authUser].password !== authPw || !users[authUser].isAdmin) {
        return new Response("Forbidden", { status: 403 });
      }
      const payload = await request.json();
      if (!Array.isArray(payload)) {
        return new Response("Invalid sectors list", { status: 400 });
      }
      await KV.put("calendar_sectors", JSON.stringify(payload));
      return new Response("OK", { status: 200 });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequest5, "onRequest");
function getInitialSectors() {
  return [
    { key: "Loja", label: "Loja In\xEDcio", color: "#2979ff" },
    { key: "Hortifruti", label: "Hortifruti", color: "#00c853" },
    { key: "A\xE7ougue", label: "A\xE7ougue", color: "#e53935" },
    { key: "Peixaria e F. Favorito", label: "Peixaria e F. Favorito", color: "#00b0ff" },
    { key: "Frios", label: "Frios", color: "#7c4dff" },
    { key: "Terrazzo", label: "Terrazzo", color: "#ff6d00" },
    { key: "Especiarias Agranel", label: "Especiarias Agranel", color: "#f9a825" },
    { key: "Casa de Festa", label: "Casa de Festa", color: "#e91e8c" },
    { key: "Feriado", label: "Feriado", color: "#546e7a" }
  ];
}
__name(getInitialSectors, "getInitialSectors");

// api/users.js
async function onRequest6(context) {
  try {
    const { request, env } = context;
    const KV = env.CALENDAR_DATA;
    if (!KV) {
      return new Response(JSON.stringify({ error: "KV binding 'CALENDAR_DATA' not found." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    let usersStr = await KV.get("calendar_users");
    let users = usersStr ? JSON.parse(usersStr) : {};
    if (Object.keys(users).length === 0) {
      users["robson"] = { password: "R545e545", isAdmin: true };
      await KV.put("calendar_users", JSON.stringify(users));
    }
    const url = new URL(request.url);
    if (request.method === "GET") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader)
        return new Response("Unauthorized", { status: 401 });
      const [authUser, authPw] = atob(authHeader).split(":");
      if (!users[authUser] || users[authUser].password !== authPw || !users[authUser].isAdmin) {
        return new Response("Forbidden", { status: 403 });
      }
      const userList = Object.keys(users).map((u) => ({
        username: u,
        isAdmin: users[u].isAdmin
      }));
      return new Response(JSON.stringify(userList), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (request.method === "POST") {
      const payload = await request.json();
      const { action, username, password, isAdmin, targetUser, newPassword, displayName, department } = payload;
      if (action === "login") {
        if (users[username] && users[username].password === password) {
          return new Response(JSON.stringify({
            success: true,
            isAdmin: users[username].isAdmin,
            username,
            displayName: users[username].displayName || "",
            department: users[username].department || ""
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: false, message: "Usu\xE1rio ou senha incorretos" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const authHeader = request.headers.get("Authorization");
      if (!authHeader)
        return new Response("Unauthorized", { status: 401 });
      const [authUser, authPw] = atob(authHeader).split(":");
      if (!users[authUser] || users[authUser].password !== authPw) {
        return new Response("Forbidden", { status: 403 });
      }
      if (action === "updateProfile") {
        users[authUser].displayName = displayName;
        users[authUser].department = department;
        await KV.put("calendar_users", JSON.stringify(users));
        return new Response(JSON.stringify({ success: true }));
      }
      if (action === "updateUsername") {
        const { targetUser: targetUser2, newUsername } = payload;
        if (!targetUser2 || !newUsername)
          return new Response("Missing parameters", { status: 400 });
        const oldUsername = targetUser2;
        const normalizedNew = newUsername.trim().toLowerCase();
        if (!users[oldUsername])
          return new Response("User not found", { status: 404 });
        if (users[normalizedNew])
          return new Response("Novo login j\xE1 est\xE1 em uso", { status: 400 });
        if (!users[authUser].isAdmin && oldUsername !== authUser) {
          return new Response("Forbidden: Cannot rename other user", { status: 403 });
        }
        users[normalizedNew] = users[oldUsername];
        delete users[oldUsername];
        await KV.put("calendar_users", JSON.stringify(users));
        return new Response("OK");
      }
      if (action === "changePassword") {
        const userToUpdate = targetUser || authUser;
        if (!users[userToUpdate])
          return new Response("User not found", { status: 404 });
        if (!users[authUser].isAdmin && userToUpdate !== authUser) {
          return new Response("Forbidden: Cannot change other user's password", { status: 403 });
        }
        users[userToUpdate].password = newPassword;
        await KV.put("calendar_users", JSON.stringify(users));
        return new Response("OK");
      }
      if (!users[authUser].isAdmin) {
        return new Response("Forbidden: Admin only", { status: 403 });
      }
      if (action === "create") {
        if (!username || !displayName || !department)
          return new Response("Campos obrigat\xF3rios faltando", { status: 400 });
        if (users[username])
          return new Response("Usu\xE1rio j\xE1 existe", { status: 400 });
        users[username] = { password: "1234", isAdmin: false, displayName, department };
        await KV.put("calendar_users", JSON.stringify(users));
        return new Response("Created", { status: 201 });
      }
      if (action === "updateRole") {
        if (!users[targetUser])
          return new Response("Not found", { status: 404 });
        if (targetUser === "robson")
          return new Response("N\xE3o permitido", { status: 403 });
        users[targetUser].isAdmin = !!isAdmin;
        await KV.put("calendar_users", JSON.stringify(users));
        return new Response("OK");
      }
      if (action === "delete") {
        if (!users[targetUser])
          return new Response("Not found", { status: 404 });
        if (targetUser === authUser || targetUser === "robson")
          return new Response("N\xE3o permitido", { status: 403 });
        delete users[targetUser];
        await KV.put("calendar_users", JSON.stringify(users));
        return new Response("OK");
      }
      return new Response("Invalid action", { status: 400 });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequest6, "onRequest");

// ../.wrangler/tmp/pages-OHURsP/functionsRoutes-0.5641327732004011.mjs
var routes = [
  {
    routePath: "/api/clear",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/comments",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/data",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/logs",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/sectors",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/api/users",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-ryUyzS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-ryUyzS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.7504058347689151.mjs.map
