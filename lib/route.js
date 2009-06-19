
var util = require("util");
var fs = require("file");

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

exports.fallback = function (env) {
    return [
        404,
        {"Content-type": "text/plain"},
        ["404 - " + env.PATH_INFO],
    ];
};

exports.Fallback = function () {
    return fallback;
};

exports.Route = function (root, paths, fallback) {
    if (!root)
        root = exports.fallback;
    if (!paths)
        paths = {};
    if (!fallback)
        fallback = exports.fallback;
    return function (env) {
        var path = env.PATH_INFO;
        if (!/^\//.test(path))
            throw new Error("Path did not begin with / at " + path);
        path = path.substring(1);
        if (path == "")
            return root(env);
        parts = path.split("/");
        var part = parts.shift();
        if (util.has(paths, path)) {
            env.SCRIPT_NAME = env.SCRIPT_NAME + "/" + parts.join("/");
            return paths[path](env);
        }
        return fallback(env);
    };
};

