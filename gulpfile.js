const gulp = require('gulp');
const webpack = require('webpack-stream');
require('gulp-babel');
require('babel-loader');
require('html-loader');
const sass = require('gulp-sass')(require('sass'));
const maps = require('gulp-sourcemaps');
const cleanCss = require('gulp-clean-css');

function htmldev(cb) {
  gulp.src(__dirname + '/app/**/*.html')
    .pipe(gulp.dest(__dirname + '/build'));
  cb();
}

function cssdev(cb) {
  gulp.src(__dirname + '/app/**/*.css')
    .pipe(gulp.dest(__dirname + '/build'));
  cb();
}

function sassdev(cb) {
  gulp.src(__dirname + '/app/**/*.scss')
    .pipe(maps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(cleanCss())
    .pipe(maps.write('./'))
    .pipe(gulp.dest(__dirname + '/build'));
  cb();
}

function imagesdev(cb) {
  gulp.src(__dirname + '/app/images/**/*')
    .pipe(gulp.dest(__dirname + '/build/images'));
  cb();
}

function favicondev(cb) {
  gulp.src(__dirname + '/favicon.ico')
    .pipe(gulp.dest(__dirname + '/build/'));
  cb();
}

function webpackdev(cb) {
  gulp.src('./app/js/client.js')
    .pipe(webpack({
      // module: {
      //   loaders: [
      //     {
      //       test: /\.js$/,
      //       loader: 'babel-loader'
      //     }
      //   ]
      // },
      output: {
        filename: 'bundle.js'
      },
      mode: "development"
    }))
    .pipe(gulp.dest(__dirname + '/build'));
  cb();
}

function webpacktest(cb) {
  gulp.src(__dirname + '/app/test/test_entry.js')
    .pipe(webpack({
      module: {
        loaders: [
          {
            test: /\.html$/,
            loader: 'html-loader'
          }
        ]
      },
      output: {
        filename: 'test_bundle.js'
      }
    }))
    .pipe(gulp.dest(__dirname + '/app/test/bndl/'));
  cb();
}

exports.builddev = gulp.series(webpackdev, htmldev, cssdev,
  sassdev, imagesdev, favicondev);
exports.default = gulp.series(exports.builddev);
