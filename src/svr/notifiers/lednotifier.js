"use strict";

/**
 * A LED notifier that turns on or off an output adaptor when the on off
 * events occur.
 *
 * This could really be used to drive anything that should turn on or off
 * when an event occurs.
 */
module.exports = function(config) {
    this.notify = notify;
    this.interestedIn = interestedIn;

    // initialize the leds to any defined initial state, or low if there is none.
    config.dataAdaptor.set(config.initialState ? 1 : 0);

    function interestedIn() {
        return config.interestedIn;
    }

    function notify(event) {
        if (event.event === config.onEvent) {
            config.dataAdaptor.set(1);
        } else if (event.event === config.offEvent || event.event === "shutdown") {
            config.dataAdaptor.set(0);
        }
    }
}
