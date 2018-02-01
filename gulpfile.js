var gulp = require("gulp");
var watch = require("gulp-watch");
var beautify = require("gulp-beautify");
var eslint = require('gulp-eslint');

gulp.task("lint", function(){
  return gulp.src("lib/**/*.js")
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task("spec-lint", function(){
  return gulp.src("spec/*.js")
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(beautify({indent_size:4, indent_with_tabs:true}))
    .pipe(gulp.dest('./spec/'));
});

gulp.task("pretty-code", function(){
	return gulp.src("lib/**/*.js")
		.pipe(beautify({indent_size:4, indent_with_tabs:true}))
		.pipe(gulp.dest("./lib/"));

});

gulp.task("pretty-bin", function(){
	return gulp.src("bin/*.js")
		.pipe(beautify({indent_size:4, indent_with_tabs:true}))
		.pipe(gulp.dest("./bin/"));

});

gulp.task("lint-easy", function(){
  return gulp.src("src/*.js")
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task("watch", function(){
  return gulp.watch("lib/**/*.js", {ignoreInitial: false}, ["lint-easy"]);
});
