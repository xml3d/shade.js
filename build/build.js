var browserify = require('browserify'),
    fs = require('fs'),
    path = require('path');

var outpath = path.join(__dirname, "../lib/shade.js");
var base = path.join(__dirname, "./shade.js");

console.log("Building", outpath);

if(!fs.existsSync(outpath))
    fs.mkdirSync(path.dirname(outpath));

var stream = fs.createWriteStream(outpath);
var b = browserify();
b.add(base);
b.bundle().pipe(stream);

