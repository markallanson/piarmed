"use strict";

/**
 * Provides a simple pin based adaptor for writing to the MCP23017.
 *
 * Call the set method to set the value associated with the pin.
 */
module.exports = function(config) {
    this.set = set;

    console.log("Starting MCP23017 Out Adaptor - Pin ", config.pin);

    function set(val) {
        config.ic.set(config.pin, val);
    }
}