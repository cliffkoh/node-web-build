'use strict';

let build = require('@microsoft/gulp-core-build');
let typescript = require('@microsoft/gulp-core-build-typescript').typescript;

build.task('default', typescript);

build.initialize(require('gulp'));
