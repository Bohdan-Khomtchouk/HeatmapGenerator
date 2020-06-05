/**
 * Copyright (c) 2016 Structured Data, LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

"use strict";

const path = require( 'path' );
const fs = require( 'fs' );

const X = eval( 'require' ); // !webpack

window.fs = fs;

var PackageManager = function(){

    /** loaded packages, by name */
    this.packages = {};

    /** pending packages (missing deps) */
    this.pending = [];

    /** hold on to spec */
    this.spec = {};

    /**
     * list packages, concatenate name
     */
    this.list_packages = function( package_dir ){
        return new Promise( function( resolve, reject ){
            fs.readdir( package_dir, function(err, files){
                resolve(files.map( function( file ){
                    return path.join( package_dir, file );
                }));
            });
        });
    };

    /**
     * consolidate list/load
     */
    this.load_packages = function( dir, core, opts ){
        let instance = this;
        return new Promise( function( resolve, reject ){
            instance.list_packages( dir ).then( function( list ){
                return instance.load_packages_list( list, core, opts );
            }).then( function(){
                resolve();
            }).catch( function(e){
                reject(e);
            });
        });
    };

    /**
     * load packages, recursively, from list.
     * added dependencies.  todo: versioned deps
     * 
     * FIXME: this is turning into spaghetti.  refactor.
     */
    this.load_packages_list = function( list, core, opts ){
        
        let self = this;

        opts = opts || {};
        if( !Array.isArray( list )) list = [list];

        let platformkey = "default." + process.platform;
        let default_settings = function( prefs ){
            for( let key in prefs ){
                if( typeof core.Settings[key] === "undefined" )
                {
                    if( typeof prefs[key][platformkey] !== "undefined" )
                        core.Settings[key] = prefs[key][platformkey];
                    else if( typeof prefs[key].default !== "undefined" )
                        core.Settings[key] = prefs[key].default;
                }
            }
        };

        let init_package_js = function( pkg, elt ){

            console.info( "Installing package", pkg.name );

            // if this package has options, with defaults, 
            // enforce defaults.
            if( pkg.preferences ) default_settings( pkg.preferences );
            if( pkg.preferenceGroups ){
                for( let group in pkg.preferenceGroups ){
                    default_settings( pkg.preferenceGroups[group] );
                }
            }

            // load html files (polymer components)
            if( pkg.htmlComponents ){

                // don't blindly do that; in this case, we _want_ files from the archive

                //let source_dir = core.Utils.escape_backslashes(core.Utils.patch_asar_path(elt), 2);
                let source_dir = core.Utils.escape_backslashes(elt, 2);
                pkg.htmlComponents.forEach( function(component){
                    core.Utils.install_html_component(
                        path.join( source_dir, component ));
                })
            }

            // ok, load and call init
            self.packages[ pkg.name ] = pkg.module;
            self.spec[ pkg.name ] = pkg;

            // can use a different method name (?)
            var func = "init";
            if( pkg.init ) func = pkg.init; 

            if( pkg.module[func] ){
                let rslt = pkg.module[func].call( this, core);
                return rslt ? rslt : Promise.resolve();
            }
            else return Promise.resolve();
            
        };

        let init_package = function( pkg, elt ){
            return new Promise( function( resolve, reject ){
                init_package_js( pkg, elt ).then( function(){
                    if( pkg.R ){ 
                        let source_dir = core.Utils.escape_backslashes(
                            core.Utils.patch_asar_path(elt), 2);
                        let source_file = core.Utils.escape_backslashes(
                            core.Utils.patch_asar_path(path.join( elt, pkg.R )), 2 );
                        let cmd = `.dirname <- "${source_dir}"; source("${source_file}"); rm(.dirname);`;
                        return core.R.exec( cmd );
                    }
                    else return Promise.resolve();
                }).then( function(){
                    resolve();
                });
            });
        };

        return new Promise( function( resolve, reject ){
            if( list.length ){
                let elt = list.shift();
                self.load( elt ).then( function( pkg, err ){
                    if( pkg ){

                        // don't reload if we have already loaded
                        // (UPDATE: argument)
                        if( !opts.allow_override && self.packages[ pkg.name ]) return Promise.resolve();

                        // check deps
                        if( pkg.packageDependencies ){
                            let deps = Array.isArray( pkg.packageDependencies ) ? 
                                pkg.packageDependencies : Object.keys( pkg.packageDependencies );
                            if( deps.some( function( dep ){
                                return !self.packages[ dep ];
                            })){
                                pkg.__dirname = elt;
                                self.pending.push( pkg );
                                return Promise.resolve();
                            }
                        }
                        return init_package( pkg, elt );
                       

                    }
                    return Promise.resolve();
                }).then( function(){
                    return self.load_packages_list( list, core, opts );
                }).then( function(){
                    resolve();
                });
            }
            else {

                if( self.pending.length ){
                    for( let i = 0; i< self.pending.length; i++ ){
                        let pkg = self.pending[i];
                        let deps = Array.isArray( pkg.packageDependencies ) ? 
                            pkg.packageDependencies : Object.keys( pkg.packageDependencies );
                        if( deps.every( function( dep ){
                            return !!self.packages[ dep ];
                        })){
                            self.pending.splice( i, 1 );
                            init_package( pkg, pkg.__dirname ).then( function(){
                                return self.load_packages_list( list, core, opts );
                            }).then( function(){
                                resolve();
                            });
                            return;
                        }
                    }
                    if( self.pending.length ){
                        let unresolvable = self.pending.map( function( pkg ){
                            return pkg.name;
                        });
                        console.info( "Some packages have unresolvable dependencies:" );
                        self.pending.map( function( pkg ){
                            console.info( pkg.name + ":", pkg.packageDependencies ); 
                        });
                    }
                }
                resolve();  

            } 
        });
    };

    /**
     * load a pkg 
     */
    this.load = function(dir){
        return new Promise( function( resolve, reject ){

            // check for a pkg file
            var package_file = path.join( dir, "package.json" );
            fs.readFile( package_file, { encoding: "utf8" }, (err, contents) => {
                if (err){
                    resolve( false, err );
                    return;
                }
                try {
                    var spec = JSON.parse( contents );
                    if( !spec.main ) throw( "package main not found" );
                    if( !spec.name ) throw( "package name not found" );
                    console.info( "Loading package", spec.name);
                    spec.module = X(path.join( dir, spec.main ));
                    resolve(spec);
                }
                catch( err ){
                    console.error( err );
                    resolve( false, err );
                }
            });

        });
    };

};

module.exports = new PackageManager();
