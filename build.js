var browserify = require('browserify'),
    fs = require('fs'),
    path = require('path');

var PATH = "./lib/shade.js";

console.log("Building", PATH);

if(!fs.existsSync(PATH))
    fs.mkdirSync(path.dirname(PATH));

var stream = fs.createWriteStream(PATH);
var b = browserify();
b.add('./src/shade.js');
b.bundle().pipe(stream);

