
var json = require("json");
var util = require("util");
var jack = require("jack");
var Template = require("json-template").Template;
var route = require("route");
var fs = require("file");
var chiron = require('chiron/base');
var cache = require('chiron/cache');

var dir = fs.path(module.path).resolve('.');

var data = eval('(' + dir.resolve('var/defs.json').read() + ')');
var defs = util.values(data.defs);
var pageTemplate = new Template(dir.resolve('templates/index.html').read());
var defTemplate = new Template(dir.resolve('templates/def.html').read());

var lower = function (name, del) {
    return chiron.lower(name, del).replace(new RegExp(del + "(\\d)", "g"), function (i, j, pos) {
        return name.substring(pos).match(/\d/)[0];
    });
};

var indexHtmlResponse = function (env) {
    var response = indexRawHtml(env);
    if (Array.isArray(response))
        return response;
    return [
        200,
        {'Content-type': 'text/html'},
        [pageTemplate.expand({
            defs: response,
            q: env.query,
            pageNext: env.page + 1
        })]
    ];
};

var indexRawHtmlResponse = function (env) {
    var response = indexRawHtml(env);
    if (Array.isArray(response))
        return response;
    return [
        200,
        {'Content-type': 'text/html'},
        [reponse]
    ];
};

var indexRawHtml = function (env) {
    var redirect;

    var query = "";
    var page = 1;

    // look for GET args and request URL normalization
    env.QUERY_STRING.split('&').forEach(function (pair) {
        var parts = pair.split('=');
        var key = parts.shift();
        var value = decodeURIComponent(parts.join('=').replace('+', ' '));
        if (key == "q") {
            query = value;
        }
        if (key == "page") {
            page = value >>> 0;
        }
    });

    var path = env.PATH_INFO.replace(/^\//, '').split('/').shift();
    if (path) {
        redirect = true;
        query = lower(path, '-');
    }
    if (page < 1)
        return route.fallback(env);
    if (lower(query, '-') != query) {
        redirect = true;
        query = lower(query, '-');
    }

    if (redirect) {
        var location = 'http://' + env.SERVER_NAME;
        if (env.SERVER_PORT != "80")
            location += ":" + env.SERVER_PORT;
        location += '?q=' + encodeURIComponent(query);
        if (page > 1)
            location += '&page=' + page;
        return [
            301,
            {
                'Location': location,
                'Content-type': 'text/plain'
            },
            ["see: " + query]
        ];
    }

    query = lower(query, ' ');
    env.query = query;
    env.page = page;
    return indexQuery(query, page);
};

var pageLength = 50;

var indexQuery = cache.memoize(cache.Cache({
    maxLength: 100,
    cullFactor: .8
}), function (query, page) {
    var order = chiron.iter(defs);
    if (query.length)
        order = bfsIter(data.defs, query)
    // paginate
    order = order.range((page - 1) * pageLength, page * pageLength);
    return order.each(defHtml).join(' ');
});

var defHtml = function (def) {
    return defTemplate.expand(def);
};

var bfsIter = function (dict, start, visited) {
    if (!visited) visited = {};
    var queue = [start];
    return chiron.Iter(function () {
        while (queue.length) {
            start = queue.shift();
            if (util.object.has(visited, start)) continue;
            if (!util.object.has(dict, start)) continue;
            visited[start] = true;
            queue.push.apply(queue, dict[start].refs);
            return dict[start];
        }
        throw chiron.stopIteration;
    });
};

exports.app = jack.ContentLength(route.Route(
    indexHtmlResponse,
    {
        "raw.html": indexRawHtmlResponse,
        "hr.png": route.File(dir.resolve("media/hr.png")),
        "index.js": route.File(dir.resolve("media/index.js")),
        "index.css": route.File(dir.resolve("media/index.css")),
        "robots.txt": route.File(dir.resolve("media/robots.txt")),
        "favicon.ico": route.fallback,
    },
    indexHtmlResponse
));

