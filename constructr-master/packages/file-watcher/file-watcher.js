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

const fs = require("fs");
const PubSub = require( "pubsub-js" );
const untildify = require( "untildify" );
const Chokidar = require( "chokidar" );

const DEBOUNCE_TIMEOUT = 250;

const debounce_id = {};

let listener = function( change_callback, original_path, filename ){

	// here's what happens on windows: there are two events fired on
	// file change.  generally the file will be locked on the first 
	// event, and unlocked on the second event.  using a debounce
	// timer should ensure we get the second event and the file will
	// be unlocked.

	// I don't know what the expected or average wait is between events
	// 1 and 2.  an alternative would be to check for locks (how? just 
	// try to open for reading). also we can probably skip all this on 
	// linux/osx.

	if( debounce_id[original_path] ) clearTimeout( debounce_id[original_path] );
	debounce_id[original_path] = setTimeout( function(){
		change_callback.call( null, filename, original_path );
		debounce_id[original_path] = 0;
	}, DEBOUNCE_TIMEOUT );
		
};
	
var internal_watches = {};

var FileWatcher = function(){
	
	var watches = {};
	var changes = {};
	var instance = this;

	this.init = function(opts){
	
		if( opts.source ){
			
			opts.source.on( 'file.watch', function(data){
				//console.info( data );	
				if( data.$data.command === "watch" ){
					//console.info( "watch", data.$data.path );
					data.$data.path = untildify( data.$data.path );

					if( watches[data.$data.path] ) watches[data.$data.path].close();
					watches[data.$data.path] = Chokidar.watch( data.$data.path );
					if( opts.change_callback )
						watches[data.$data.path].on( 'change', listener.bind( this, opts.change_callback, data.$data.path ));
				}
				else if( data.$data.command === "unwatch" ){
					if( watches[data.$data.path] ){
						watches[data.$data.path].close();
						delete( watches[data.$data.path] );
					}
				}
				else if( data.$data.command === "clear" ){
					Object.keys( watches ).map( function( key ){
						watches[key].close();
					})
					watches = {};
				}
				else if( data.$data.command === "reloading" ){
					if( opts.notify_callback ){
						var msg;
						if( data.$data.filename === data.$data.original_path )
							msg = `FileWatcher reloading ${data.$data.filename}\n` ;
						else msg = `FileWatcher reloading ${data.$data.filename} (${data.$data.original_path})\n` ;
						if( opts.notify_callback ) opts.notify_callback.call( this, msg );
					}
				}
			});
		}
	
	};
	
}

module.exports = {
	
	init: function( core ){
		new FileWatcher().init({
			source: core.R,
			change_callback: function( path, original_path ){
				//console.info( `filewatcher cb: ${path} (${original_path})`);
				var cmd = `.js.client.file.changed('${core.Utils.escape_backslashes(path, 2)}', '${core.Utils.escape_backslashes(original_path, 2)}')`;
				//console.info( cmd );
				core.R.queued_internal( cmd ); // FIXME: should use exec?
			},
			notify_callback: function(msg){
				PubSub.publish( core.Constants.SHELL_MESSAGE, [ msg, "shell-system-information" ]);
			}
		});
		return Promise.resolve();
	},

	/** 
	 * we have a separate file watcher for internal operations
	 */
	watch_internal: function(opts){
		opts.path = untildify( opts.path );
		internal_watches[ opts.path ] = Chokidar.watch( opts.path );
		internal_watches[ opts.path ].on( 'change', listener.bind( null, opts.change, opts.path ));
	},

	unwatch_internal: function(opts){
		opts.path = untildify( opts.path );
		internal_watches[ opts.path ].close();
		delete internal_watches[ opts.path ];
	}

};



