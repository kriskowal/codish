
var util = require("util");
var lower = require("markup").lower;

var refs = {};
var meanings = {};
var notes = {};

var simplifiers = {
    'replaces': 'aka',
    'use': 'see',
    'antonym': 'opposite',
    'has': 'attrs',
    'inherits': 'is',
    'superclass': 'is',
    'subclass': 'classes',
};

function ref(from, to, type, tag) {
    if (!type)
        type = "";
    if (!tag)
        tag = "tt";
    // simplify
    var type = simplifiers[type] || type;
    if (tag == 'i') {
        to = simplifiers[to] || to;
        from = simplifiers[from] || from;
    }
    var label = to;
    from = lower(from);
    to = lower(to);
    type = lower(type);
    // backref
    var backType = {
        // reflective
        'aka': 'see',
        'see': 'aka',
        'singular': 'plural',
        'plural': 'singular',
        'classes': 'is',
        'is': 'classes',
        'implementations': 'interface',
        'interface': 'implementations',
        // symmetric
        'distinct': 'distinct',
        'opposite': 'opposite',
        'inverse': 'inverse',
        'commute': 'commute',
        'related': 'related',
        // asymmetric
        'attrs': 'pertains',
        'pertains': '',
    }[type] || 'mentioned';
    if (tag != 'i') {
        util.getset(util.getset(refs, from, {}), type, {})[to] = true;
        util.getset(util.getset(util.getset(refs, to, {}), backType, {}), from, false);
    }
    return (
        '<' + tag + '><a href="/' + attr(to) +
        '">' + html(label) + '</a></' + tag + '>'
    );
}

function parse(markup, name, type) {
    if (/</.test(markup)) {
        markup = markup.replace(/<i>/g, '[').replace(/<\/i>/g, ']');
    }
    var begin = markup.search(/(: |{{{|{{|\(\(|\[)/);
    if (begin == -1)
        return markup;
    var found = markup.match(/(: |{{{|{{|\(\(|\[)/)[0];
    var parts = ({
        ': ': colon,
        '{{{': pre,
        '{{': function (left, right) {
            var end = right.search(/}}/);
            var code = right.substring(0, end);
            return [
                end + 2,
                html(left) +
                '<tt>' +
                parse(code, name, type) +
                '</tt>'
            ];
        },
        '((': function (left, right) {
            var end = right.search(/\)\)/);
            var code = right.substring(0, end);
            return [
                end + 2,
                html(left) +
                '<i>(' +
                parse(code, name, type) +
                ')</i>'
            ];
        },
        '[': function (left, right) {
            var end = right.search(/\]/);
            var subName = right.substring(0, end);
            return [
                end + 1,
                html(left) + 
                ref(name, subName, type)
            ];
        }
    })[found](
        markup.substring(0, begin),
        markup.substring(begin + found.length),
        name,
        type
    );
    var end = parts[0];
    var formatted = parts[1];
    return (
        formatted +
        parse(
            markup.substring(begin + found.length + end),
            name,
            type
        )
    );
}

function colon(type, right, name) {
    if (
        !/^[\w\s]+$/.test(type) ||
        /\.$/.test(right) ||
        /\[/.test(right)
    ) {
        return [
            0,
            ref(name, type, '', 'i') + ': '
        ]
    } else {
        var tos = right.split(/,\s*/);
        return [
            right.length,
            ref(name, type, '', 'i') + ': ' +
            tos.map(function (to) {
                return ref(name, to, type);
            }).join(', ')
        ];
    }
}

function pre(left, right) {
    var end = right.search(/}}}/);
    var code = right.substring(0, end);
    return [end + 3, left + '<tt>' + html(code) + '</tt>'];
}

function attr(code) {
    return code.replace(' ', '+').replace('"', '&quot;');
}

function html(code) {
    return code
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace(/\-*>/, function (match) {
            if (match.length > 1)
                return '<nobr>' + match.replace('>', '&gt;') + '</nobr>';
            else
                return match.replace('>', '&gt;');
        });
}

function unique(values) {
    var results = [];
    var visited = {};
    for (var i = 0; i < values.length; i++) {
        var value = values[i];
        if (visited[value])
            continue;
        visited[value] = true;
        results.push(value);
    }
    return results;
};

var fs = require('file');
var dir = fs.path(module.path).resolve('.');
var defsDir = dir.join('defs');

var topic;
var perl = defsDir.join('perl.lang').open();
var perlUrl = perl.next();
var perlDefs = {};
perl.forEach(function (line) {
    if (/^\s*$/.test(line)) {
    } else if (/::$/.test(line)) {
        topic = line.match(/^([^:]*)/)[1];
        if (!topic.length)
            topic = undefined;
    } else if (/: /.test(line)) {
        var parts = line.split(': ');
        var term = parts.shift();
        defsDir.join(term + '.txt').touch();
        var meaning = parts.join(': ');
        perlDefs[term] = (
            '<i><a href="/perl">perl</a></i>: ' +
            (topic? ' [' + topic + ']: ' : '') + 
            ' ' + meaning +
            '<a href="' + perlUrl + '">&dagger;</a>'
        );
    }
});

var python = defsDir.join('python.lang').open();
var pythonDefs = {};
python.forEach(function (line) {
        print('python ' + line);
    var parts = line.split(': ');
    var name = lower(parts.shift(), ' ');
    defsDir.join(name + '.txt').touch();
    line = parts.join(': ');
    util.getset(pythonDefs, name, []).push(line);
});

var php = defsDir.join('php.lang').open();
var phpDefs = {};
php.forEach(function (line) {
    if (/^#/.test(line))
        return;
    var parts = line.split(': ');
    var name = lower(parts.shift(), ' ');
    defsDir.join(name + '.txt').touch();
    line = parts.join(': ');
    phpDefs[name] = line;
});

defsDir.list().forEach(function (name) {
    if (/^\./.test(name))
        return;
    if (!/\.txt$/.test(name))
        return;

    var path = defsDir.join(name);
    var name = fs.basename(name).replace(/\.txt$/, '');
    var file = path.open();

    var lines = util.getset(meanings, name, []);
    file.forEach(function (line) {
        if (line == "")
            throw "StopIteration";
        line = parse(line, name);
        if (line)
            lines.push(line);
    });

    if (pythonDefs[name]) {
        for (var i = 0; i < pythonDefs[name].length; i++)
            lines.push(
                parse(
                    pythonDefs[name][i],
                    name
                ) + 
                '<a href="http://docs.python.org/library/functions.html#' + name + '">&dagger;</a>'
            );
    }
    if (perlDefs[name])
        lines.push(perlDefs[name]);
    if (phpDefs[name])
        lines.push(parse(phpDefs[name], name));

    notes[name] = file.read();
});

var names = unique([].concat(
    Object.keys(refs),
    Object.keys(meanings)
));
names.sort();

// reconstruct definitions from data
var defs = {};
names.forEach(function (name) {
    var node = defs[name] = {};
    node.name = name;
    var types = {};
    var all = [];
    var nameMeanings = util.getset(meanings, name, []);
    var noMeanings = nameMeanings.length == 0;
    Object.keys(refs[name] || {}).forEach(function (type) {
        if (type == "mentioned")
            return;
        var meaning = Object.keys(refs[name][type]).filter(function (to) {
            util.getset(types, type, []).push(to);
            all.push(to);
            return refs[name][type][to] === false;
        }).map(function (to) {
            return ref(name, to, type);
        }).join(', ');
        if (meaning || noMeanings) {
            nameMeanings.push(
                ref(name, type, '', 'i') + 
                ': ' +
                meaning
            );
        }
    });
    var mentions = Object.keys(
        (refs[name] || {}).mentioned || {}
    ).filter(function (to) {
        return !util.has(all, to);
    });
    all.push.apply(all, mentions);
    if (mentions.length > 0 && (mentions.length < 10 || noMeanings)) {
        var meaning = mentions.map(function (to) {
            return ref(name, to, 'mentioned');
        }).join(', ');
        nameMeanings.push(
            ref(name, 'mentioned', '', 'i') + 
            ': ' +
            meaning
        );
    }
    node.html = notes[name] || "";
    node.def = (meanings[name] || []).join(' &nbsp; ');
    node.refs = unique([].concat(
        types.see || [],
        types.attrs || [],
        types.opposite || [],
        types.related || [],
        types.is || [],
        types.classes || [],
        types.includes || [],
        types.pertinent || [],
        types.distinct || [],
        types.aka || [],
        all
    ));
});

// write the index
var json = require('json');
var data = {defs: defs};
fs.write(String(dir.resolve('var/defs.json')), json.encode(data, null, 4));

