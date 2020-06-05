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

const DataCache = require( "./data-cache.js" );
const FileCache = require( "./file-cache.js" );

module.exports = {

	escape_backslashes: function(s, count){
		count = count || 1;
		var repl = "";
		for( var i = 0; i< count; i++ ) repl += '\\';
		return s.replace( /\\/g, repl );
	},

	/**
	 * add an import to document head.  will remove/re-add.
	 */
	install_html_component: function( href ){

		var nodes = document.querySelectorAll( "link[rel='import']");
		for( var i = 0; i< nodes.length; i++ ){
			if( nodes[i].href === href ) nodes[i].parentElement.removeChild(nodes[i]);
		}
		var node = document.createElement( "link" );
		node.setAttribute( "rel", "import" );
		node.setAttribute( "href", href );
		document.querySelector( "head" ).appendChild( node );
		
	},

    /**
     * is needle === haystack, or is needle _in_ haystack,
     * or if need is an array, is one element of needle === or in haystack
     */
    array_cross_match: function( haystack, needle ){
        if( !Array.isArray( needle )) needle = [needle];
        return needle.some( function( test ){
            return ( Array.isArray( haystack ) && haystack.includes( test )) || haystack === test;
        });
    },

	/**
	 * patch for file paths when running in a hybrid asar packed/unpacked
	 * environment.  we generally use __dirname to map paths, but that will
	 * fail for our unpacked binaries.
	 * 
	 * broken out to normalize.
	 */
	patch_asar_path: function( original_path ){

		// (1) should almost certainly not be /g.
		// (2) is it guaranteed to be "app.asar"? 
		
		return original_path.replace( /app\.asar/g, "app.asar.unpacked" );

	},

	init: function(R){
		this.data_cache = new DataCache(R);
		this.file_cache = new FileCache();
		return this;
	}

};


