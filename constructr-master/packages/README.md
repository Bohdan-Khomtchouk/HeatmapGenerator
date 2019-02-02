Packages
========

Package API in development.  Packages are intended to split
core and non-core functionality, but they also replace the 
plugin system so there's a single unified interface for 
default and optional packages.

Packages are like libraries but with some application- 
and runtime-specific functionality

Packages *may* (but don't have to) export an `init(core)` 
method, returning a promise.  This will be called with a parameter 
containing useful objects -- R, Settings, Settings, Hooks, 
Constants, Messages, Utilities, (...)

Dependencies
------------

Dependendies are supported using a `packageDepdendencies` array
(or object, for versioning).  The package won't be initialized
until all depdendencies are available, but it will be loaded;
so don't expect dependencies to be available before the `init()`
method is called.  


