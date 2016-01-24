"use strict";

const EventEmitter = require("events");
const Bunyan = require("bunyan");

/**
 * Adapts the output of the MCP23017 IC to a data value for a specific pin.
 *
 * The emitter on this object will
 */
module.exports = function(config) {
    const me = this;
    this.emitter = new EventEmitter();
    const log = Bunyan.createLogger({ name: "MCP23017-InAdaptor-" + config.pin });

    log.info("Starting MCP23017 In Adaptor", config);

    config.ic.emitter.on(config.pin, function(val) {
//        log.info("MCP23017 In Adaptor: ", { pin: me.config.pin, val: val } );
        me.emitter.emit('data', val);
    });
}