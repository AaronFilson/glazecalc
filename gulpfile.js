const gulp = require('gulp');
const webpack = require('webpack-stream');
const sass = require('gulp-sass')(require('sass'));
const cleanCss = require('gulp-clean-css');

function htmldev() {
  return gulp.src(__dirname + '/app/**/*.html')
    .pipe(gulp.dest(__dirname + '/build'));
}

function cssdev() {
  return gulp.src(__dirname + '/app/**/*.css')
    .pipe(gulp.dest(__dirname + '/build'));
}

function sassdev() {
  return gulp.src(__dirname + '/app/**/*.scss', { sourcemaps: true })
    // bootstrap-sass 3 needs @import, so silence that deprecation and warnings from its code.
    .pipe(sass({ quietDeps: true, silenceDeprecations: ['import'] }).on('error', sass.logError))
    .pipe(cleanCss())
    .pipe(gulp.dest(__dirname + '/build', { sourcemaps: '.' }));
}

function imagesdev() {
  return gulp.src(__dirname + '/app/images/**/*', { encoding: false })
    .pipe(gulp.dest(__dirname + '/build/images'));
}

function favicondev() {
  return gulp.src(__dirname + '/favicon.ico', { encoding: false })
    .pipe(gulp.dest(__dirname + '/build/'));
}

function webpackdev() {
  return gulp.src('./app/js/client.js')
    .pipe(webpack({
      output: {
        filename: 'bundle.js'
      },
      mode: 'development'
    }))
    .pipe(gulp.dest(__dirname + '/build'));
}

function webpacktest() {
  return gulp.src(__dirname + '/app/test/test_entry.js')
    .pipe(webpack({
      module: {
        rules: [
          {
            test: /\.html$/,
            loader: 'html-loader'
          }
        ]
      },
      output: {
        filename: 'test_bundle.js'
      },
      mode: 'development'
    }))
    .pipe(gulp.dest(__dirname + '/app/test/bndl/'));
}

exports.builddev = gulp.series(webpackdev, htmldev, cssdev,
  sassdev, imagesdev, favicondev);
exports.webpacktest = webpacktest;
exports.default = gulp.series(exports.builddev);
