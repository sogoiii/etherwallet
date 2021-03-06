var fs           = require('fs')

var autoprefixer = require('gulp-autoprefixer')
var bump         = require('gulp-bump')
var babelify     = require('babelify')
var browserify   = require('browserify')
var buffer       = require('vinyl-buffer')
var clean        = require('gulp-clean')
var concat       = require('gulp-concat')
var cssnano      = require('gulp-cssnano')
var fileinclude  = require('gulp-file-include')
var gulp         = require('gulp')
var less         = require('gulp-less')
var notify       = require('gulp-notify')
var plumber      = require('gulp-plumber' )
var rename       = require('gulp-rename')
var runSequence  = require('run-sequence');
var shell        = require('gulp-shell')
var source       = require('vinyl-source-stream')
var uglify       = require('gulp-uglify')
var zip          = require('gulp-zip')

var app          = './app/'
var dist         = './dist/'
var dist_CX      = './chrome-extension/'


// Error / Success Handling
var onError = function(err) {
  notify.onError({
    title:    "Error: " + err.plugin,
    subtitle: "<%= file.relative %>",
    message:  "<%= error.message %>",
    sound:    "Beep",
    icon:      app + "images/icons/icon48.png",
  })(err);
  console.log(err.toString())
  this.emit('end');
}

function onSuccess(msg) {
  return {
    message: msg + " Complete! ",
    subtitle: function(file) {
      return file.relative
    },
    title:     msg + " Complete! ",
  //sound:     "Pop",
    icon:      app + "images/icons/icon48.png",
    onLast:    true
  }
}

function notifyFunc(msg) {
  return gulp.src('.', {read: false} )
    .pipe( notify ( onSuccess( msg ) ))
}



// HTML / TPL Pages
var htmlFiles = app + 'layouts/*.html'
var tplFiles  = app + 'includes/*.tpl'

gulp.task('html', function (done) {
 return gulp.src(htmlFiles)
   .pipe( plumber     ({ errorHandler: onError                }))
   .pipe( fileinclude ({ prefix: '@@', basepath: '@file'      }))
   .pipe( gulp.dest   (  dist                                  ))
   .pipe( gulp.dest   (  dist_CX                               ))
   .pipe( notify      (  onSuccess('HTML')                     ))
})



// styles: Compile and Minify Less / CSS Files
var less_watchFolder   = app     + 'styles/**/*.less'
var less_srcFile       = app     + 'styles/etherwallet-master.less'
var less_destFolder    = dist    + 'css'
var less_destFolder_CX = dist_CX + 'css'
var less_destFile      =           'etherwallet-master.css'
var less_destFileMin   =           'etherwallet-master.min.css'

gulp.task( 'styles', function () {
 return gulp.src( less_srcFile )
     .pipe( plumber     ({ errorHandler: onError                                   }))
     .pipe( less        ({ compress: false                                         }))
     .pipe( autoprefixer({ browsers: ['last 2 versions', 'iOS > 8'], remove: false }))
     .pipe( rename      (  less_destFile                                           ))
   //.pipe( gulp.dest   (  less_destFolder                                         )) // unminified css
   //.pipe( gulp.dest   (  less_destFolder_CX                                      )) // unminified css
     .pipe( cssnano     ({ autoprefixer: false, safe: true                         }))
     .pipe( rename      (  less_destFileMin                                        ))
     .pipe( gulp.dest   (  less_destFolder                                         ))
     .pipe( gulp.dest   (  less_destFolder_CX                                      ))
     .pipe( notify      (  onSuccess('Styles')                                     ))
})



// js: Browserify
var js_watchFolder   = app     + 'scripts/**/*.js'
var js_srcFile       = app     + 'scripts/main.js'
var js_destFolder    = dist    + 'js/'
var js_destFolder_CX = dist_CX + 'js/'
var js_destFile      =           'etherwallet-master.js'
var browseOpts       = { debug: true } // generates inline source maps - only in js-debug
var babelOpts        = { presets: ['es2015'], compact: false }

function bundle_js(bundler) {
  return bundler.bundle()
    .pipe( plumber   ({ errorHandler: onError }))
    .pipe( source    ( 'main.js'               ))
    .pipe( buffer    (                         ))
    .pipe( rename    ( js_destFile             ))
    .pipe( gulp.dest ( js_destFolder           ))
    .pipe( gulp.dest ( js_destFolder_CX        ))
    .pipe( notify    ( onSuccess('JS')         ))
}

gulp.task('js', function () {
  var bundler = browserify( js_srcFile ).transform( babelify, babelOpts )
  bundle_js( bundler )
})

gulp.task('js-debug', function () {
  var bundler = browserify( js_srcFile, browseOpts ).transform( babelify, babelOpts )
  bundle_js( bundler )
})




// Rebuild Static JS
var js_srcFilesStatic   = app + 'scripts/staticJS/to-compile-to-static/*.js'
var js_destFolderStatic = app + 'scripts/staticJS/'
var js_destFileStatic   =       'etherwallet-static.min.js'

gulp.task( 'staticJS', function () {
  return gulp.src ( js_srcFilesStatic )
     .pipe( plumber  ({ errorHandler: onError  }))
     .pipe( concat    ( js_destFileStatic      ))
     .pipe( uglify    (                        ))
     .pipe( gulp.dest ( js_destFolderStatic    ))
     .pipe( notify    ( onSuccess('StaticJS'   )))
})



// Copy
var imgSrcFolder          = app                 + 'images/**/*'
var fontSrcFolder         = app                 + 'fonts/*.*'
var cxSrcFiles            = app                 + 'includes/browser_action/*.*'
var cxDestFolder          = dist_CX             + 'browser_action'
var staticJSSrcFile       = js_destFolderStatic + js_destFileStatic
var jQueryFile            = './app/scripts/staticJS/jquery-1.12.3.min.js'
var readMe                = './README.md'

gulp.task('copy', ['staticJS'], function() {
 gulp.src ( imgSrcFolder )
     .pipe( gulp.dest( dist    + 'images' ))
     .pipe( gulp.dest( dist_CX + 'images' ))

 gulp.src ( fontSrcFolder )
     .pipe( gulp.dest( dist    + 'fonts'  ))
     .pipe( gulp.dest( dist_CX + 'fonts'  ))

 gulp.src ( staticJSSrcFile )
     .pipe( gulp.dest( dist    + 'js'     ))
     .pipe( gulp.dest( dist_CX + 'js'     ))

 gulp.src ( jQueryFile )
     .pipe( gulp.dest( dist    + 'js'     ))
     .pipe( gulp.dest( dist_CX + 'js'     ))

 gulp.src ( readMe )
     .pipe( gulp.dest( dist ))

 return gulp.src ( cxSrcFiles )
     .pipe( gulp.dest( cxDestFolder       ))

 .pipe( notify ( onSuccess(' Copy ' )))
})




// Clean files that get compiled but shouldn't
gulp.task('clean', function () {
  return gulp.src([
      dist_CX + 'images/fav',
      dist_CX + 'embedded.html',
      dist_CX + 'index.html',
      dist    + 'cx-wallet.html',
      dist    + 'images/icons'
    ], {read: false})
    .pipe( plumber ({ errorHandler: onError }))
    .pipe( clean   (                         ))
    .pipe( notify  ( onSuccess(' Clean ' )))
})



// Bumps Version Number
function bumpFunc(t) {
  return gulp.src([dist_CX + 'manifest.json'])
    .pipe( plumber   ({ errorHandler: onError   }))
    .pipe( bump      ({ type: t                 }))
    .pipe( gulp.dest  ( './chrome-extension'    ))
    .pipe( notify     ( onSuccess('Bump ' + t ) ))
}


// Get Version Number
var versionNum
var versionMsg
gulp.task('getVersion', function() {
  manifest = JSON.parse(fs.readFileSync(dist_CX + 'manifest.json'))
  versionNum = 'v' + manifest.version
  versionMsg    = 'Release: ' + versionNum
  //return gulp.src( './' )
  //.pipe( notify ( onSuccess('Version Number ' + versionNum ) ))
})


// zips dist folder
gulp.task('zip', ['getVersion'], function() {
 return gulp.src( dist + '*' )
    .pipe( plumber   ({ errorHandler: onError                      }))
    .pipe( zip       (  './dist-' + versionNum + '.zip'             ))
    .pipe( gulp.dest (  './releases/'                               ))
    .pipe( notify ( onSuccess('Zip Dist ' + versionNum ) ))

})
// zips cx folder
gulp.task('zipCX', ['getVersion'], function() {
  return gulp.src( dist_CX + '*' )
    .pipe( plumber   ({ errorHandler: onError                       }))
    .pipe( zip       (  './chrome-extension-' + versionNum + '.zip'  ))
    .pipe( gulp.dest (  './releases/'                                ))
    .pipe( notify ( onSuccess('Zip CX ' + versionNum ) ))
})







// add all
gulp.task('add', function () {
  return gulp.src('*.js', {read: false})
    .pipe(shell([
          'git add -A'
        ]))
    //.pipe( notify ( onSuccess('Git Add' ) ))
})

// commit with current v# in manifest
gulp.task('commit', function () {
  return gulp.src('*.js', {read: false})
    .pipe(shell([
          'git commit -m "Rebuilt and cleaned everything. Done for now."'
        ]))
    .pipe( notify ( onSuccess('Commit' ) ))
})

// commit with current v# in manifest
gulp.task('commitV', function () {
  return gulp.src('*.js', {read: false})
    .pipe(shell([
          'git commit -m " ' + versionMsg + ' "'
        ]))
    .pipe( notify ( onSuccess('Commit w ' + versionMsg ) ))
})

// tag with current v# in manifest
gulp.task('tag', ['getVersion'], function () {
  return gulp.src('*.js', {read: false})
    .pipe(shell([
          'git tag -a ' + versionNum + ' -m " ' + versionMsg + '"'
        ]))
    .pipe( notify ( onSuccess('Tagged Commit' + versionMsg ) ))
})

// Push Release to Mercury
gulp.task('push', ['getVersion'], function () {
  return gulp.src('*.js', {read: false})
    .pipe(shell([
          'git push origin mercury ' + versionNum
         ]))
    .pipe( notify ( onSuccess('Pushe' ) ))
})

// Push Live
// Pushes dist folder to gh-pages branch
gulp.task('pushLive', ['getVersion'], function () {
  return gulp.src('*.js', {read: false})
    .pipe(shell([
          'git subtree push --prefix dist origin gh-pages'
         ]))
    .pipe( notify ( onSuccess('Push Live' ) ))
})


/*
gulp html               builds html templates
     styles             compiles and minfies less
     js                 browserify, babel es2015
gulp js-debug           browserify with soruce maps, babel es2015
     staticJS           recompiles and uglifies staticJS files
     copy               runs staticJS first. copies images, fonts, and other static files to cx and dist
gulp build              html styles js (staticJS) copy
     clean              cleans files we don't need that get compiled
     getVersion         gets version from manifest
     zip                zips dist folder w/ version number
     zipCX              zips cx folder w/ version number
     bump-patch         bumps v from 0.0.1 to 0.0.2
     bump-minor         bumps v from 0.1.0 to 0.2.0
gulp buildPush          no version increase nor tags nor zips: build clean add commit push
gulp prepBump           cleans and zips it up: clean bump-patch getV zip zipCX
     add                git add
     commit             git commit without v number
     commitV            git commit with v number
     tag                git tag w/ with number
     push               git push to mercury
     pushLive           git push live to gh-pages
gulp buildBumpPush      new release but not live: build bump-patch prep add commitV tag push
gulp buildBumpPushLive  new release AND live:     build bump-patch prep add commitV tag push pushLive
*/

// Watch Tasks
gulp.task('watchJS',    function() { gulp.watch( js_watchFolder,   ['js'    ]) })
gulp.task('watchLess',  function() { gulp.watch( less_watchFolder, ['styles']) })
gulp.task('watchPAGES', function() { gulp.watch( htmlFiles,        ['html'  ]) })
gulp.task('watchTPL',   function() { gulp.watch( tplFiles,         ['html'  ]) })
gulp.task('watchCX',    function() { gulp.watch( cxSrcFiles,       ['copy'  ]) })

gulp.task('watch',       ['watchJS' , 'watchLess', 'watchPAGES', 'watchTPL', 'watchCX'])

// Build
gulp.task('build',       ['html', 'styles', 'js', 'copy'])

// Bump Version
gulp.task('bump-patch',        function() { return bumpFunc( 'patch' ) })
gulp.task('bump-minor',        function() { return bumpFunc( 'minor' ) })

// Prep for Release
gulp.task('prepBump',          function(cb) { runSequence('clean', 'bump-patch', ['zip', 'zipCX'], cb); });

// Build, Clean, Push (no v)
gulp.task('buildPush',         function(cb) { runSequence('html', 'styles', 'js', 'copy', 'clean', 'add', 'commit', 'push', cb); });

// All and Push
gulp.task('buildBumpPush',     function(cb) { runSequence(['html', 'styles', 'js'], 'copy', ['clean', 'bump-patch'], ['zip', 'zipCX'], 'add', 'commitV', 'tag', 'push', cb); });

// All and Push Live
gulp.task('buildBumpPushLive', function(cb) { runSequence(['html', 'styles', 'js'], 'copy', ['clean', 'bump-patch'], ['zip', 'zipCX'], 'add', 'commitV', 'tag', 'push', 'pushLive', cb); });


gulp.task('default',           ['build', 'watch'])
