"use strict";

let EventEmitter = require("events");
const Bunyan = require("bunyan");

/**
 * Implementation of a generic switch that can be open or closed.
 *
 * Configuration:
 * {
 *   zone: "Office", // A text string representing the zone the PIR monitors.
 *   input: {
 *     dataAdaptor: ..., // The data adaptor that reports tamper data events.
 *     mode: "normally closed|normally open" // whether tamper switch operates an normally closed, or normally open mode.
 *   }
 * }
 */
module.exports = function(config) {
    const me = this;
    const log = Bunyan.createLogger({ name: "Switch-" + config.zone });

    this.start = start;
    this.stop = stop;
    this.emitter = new EventEmitter();

    const input = config.inputs.find(function(input) { return input.name === "input" });

    const normallyOpen = "normally open";
    const normallyClosed = "normally closed"

    let switchState = 0;

    function start() {
        log.info("Starting Switch generator for zone '" + config.zone + "'");
        log.info("Circuit Mode: " + input.mode);

        input.dataAdaptor.emitter.on("data", processInput);
        input.dataAdaptor.emitter.on("error", processError);

        me.emitter.emit("zone", { event: "zone-online", zone: config.zone });
    }

    function stop() {
        log.info("Stopping Switch generator for zone '" + config.zone + "'");
        me.emitter.emit("zone", { event: "zone-offline", zone: config.zone });
        if (me.emitter) {
            me.emitter = null;
        }
    }

    function processInput(val) {
        if ((val && input.mode === normallyClosed) ||
            (!val && input.mode === normallyOpen)) {
            closeSwitch();
        } else {
            openSwitch();
        }
    }

    function closeSwitch() {
        if (switchState) {
            switchState = 0;
            me.emitter.emit("switch", { event: "switch-closed", zone: config.zone });
        }
    }

    function openSwitch() {
        if (!switchState) {
            switchState = 1;
            me.emitter.emit("tamper", { event: "switchopen", zone: config.zone });
        }
    }

    function processError(err) {
        log.info("Error while checking Switch signal.", err);
    }
};
