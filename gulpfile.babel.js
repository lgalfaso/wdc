'use strict';
import gulp from 'gulp';
import del from 'del';
import path from 'path';
import runSequence from 'run-sequence';
import fs from 'fs';
import gulpLoadPlugins from 'gulp-load-plugins';

// HELPER FUNCTIONS
let isFlagPositive = (value) => value !== undefined && value !== 'false';

let isEnvEnabled = name => isFlagPositive(process.env[name]);

function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}

// BUILD CONFIGURATION
let buildDir = '.tmp';
let buildPublicDir = '.tmp/public';

// BUILD SETTINGS
let production = isEnvEnabled('PRODUCTION');
let minifyCode = production || isEnvEnabled('MINIFY_CODE');
let npmProduction = isEnvEnabled('NPM_CONFIG_PRODUCTION');

let showFilesLog = true;

// LOG SETTINGS
console.log(`Production mode: ${production}`);
console.log(`Minifying code: ${minifyCode}`);
// The following means devDependencies are not installed
console.log(`NPM in production mode: ${npmProduction}`);

// Get gulp plugins
let conf = npmProduction ? {
  scope: ['dependencies']
} : undefined; //

let plugins = gulpLoadPlugins(conf);

gulp.task('default', ['build']);

gulp.task('build', ['build-css', 'build-js', 'merge-widget-configs',
  'copy-templates-json', 'build-template-images', 'copy-static-files']);

gulp.task('bower-install', ['generate-bower-json'], () =>
  plugins.bower({cwd: '.tmp'}, [undefined, {
    'forceLatest': true
  }]).on('error', handleError)
);

// collect all bower-dependencies in collectedBowerDeps object
let widgetsWithDeps = []
let widgetBowerPackagePrefix = 'widget-';
gulp.task('collect-widgets-with-deps', () =>
  gulp.src('assets/widgets/*/bower.json')
    .pipe(plugins.jsonEditor(json => {
      widgetsWithDeps.push(json.name);
      return json;
    }))
    .on('error', handleError)
);

gulp.task('generate-bower-json', ['collect-widgets-with-deps'], () =>
  gulp.src('bower.json')
    .pipe(plugins.jsonEditor(json => {
      for (let dep in widgetsWithDeps) {
        let widgetName = widgetsWithDeps[dep];
        json.dependencies[widgetBowerPackagePrefix + widgetName] = `../assets/widgets/${widgetName}/`;
      }
      json.resolutions = json.dependencies;
      return json;
    }))
    .on('error', handleError)
    .pipe(plugins.extend('bower.json'))
    .pipe(gulp.dest('.tmp'))
);

gulp.task('build-components', ['bower-install'], () => {
  let removeFilter = plugins.filter([
    '**/*',
    '!**/test/**',
    '!**/examples/**',
    '!**/grunt/**',
    '!**/tests/**',
    '!**/*.md',
    '!**/*.gzip',
    '!**/*.scss',
    '!**/*.ts',
    '!**/*.coffee',
    '!**/package.json',
    '!**/grunt.js',
    '!**/bower.json'
  ]);

  return gulp.src([
    '.tmp/bower_components/**/*',
    `!.tmp/bower_components/${widgetBowerPackagePrefix}*/**`
  ])
    .pipe(plugins.cached('build-components'))
    .pipe(removeFilter)
    .pipe(plugins.if(showFilesLog, plugins.size({showFiles: true, title: 'components'})))
    .on('error', handleError)
    .pipe(gulp.dest(`${buildPublicDir}/components`));
});

gulp.task('build-css', ['build-less', 'build-components'], () => {
  if (!minifyCode) {
    return;
  }

  return gulp.src(`${buildPublicDir}/**/*.css`)
    .pipe(plugins.cached('build-css'))
    .on('error', handleError)
    .pipe(plugins.if(showFilesLog, plugins.size({showFiles: true, title: 'CSS'})))
    .pipe(gulp.dest(buildPublicDir));
});

gulp.task('build-less', () =>
  gulp.src('assets/css/**/*.less')
    .pipe(plugins.cached('build-less'))
    .pipe(gulp.dest(`${buildPublicDir}/css`))
    .pipe(plugins.lessSourcemap())
    .on('error', handleError)
    .pipe(plugins.if(showFilesLog, plugins.size({showFiles: true, title: 'LESS -> CSS'})))
    .pipe(gulp.dest(`${buildPublicDir}/css`))
);

gulp.task('build-template-cache', () =>
  gulp.src(['assets/**/*/*.html', 'assets/**/*/*.html'])
    .pipe(plugins.if(minifyCode, plugins.minifyHtml({empty: true})))
    .on('error', handleError)
    .pipe(gulp.dest(buildPublicDir))
    .pipe(plugins.angularTemplatecache('templates.js', {
      standalone: true,
      moduleSystem: 'RequireJS'
    }))
    .pipe(gulp.dest(`${buildPublicDir}/js`))
);

gulp.task('copy-es6-polyfill', () =>
  gulp.src('node_modules/gulp-babel/node_modules/babel-core/browser-polyfill.js')
    .pipe(plugins.rename('es6-polyfill.js'))
    .pipe(plugins.changed(`${buildPublicDir}/js`))
    .pipe(gulp.dest(`${buildPublicDir}/js`))
);

gulp.task('build-js', ['build-template-cache', 'build-widgets', 'build-components',
  'compile-js', 'annotate-js', 'copy-es6-polyfill'], () => {
  if (!minifyCode) {
    return;
  }

  gulp.src(`${buildPublicDir}/**/*.js`)
    .pipe(plugins.cached('build-js'))
    .pipe(plugins.plumber())
    .pipe(plugins.if(minifyCode, plugins.uglify()))
    .on('error', handleError)
    .pipe(plugins.if(showFilesLog, plugins.size({showFiles: true, title: 'JS'})))
    .pipe(gulp.dest(buildPublicDir));
});

gulp.task('compile-js', () =>
  gulp.src('assets/js/**/*.js')
    .pipe(plugins.cached('compile-js'))
    .pipe(plugins.changed(`${buildPublicDir}/js`))
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel())
    .on('error', handleError)
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest(`${buildPublicDir}/js`))
);

gulp.task('annotate-js', ['build-template-cache', 'build-widgets-js', 'build-components', 'compile-js'], () =>
  gulp.src([`${buildPublicDir}/**/*.js`, `!${buildPublicDir}/components/**/*`])
    .pipe(plugins.cached('annotate-js'))
    .pipe(plugins.ngAnnotate())
    .on('error', handleError)
    .pipe(gulp.dest(buildPublicDir))
);

gulp.task('move-widgets', () =>
  // Move everything except JS-code which is handled separately in build-widgets-js
  gulp.src(['assets/widgets/**', '!assets/widgets/**/*.js'])
    .pipe(plugins.cached('move-widgets'))
    .pipe(plugins.changed(`${buildPublicDir}/widgets`))
    .pipe(gulp.dest(`${buildPublicDir}/widgets`))
);

gulp.task('build-widgets-js', ['move-widgets'], () =>
  gulp.src('assets/widgets/**/*.js')
    .pipe(plugins.cached('build-widgets-js'))
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel())
    .on('error', handleError)
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest(`${buildPublicDir}/widgets`))
);

gulp.task('build-widgets', ['move-widgets', 'build-widgets-js']);

gulp.task('merge-widget-configs', () =>
   gulp.src('assets/widgets/**/widget.json')
    .pipe(plugins.tap(file => {
      let dir = path.basename(path.dirname(file.path));
      file.contents = Buffer.concat([
        new Buffer(`{"${dir}": `),
        file.contents,
        new Buffer('}')
      ]);
    }))
    .pipe(plugins.extend('widgets.json'))
    .on('error', handleError)
    .pipe(gulp.dest(`${buildPublicDir}/widgets`))
);

gulp.task('copy-templates-json', () =>
  gulp.src('assets/templates/templates.json')
    .pipe(plugins.cached('copy-templates-json'))
    .pipe(gulp.dest(`${buildPublicDir}/templates`))
);

gulp.task('build-template-images', () =>
  gulp.src('assets/templates/**/icon.png')
    .pipe(plugins.cached('build-template-images'))
    .pipe(gulp.dest(`${buildPublicDir}/templates`))
);

gulp.task('copy-static-files', () =>
  gulp.src([
    'assets/img/**', 'assets/data/**',
    'assets/favicon.ico'], {base: 'assets'})
    .pipe(plugins.cached('copy-static-files'))
    .pipe(gulp.dest(buildPublicDir))
);

if (!npmProduction) {
  gulp.task('test', ['unit-test']);

  gulp.task('unit-test', ['copy-es6-polyfill',
    'build-template-cache',
    'build-components'], function (done) {
    let karma = require('karma').server;
    let conf = {
      configFile: `${__dirname}/karma.conf.js`,
      singleRun: true
    };
    conf.browsers = ['PhantomJS'];
    karma.start(conf, done);
  });

  gulp.task('coveralls', () =>
    gulp.src(`${buildDir}/coverage/**/lcov.info`, {base: `${buildDir}/..`})
      .pipe(plugins.coveralls())
  );

  gulp.task('e2e-test', ['e2e-run-test']);

  // Downloads the selenium webdriver
  gulp.task('webdriver-update', plugins.protractor.webdriver_update);

  gulp.task('e2e-run-test', ['webdriver-update', 'build', 'build-e2e-test'], function (cb) {
    let called = false;
    gulp.src([`${buildDir}/test/e2e/**/*Spec.js`])
      .pipe(plugins.protractor.protractor({
        configFile: `${__dirname}/protractor.conf.js`
      }))
      .on('error', e => {
        if (isEnvEnabled('CI') && !fs.existsSync('protractor.log')) {
          console.log('protractor.log not found!');
          console.log('Skipping end-to-end tests...');
          if (!called) {
            called = true;
            cb();
          }
        } else {
          throw e;
        }
      })
      .on('end', () => {
        if (!called) {
          called = true;
          cb();
        }
      });
  });

  gulp.task('build-e2e-test', () =>
    gulp.src('test/e2e/**/*.js')
      .pipe(plugins.changed(`${buildDir}test/e2e`))
      .pipe(plugins.babel())
      .pipe(gulp.dest(`${buildDir}/test/e2e`))
  );

  gulp.task('docs', () =>
    plugins.shell.task([
      `node` +
      ` ${path.join('node_modules', 'angular-jsdoc', 'node_modules', 'jsdoc', 'jsdoc.js')}` +
      ` -c ${path.join('node_modules', 'angular-jsdoc', 'conf.json')}` + // config file
      ` -t ${path.join('node_modules', 'angular-jsdoc', 'template')}` + // template file
      ` -d ${path.join('docs')}` + // output directory
      ` -r ${path.join('assets', 'js')}` + // source code directory
      ` README.md`
    ])().on('error', handleError)
  );

  let bump = importance =>
    // get all the files to bump version in
    gulp.src(['./package.json', './bower.json'])
      // bump the version number in those files
      .pipe(plugins.bump({type: importance}))
      // save it back to filesystem
      .pipe(gulp.dest('./'))
      // commit the changed version number
      .pipe(plugins.git.commit('Bumps package version'))

      // read only one file to get the version number
      .pipe(plugins.filter('package.json'))
      // **tag it in the repository**
      .pipe(plugins.tagVersion());


  gulp.task('patch', () => bump('patch'));

  gulp.task('feature', () => bump('minor'));

  gulp.task('release', () => bump('major'));

  // Rerun the task when a file changes
  gulp.task('watch', ['build'], () =>
    gulp.watch(['assets/**', 'test/**', 'bower.json'], ['build'])
  );

  // Rerun the task when a file changes
  gulp.task('watch-unit-test', ['build'], done => {
    let karma = require('karma').server;
    let conf = {
      configFile: `${__dirname}/karma.conf.js`,
      singleRun: false
    };
    if (process.env.CI) {
      conf.browsers = ['PhantomJS'];
    }
    karma.start(conf, done);
  });
}

gulp.task('clean', done =>
  del([buildDir], done)
);