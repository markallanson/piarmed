"use strict";

let EventEmitter = require("events");

/**
 * Implementation of a generic PIR that can report tamper and movement events.
 *
 * Configuration:
 * {
 *   zone: "Office", // A text string representing the zone the PIR monitors.
 *   tamper: {
 *     dataAdaptor: ..., // The data adaptor that reports tamper data events.
 *     mode: "nc|no" // whether tamper switch operates an normally closed, or normally open mode.
 *   }
 * }
 */
module.exports = function(config) {
    const me = this;
    this.config = config;
    this.start = start;
    this.stop = stop;

    function start() {
        console.log("Starting Generic PIR generator for zone '" + config.zone + "'");
        if (!me.emitter) {
            me.emitter = new EventEmitter();
            this.config.tamper.dataAdaptor.emitter.on('data', processTamper);
            this.config.tamper.dataAdaptor.emitter.on('error', processTamperError);
            // do an initial read to get the current value to start us off
            setTimeout(function() { processTamper(me.config.tamper.dataAdaptor.getValue()); }, 100);

            this.config.movement.dataAdaptor.emitter.on('data', processMovement);
            this.config.movement.dataAdaptor.emitter.on('error', processMovement);
            // do an initial read to get the current value to start us off
            setTimeout(function() { processMovement(me.config.movement.dataAdaptor.getValue()); }, 100);
        }
        return  {
            zone: me.config.zone,
            state: 'started',
            emitter: me.emitter,
        };
    }

    function stop() {
        console.log("Stopping Generic PIR generator for zone '" + config.zone + "'");
        if (me.emitter) {
            me.emitter = null;
        }
    }

    function processTamper(val) {
        if ((val && config.tamper.mode == 'nc') ||
            (!val && config.tamper.mode == 'no')) {
            me.emitter.emit("tamper", { event: "tamper-end", zone: me.config.zone });
        } else {
            me.emitter.emit("tamper", { event: "tamper-start", zone: me.config.zone });
        }
    }

    function processTamperError(err) {
        console.log("Error while checking Tamper signal.", err);
    }

    function processMovement(val) {
        if ((val && config.movement.mode == 'nc') ||
            (!val && config.movement.mode == 'no')) {
            me.emitter.emit("movement", { event: "movement-end", zone: me.config.zone });
        } else {
            me.emitter.emit("movement", { event: "movement-start", zone: me.config.zone });
        }
    }

    function processMovementError(err) {
        console.log("Error while checking Movement signal.", err);
    }
};
