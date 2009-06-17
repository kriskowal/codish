
var util = require('util');
var fs = require('file');
var json = require('json');
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
    var name = parts.shift();
    defsDir.join(name + '.txt').touch();
    line = parts.join(': ');
    pythonDefs[name] = line.replace(/>/g, '&gt;').toLowerCase();
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
        meanings.push(line);
    });

    if (pythonDefs[name])
        meanings.push(markup(pythonDefs[name], refs, notes))
    if (perlDefs[name])
        meanings.push(markup(perlDefs[name], refs, notes));

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
});

function markup(line, refs, notes) {
    line = line.replace(/<i>/g, '[').replace(/<\/i>/g, ']')
    if (/^[\w\s]+: /.test(line)) {
        var parts = line.split(': ');
        var note = parts.shift();
        note = {
            'replaces': 'aka',
            'use': 'see'
        }[note] || note;
        line = parts.join(': ');
        if (
            /, /.test(line) &&
            !/\[/.test(line) &&
            !/\.$/.test(line)
        ) {
            line = '<i><a href="?q=' + note + '">' + note + '</a>:</i> ' + line.split(', ').map(function (term) {
                util.getset(notes, note, []).push(term);
                refs[term] = term;
                return '[' + term + ']';
            }).join(', ');
        } else if (!/\[/.test(line) && !/\.$/.test(line) && /^[\w\s]+$/.test(line)) {
            util.getset(notes, note, []).push(line);
            line = '<i><a href="?q=' + note + '">' + note + '</a>:</i> [' + line + ']';
        } else {
            line = '<i><a href="?q=' + note + '">' + note + '</a>:</i> ' + markup(line, refs, notes) + '';
        }
    }

    while (/\[[^\]]+\]/.test(line)) {
        var term = line.match(/\[([^\]]+)\]/)[1];
        refs[term] = term;
        line = line.replace(
            /\[[^\]]+\]/,
            '<tt><a href="?q=' + term + '">' + term + '</a></tt>'
        );
    }

    while (/{{{.*?}}}/.test(line)) {
        var code = line.match(/{{{(.*?)}}}/)[1];
        line = line.replace(
            /{{{.*?}}}/,
            '<tt>' + code + '</tt>'
        );
    }

    while (/\(\(.*?\)\)/.test(line)) {
        var code = line.match(/\(\((.*?)\)\)/)[1];
        line = line.replace(
            /\(\(.*?\)\)/,
            '<i>(' + code + ')</i>'
        );
    }

    return line;
};

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

