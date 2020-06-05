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

const PubSub = require( "pubsub-js" );
const ipcRenderer = require('electron').ipcRenderer;

/**
 * download a file, using electron utilities and 
 * (optionally) adding a progress bar.
 */
const download_file = function(core, opts){
	
	return new Promise( function( resolve, reject ){
		
		let progressbar = null;

		if( !opts.quiet ){
			PubSub.publish( core.Constants.SHELL_MESSAGE, [ `\n${core.Messages.TRYING_URL}: ${opts.url}\n` ]);
			progressbar = core.Packages.progress.createProgressBar({
				label: function(p){
					return ( p >= 100 ) ? core.Messages.DOWNLOAD_COMPLETE : `${core.Messages.DOWNLOADING}: ${p}%`;
				}, 
				min: 0, max: 1, value: 0, width: 30
			});
			PubSub.publish( core.Constants.SHELL_INSERT_NODE, [progressbar.node, true]);
		}

		ipcRenderer.on( 'download-progress', function( event, args ){
			if( progressbar ){
				if( progressbar.max() === 1 ) progressbar.max( args.total );
				progressbar.value( args.received );
			}
		});

		ipcRenderer.on( 'download-complete', function( event, args ){
			
			if( args.state !== "completed" ){
				PubSub.publish(Constants.SHELL_MESSAGE, [
					`\n${core.Messages.DOWNLOAD_FAILED}: ${args.state}\n` 
				]);
			}

			ipcRenderer.removeAllListeners( "download-complete" );
			ipcRenderer.removeAllListeners( "download-progress" );
			
			resolve( args.state === "completed" ? 0 : -1 );

		});
		
		ipcRenderer.send( "download", opts );
		
	});
		
};

module.exports = {
	init: function(core){
		core.Hooks.install( "sync-request-p", function(hook, req){
			let cmd = req.command ? req.command : req.$data ? req.$data.command : null;
			if( cmd === "download" ){
				return download_file( core, req.$data.arguments.$data );
			}
			return null;
		});
	}
};

