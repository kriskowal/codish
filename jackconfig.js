
var json = require("json");
var util = require("util");
var jack = require("jack");
var Template = require("json-template").Template;
var fs = require("file");
var cache = require('chiron/cache');

var dir = fs.path(module.path).resolve('.');

var data = json.parse(dir.resolve('var/defs.json').read());
var defs = util.values(data.defs);
var pageTemplate = new Template(dir.resolve('templates/index.html').read());
var defsTemplate = new Template(dir.resolve('templates/defs.html').read());

var indexhtmlResponse = function (env) {
    return [
        200,
        {'Content-type': 'text/html'},
        [pageTemplate.expand({
            defs: indexRawHtml(env),
            q: env.query
        })]
    ];
};

var indexRawHtmlResponse = function (env) {
    return [
        200,
        {'Content-type': 'text/html'},
        [indexRawHtml(env)]
    ];
};

var indexRawHtml = function (env) {
    var query = '';
    env.QUERY_STRING.split('&').forEach(function (pair) {
        var parts = pair.split('=');
        var key = parts.shift();
        var value = decodeURIComponent(parts.join('='));
        if (key == "q")
            query = value;
    });
    env.query = query;
    return indexQuery(query);
};

var indexQuery = cache.memoize(cache.Cache({
    maxLength: 100,
    cullFactor: .8,
    log: {print:print}
}), function (query) {
    var order = defs;
    if (query.length)
        order = bfs(data.defs, query);
    return defsTemplate.expand({defs: order})
});

function bfs(dict, start, visited) {
    if (!visited) visited = {};
    var queue = [start];
    var results = [];
    while (queue.length) {
        start = queue.shift();
        if (util.object.has(visited, start)) continue;
        if (!util.object.has(dict, start)) continue;
        visited[start] = true;
        results.push(dict[start]);
        queue.push.apply(queue, dict[start].refs);
    }
    return results;
};

function dfs(dict, start, visited) {
    if (!visited) visited = {};
    if (util.object.has(visited, start)) return [];
    if (!util.object.has(dict, start)) return [];
    visited[start] = true;
    var results = [dict[start]];
    results = results.concat.apply(
        results,
        dict[start].refs.map(function (ref) {
            return bfs(dict, ref, visited);
        })
    );
    return results;
};

exports.Content = function (content, contentType) {
    return function (env) {
        return [
            200,
            {"Content-type": contentType || "text/html"},
            [content]
        ];
    };
};

exports.contentTypes = {
    ".js": "application/x-javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif"
};

exports.File = function (path) {
    var contentType = exports.contentTypes[fs.extension(path)] || 'text/plain';
    return function (env) {
        return [
            200,
            {"Content-type": contentType},
            [fs.read(String(path), 'b')]
        ];
    };
};

exports.Media = function (root) {
    return function (env) {
    };
};

exports.Fallback = function () {
    return function (env) {
        return [
            404,
            {"Content-type": "text/plain"},
            ["404 - " + env.PATH_INFO],
        ];
    };
};

exports.Route = function (root, paths, fallback) {
    if (!root)
        root = exports.Fallback();
    if (!paths)
        paths = {};
    if (!fallback)
        fallback = exports.Fallback();
    return function (env) {
        var path = env.PATH || env.PATH_INFO;
        if (!/^\//.test(path))
            throw new Error("Path did not begin with / at " + path);
        path = path.substring(1);
        if (path == "")
            return root(env);
        parts = path.split("/");
        var part = parts.shift();
        if (util.has(paths, path)) {
            env.PATH = "/" + parts.join("/");
            return paths[path](env);
        }
        return fallback(env);
    };
};

exports.app = jack.ContentLength(exports.Route(
    indexhtmlResponse,
    {
        "raw.html": indexRawHtmlResponse,
        "hr.png": exports.File(dir.resolve("media/hr.png")),
        "index.js": exports.File(dir.resolve("media/index.js")),
        "index.css": exports.File(dir.resolve("media/index.css")),
        "robots.txt": exports.File(dir.resolve("media/robots.txt")),
        "favicon.ico": exports.Fallback(),
    }
));

