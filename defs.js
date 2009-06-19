
var chiron = require('chiron/base');
var util = require('util');
var fs = require('file');
var json = require('json');
var markup = require('markup').markup;
var lower = require("markup").lower;

var dir = fs.path(module.path).resolve('.');
var defsDir = dir.join('defs');
var defs = {};

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
            'perl: ' +
            (topic? ' [' + topic + ']: ' : '') + 
            ' ' + markup(meaning, {}, []) +
            '<a href="' + perlUrl + '">&dagger;</a>'
        );
    }
});

var python = defsDir.join('python.lang').open();
var pythonDefs = {};
python.forEach(function (line) {
    var parts = line.split(': ');
    var name = lower(parts.shift(), ' ');
    defsDir.join(name + '.txt').touch();
    line = parts.join(': ');
    util.getset(pythonDefs, name, []).push(
        line.replace(/>/g, '&gt;')
        .replace(/</g, '&lt;')
        .toLowerCase() + 
        '<a href="http://docs.python.org/library/functions.html#' + name + '">&dagger;</a>'
    );
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

    var notes = {};
    var path = defsDir.join(name);
    var name = fs.basename(name).replace(/\.txt$/, '');
    var file = path.open();
    var meanings = [];
    var refs = {};

    file.forEach(function (line) {
        line = markup(line, refs, notes);
        if (line == "")
            throw "StopIteration";
        meanings.push(line);
    });

    var html = file.read();

    if (pythonDefs[name])
        for (var i = 0; i < pythonDefs[name].length; i++)
            meanings.push(markup(pythonDefs[name][i], refs, notes));
    if (perlDefs[name])
        meanings.push(markup(perlDefs[name], refs, notes));
    if (phpDefs[name])
        meanings.push(markup(phpDefs[name], refs, notes));

    var node = defs[name] = {};
    node.name = name;
    node.def = meanings.join(' &nbsp; ');
    node.refs = unique([].concat(
        notes.see || [],
        notes.opposite || [],
        notes.related || [],
        notes.has || [], 
        notes.includes || [],
        notes.is || [],
        notes.distinct || [],
        util.keys(refs)
    ));
    node.html = html;
});

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

var data = {defs: defs};

fs.write(String(dir.resolve('var/defs.json')), json.encode(data, null, 4));

