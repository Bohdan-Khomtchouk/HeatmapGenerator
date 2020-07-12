ConstructR
==========

![ConstructR logo][logo]

Electron-based R shell.

Install
=======

To install and run without building from scratch, grab an installer
for your platform from the [releases][5] page.


Build
=====

### Prerequisites ###

 * git https://git-scm.com

 * node (and npm) https://nodejs.org

 * R https://www.r-project.org/
 
   Either your distribution's R package or R built from source. 
   If you build from source, make sure to use the configure option 
   `--enable-R-shlib` to build shared libraries.  On Windows, the 
   binary install of R is fine.

   R must be visible on your PATH for the build to succeed.

 * Build tools: the commands below will build a native node add-on
   ([controlr][1]) and a binary R package ([jsclientlib][2]).  You 
   need standard build tools for C/C++.  On Windows, the R package 
   will be installed as a prebuilt binary, so you don't need the 
   [Rtools][3] package.

### Download, Build and Run ###

Note: on Windows, these instructions will work if you are using a 
unix-like shell (like [Git bash][4]).  If you are 
using the Windows shell ("Command Prompt"), you have to turn around
the slashes.  See below.

```bash
# download
git clone https://github.com/sdllc/constructr.git

# install packages
cd constructr
npm install

# install modules and build.  
node_modules/.bin/gulp

# build and install the `jsclientlib` R library
node_modules/.bin/gulp jsclientlib

# now run
node_modules/.bin/electron app

# alternatively, run with livereload:
# node_modules/.bin/gulp watch
```

Windows shell version:
```bat
REM * download
git clone https://github.com/sdllc/constructr.git

REM * install packages
cd constructr
npm install

REM * install modules and build.  
node_modules\.bin\gulp

REM * build and install the `jsclientlib` R library
node_modules\.bin\gulp jsclientlib

REM * now run
node_modules\.bin\electron app

REM * alternatively, run with livereload:
REM * node_modules\.bin\gulp watch
```

[logo]: https://cdn.rawgit.com/sdllc/constructr/master/build/icon-inverse.svg

[1]: https://github.com/sdllc/controlr
[2]: https://github.com/sdllc/jsclientlib
[3]: https://cran.r-project.org/bin/windows/Rtools/
[4]: https://git-scm.com
[5]: https://github.com/sdllc/constructr/releases

