"use strict";

exports = module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        // Path configurations
        libDir: "src/",
        testDir: "test/",
        docDir: "doc/",

        releaseName: "shade.min.js",

        clean: {
            release: ["<%= releaseName %>"],
            debug: ["<%= pkg.name %>"],
            doc: ["<%= docDir %>"]
        },

        browserify: {
            debug: {
                src: "build/shade.js",
                dest: "<%= pkg.name %>",
                options: {
                    browserifyOptions: {
                        debug: true
                    }
                }
            },
            release: {
                src: "<%= libDir %>/index.js",
                dest: "<%= releaseName %>"
            }
        },

        uglify: {
            "<%= releaseName %>": "<%= releaseName %>"
        },

        mochaTest: {
            test: {
                src: ["<%= testDir %>/**/*.js"],
                options: {
                    "check-leaks": true,
                    reporter: "spec"
                }
            }
        },

        karma: {
            options: {
                files: ["<%= testDir %>/**/*.js"],
                frameworks: ["mocha"],
                browsers: ["Chrome", "Firefox"],
                preprocessors: {
                    "test/**/*.js": ["browserify"]
                },
                reporters: ["progress"],
                port: 9999
            },
            test: {
                options: {
                    background: true
                }
            },
            singleRun: {
                options: {
                    singleRun: true
                }
            }
        },

        groc: {
            src: ["<%= libDir %>/**/*.js", "README.md"],
            options: {
                "out": "<%= docDir %>/"
            }
        },

        watch: {
            test: {
                files: ["<%= libDir %>/**/*.js", "<%= testDir %>/*.js"],
                tasks: ["karma:test:run", "test-node"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-mocha-test");
    grunt.loadNpmTasks("grunt-browserify");
    // grunt.loadNpmTasks("grunt-karma");
    grunt.loadNpmTasks("grunt-groc");

    grunt.registerTask("build", ["browserify:debug", "browserify:release", "uglify"]);

    //grunt.registerTask("test", ["mochaTest:test", "karma:singleRun"]);
    grunt.registerTask("test", ["mochaTest:test"]);
    grunt.registerTask("test-watch", ["karma:test:start", "watch:test"]);

    grunt.registerTask("docs", ["groc"]);

    grunt.registerTask("prepublish", ["clean", "test", "build", "docs"]);
};
