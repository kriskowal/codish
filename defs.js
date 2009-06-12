
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

    var path = defsDir.join(name);
    var name = fs.basename(name);
    var file = path.open();
    var meanings = [];
    var refs = {};
    file.forEach(function (line) {
        line = line.replace(/<i>/g, '[').replace(/<\/i>/g, ']')
        if (/^\w+: /.test(line)) {
            var parts = line.split(': ');
            var note = parts.shift();
            line = parts.join(': ');
            if (/, /.test(line) && !/\[/.test(line)) {
                line = '<i>' + note + ':</i> ' + line.split(', ').map(function (term) {
                    refs[term] = term;
                    return '[' + term + ']';
                }).join(', ');
            } else if (!/\[/.test(line)) {
                line = '<i>' + note + ':</i> [' + line + ']';
            } else {
                line = '<i>' + note + ':</i> ' + line + '';
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
    node.refs = util.keys(refs);
});

var data = {defs: defs};

fs.write('defs.json', json.encode(data, null, 4));

