"use strict";

const EventEmitter = require("events");

/**
 * Adapts the output of the MCP23017 IC to a data value for a specific pin.
 *
 * The emitter on this object will
 */
module.exports = function(config) {
    const me = this;
    this.emitter = new EventEmitter();

    console.log("Starting MCP23017 In Adaptor: ", config );

    config.mcp23017.emitter.on(config.pin, function(val) {
//        console.log("MCP23017 In Adaptor: ", { pin: me.config.pin, val: val } );
        me.emitter.emit('data', val);
    });
}