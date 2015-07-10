"use strict";

exports = module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        // Path configurations
        libDir: "src/",
        testDir: "test/",
        docDir: "doc/",

        minifiedName: "shade-min.js",

        clean: {
            release: ["<%= minifiedName %>"],
            debug: ["<%= pkg.name %>"],
            doc: ["<%= docDir %>"]
        },

        browserify: {
            debug: {
                src: "<%= libDir %>/index.js",
                dest: "<%= pkg.name %>",
                options: {
                    browserifyOptions: {
                        debug: true,
                        standalone: "Shade"
                    }
                }
            },
            release: {
                src: "<%= libDir %>/index.js",
                dest: "<%= pkg.name %>",
                options: {
                    browserifyOptions: {
                        standalone: "Shade"
                    }
                }
            },
            minified: {
                src: "<%= libDir %>/index.js",
                dest: "<%= minifiedName %>",
                options: {
                    browserifyOptions: {
                        standalone: "Shade",
                        transform:  [['uglifyify', { global: true, ignore: [
                            "**/esprima/esprima.js",
                            "**/esutils/lib/code.js",
                            "**/src/resolve/**"
                        ]} ]]
                    }
                }
            }
        },

        concat: {
            options: {
                banner: '/*! shade.js v<%= pkg.version %> | (c) 2013-<%= grunt.template.today("yyyy") %> DFKI GmbH and contributors, www.dfki.de | https://raw.githubusercontent.com/xml3d/shade.js/master/LICENSE */'
            },
            dist: {
                src: ['<%= minifiedName %>'],
                dest: '<%= minifiedName %>'
            }
        },


        mochaTest: {
            test: {
                src: ["<%= testDir %>/*.js"],
                options: {
                    "check-leaks": true,
                    reporter: "spec"
                }
            }
        },

        watch: {
            test: {
                files: ["<%= libDir %>/**/*.js", "<%= testDir %>/*.js"],
                tasks: ["test"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-mocha-test");
    grunt.loadNpmTasks("grunt-browserify");

    grunt.registerTask("build", ["browserify:release", "browserify:minified", "concat:dist"]);
    grunt.registerTask("dev", ["browserify:debug"]);
    grunt.registerTask("test", ["mochaTest:test"]);

    grunt.registerTask("prepublish", ["clean", "test", "build"]);
};
