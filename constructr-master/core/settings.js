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

/**
 * dictionary object with a backing store (currently localStorage, 
 * but should be pluggable) that broadcasts changes.
 */

"use strict";

const PubSub = require( "pubsub-js" );

const LocalStorageBase = function(key){
	
	if( !key ) throw( "provide a key for localStorage" );
	Object.defineProperty( this, "__storage_key__", {
		enumerable: false,
		configurable: false,
		value: key
	});
	
	let json = localStorage.getItem( key );
	let js = json ? JSON.parse( json ) : {};
	Object.assign( this, js );

};

LocalStorageBase.prototype.save = function(){
	localStorage.setItem( this.__storage_key__, JSON.stringify( this ));
}

const Settings = new Proxy( new LocalStorageBase( "settings" ), {

	set: function(target, property, value, receiver) {

		if( typeof value === "undefined" || null === value ) delete target[property];
		else target[property] = value;

		// save to backing store
		target.save();

		// broadcast
		PubSub.publish( "settings-change", { key: property, val: value });

		return true;
	},

    /**
     * NOTE: we're deep-copying here.  why? to prevent accidental update
     * of object values.  There's a case in which you get an object
     * 
     * let x = Settings['x']
     * 
     * and then modify that object,
     * 
     * x.y = 1
     * 
     * which has the effect of calling set() on the Settings object because
     * it's a reference.  while that might be useful behavior, it's unintuitive
     * and different from non-object behavior.  therefore we use copies.
     */
	get: function(target, property, receiver) {
        let rslt = target[property];
        if( typeof rslt === "object"){
            // cheaper way?
            rslt = JSON.parse( JSON.stringify( rslt ));
        }
        return rslt;
	}

});

module.exports = Settings;

