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

/**
 * utility: temporary cache for package list, mirrors, and similar.  
 * currently using localStorage, but we should think about swapping 
 * in file storage (as an option).
 * 
 * actually we might alternatively use in-memory storage: the only 
 * difference would be on startup.
 */
function DataCache(R){ 

	/**
	 * test if data is available
	 */
	this.have_cached_data = function( key, max_cache_time ){
	
		if( typeof max_cache_time === "undefined" ) max_cache_time = DEFAULT_CACHE_TIME;
		var cached = localStorage.getItem( key );
		if( cached ){
			cached = JSON.parse(cached);
			if( Date.now() - cached.retrieved > max_cache_time ){
				return false;
			}
			return true;
		}		
		return false;
		
	};

	/**
	 * generic cache/expire/fetch routine
	 */
	this.get_cached_data = function( key, max_cache_time, r_cmd, scrub ){

		var cached = localStorage.getItem( key );
		if( cached ){
			cached = JSON.parse(cached);
			if( Date.now() - cached.retrieved > max_cache_time ){
				// console.info( `${key}: flushing cache` );
				localStorage.removeItem( key );
			}
			else {
				// console.info( "using cache" );
				return new Promise( function( resolve, reject ){ resolve(cached.data); }) 
			}
		}
		
		return new Promise( function( resolve, reject ){
			R.queued_internal( r_cmd ).then( function( obj ){
				if( obj.response ){
					var data = obj.response;
					if( scrub ) data = scrub.call( this, data );		
					localStorage.setItem( key, JSON.stringify({
						retrieved: Date.now(),
						data: data
					}));
					resolve(data);        
				}
				else reject();
			}).catch( function(e){
				reject(e);
			});
		});
		
	};

	/**
	 * transpose a frame, where the data is named.
	 */
	this.transpose_frame = function(frame){
	
		var keys = Object.keys(frame);
		var len = frame[keys[0]].length;
		var rslt = new Array( len );
		for( var i = 0; i< len; i++ ){
			var o = {};
			keys.map( function( key ){
				o[key] = frame[key][i];
			});
			rslt[i] = o;
		}
		return rslt;
	};

	/**
	 * matrices are just vectors with row counts (and optionally dimnames)
	 * FIXME: this should go into some data management class
	 */
	this.build_matrix = function(data, nrow, ncol, rowdominant){
		
		var cols = new Array(ncol);
		for( var c = 0; c< ncol; c++ ){
			var rows = data.splice( 0, nrow );
			cols[c] = rows ;
		}
		if( rowdominant ) return this.transpose_array( cols );
		return cols;
	};

	/**
	 * utility method
	 */
	this.apply_names = function( mat, order, names ){
		if( order === 1 ){
			var rslt = new Array( mat.length );
			for( var i = 0; i< mat.length; i++ ){
				var o = {};
				for( var j = 0; j< names.length; j++ ){
					o[names[j]] = mat[i][j];
				}
				rslt[i] = o;
			}
			return rslt;
		}	
	}

	/**
	 * transpose an array [[]] that we get from R.  matrices and data 
	 * frames are column-dominant, for our purposes we (sometimes)
	 * want row-dominant arrays.
	 */
	this.transpose_array = function(arr){
		
		// NOTE: we expect this to be regular (i.e. no short columns)
		
		var len1 = arr.length;
		var len2 = arr[0].length;
		
		var rslt = new Array( len2 );
		for( var i = 0; i< len2; i++ ){
			var row = new Array( len1 );
			for( var j = 0; j< len1; j++ ){
				row[j] = arr[j][i];
			}
			rslt[i] = row;
		}
		
		return rslt;
	}

};

// FIXME: configurable
DataCache.prototype.DEFAULT_CACHE_TIME = ( 1000 * 60 * 120 );

module.exports = DataCache;



