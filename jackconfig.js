
var json = require("json");
var util = require("util");
var jack = require("jack");
var Template = require("./json-template").Template;
var fs = require("file");

var path = fs.path(module.path);

var data = json.parse(path.resolve('defs.json').read());
var defs = util.values(data.defs);
var pageTemplate = new Template(path.resolve('templates/index.html').read());
var defsTemplate = new Template(path.resolve('templates/defs.html').read());
var index =  function (env) {
    var query = '';
    env.QUERY_STRING.split('&').forEach(function (pair) {
        var parts = pair.split('=');
        var key = parts.shift();
        var value = decodeURIComponent(parts.join('='));
        if (key == "q")
            query = value;
    });
    var order = defs;
    if (query.length)
        order = bfs(data.defs, query);
    print(json.encode(order, null, 4));
    return [
        200,
        {'Content-type': 'text/html'},
        [pageTemplate.expand({
            q: query,
            defs: defsTemplate.expand({defs: order})
        })]
    ];
};

function bfs(dict, start, visited) {
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
            [fs.open(path, 'b').read()]
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
    index,
    {
        "hr.png": exports.File("media/hr.png"),
        "index.js": exports.File("media/index.js"),
        "index.css": exports.File("media/index.css"),
    }
));

