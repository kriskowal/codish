
var util = require('util');
var chiron = require('chiron/base');

exports.lower = function (name, del) {
    return chiron.lower(name, del).replace(new RegExp(del + "(\\d)", "g"), function (i, j, pos) {
        return name.substring(pos).match(/\d/)[0];
    });
};

var markup = exports.markup = function (line, refs, notes) {
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
            line = '<i><a href="/' + note + '">' + note + '</a>:</i> ' + line.split(', ').map(function (term) {
                util.getset(notes, note, []).push(term);
                refs[term] = term;
                return '[' + term + ']';
            }).join(', ');
        } else if (!/\[/.test(line) && !/\.$/.test(line) && /^[\w\s]+$/.test(line)) {
            util.getset(notes, note, []).push(line);
            line = '<i><a href="/' + note + '">' + note + '</a>:</i> [' + line + ']';
        } else {
            line = '<i><a href="/' + note + '">' + note + '</a>:</i> ' + markup(line, refs, notes) + '';
        }
    }

    while (/\[[^\]]+\]/.test(line)) {
        var term = line.match(/\[([^\]]+)\]/)[1];
        refs[term] = term;
        line = line.replace(
            /\[[^\]]+\]/,
            '<tt><a href="/' + term + '">' + term + '</a></tt>'
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

