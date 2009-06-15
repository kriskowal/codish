
var util = require('util');
var fs = require('file');
var json = require('json');
var dir = fs.path(module.path).resolve('.');
var defsDir = dir.join('defs');
var defs = {};
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
        line = line.replace(/<i>/g, '[').replace(/<\/i>/g, ']')
        while (/^[\w\s]+: /.test(line)) {
            var parts = line.split(': ');
            var note = parts.shift();
            note = {
                'replaces': 'aka',
                'use': 'see'
            }[note] || note;
            line = parts.join(': ');
            if (/, /.test(line) && !/\[/.test(line) && !/\.$/.test(line)) {
                line = '<i><a href="?q=' + note + '">' + note + '</a>:</i> ' + line.split(', ').map(function (term) {
                    util.getset(notes, note, []).push(term);
                    refs[term] = term;
                    return '[' + term + ']';
                }).join(', ');
            } else if (!/\[/.test(line) && !/\.$/.test(line)) {
                util.getset(notes, note, []).push(line);
                line = '<i><a href="?q=' + note + '">' + note + '</a>:</i> [' + line + ']';
            } else {
                line = '<i><a href="?q=' + note + '">' + note + '</a>:</i> ' + line + '';
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
        meanings.push(line);
    });

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

