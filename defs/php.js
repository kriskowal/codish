
var os = require('os');
var http = require('http');
var chiron = require('chiron/base');
var fs = require("file");
var dir = fs.path(module.path).resolve('.');
dir.join('php.tmp').open().forEach(function (line) {
    if (/^\s*#/.test(line))
        return;
    var type = chiron.lower(line) != line ? 'class' : 'function';
    var url = 'http://www.php.net/manual/en/' + type + '.' + line.replace(/_/g, '-') + '.php';
    try {
        var content = http.read(url).toString('utf-8').replace(/\n/g, ' ');
    } catch (exception) {
        if (type == "class") type = "function";
        else type = "class";
        var url = 'http://www.php.net/manual/en/' + type + '.' + line.replace(/_/g, '-') + '.php';
        try {
            var content = http.read(url).toString('utf-8').replace(/\n/g, ' ');
        } catch (exception) {
            return;
        }
    }
    var title;
    if (/"dc-title"\s*>.*?<\/span>/.test(content))
        title = content.match(/"dc-title"\s*>(.*?)<\/span>/)[1];
    else if (/<p class="para">.*?<\/p>/.test(content))
        title = content.match(/<p class="para">(.*?)<\/p>/)[1];
    else
        title = '';
    title = title.replace(/[\s\r\n]+/g, ' ').toLowerCase();
    print(chiron.lower(line, ' ') + ': ((php)) ((' + line + ')): ' + title + ' <a href="' + url + '">&dagger</a>');
    os.sleep(1);
});

