"use strict";

const Gpio = require("onoff").Gpio;

/**
 * Provides a simple pin based adaptor for writing to the MCP23017.
 *
 * Call the set method to set the value associated with the pin.
 */
module.exports = function(config) {
    this.set = set;

    let me = this;
    console.log("Starting GPIO Pin Out Adaptor - GPIO ", config.gpio);

    let gpio = new Gpio(config.gpio, 'out');

    /** Sets the specified value on the gpio pin. */
    function set(val) {
        console.log('Setting GPIO ' + config.gpio + ' to ' + val);
        gpio.writeSync(val);
    }
}