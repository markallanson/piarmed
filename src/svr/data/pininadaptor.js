"use strict"

const EventEmitter = require("events");
const Gpio = require("onoff").Gpio;

/**
 * A Data adapter that can yield data from a raspberry pi gpio pin directly.
 *
 * The objects emitter, emits a 'data' event, when data is available in
 * both poll and interrupt mode. The data event is never emitted when
 * running in ondemand mode.
 *
 * If an error condition occurs, emits the 'error' event, but will continue
 * processing.
 *
 * Configuration:
 * {
 *   gpio: 9, // The GPIO number to listen to.
 *   mode: "interrupt|poll|ondemand", // what mode to read data in.
 *   pollInterval: 1000 // when in poll mode, how often to read data.
 * }
 */
module.exports = function(config) {
    this.config = config;
    this.emitter = new EventEmitter();
    this.getValue = getValue;

    let me = this;
    let gpio = null;

    // kick ourselves off in the right mode.
    if (config.mode === "interrupt") {
        startInterrupt();
    } else if (config.mode === "poll") {
        startPoll();
    } else if (config.mode === "ondemand") {
        startOnDemand();
    } else {
        throw Error("Mode " + config.mode + "requested. Only 'interrupt', 'poll' or 'ondemand' supported.");
    }

    console.log("PinInAdaptor started in " + config.mode + " mode on gpio " + config.gpio);

    /**
     * Gets the current value of the pin being monitored.
     */
    function getValue() {
        return gpio.readSync();
    }

    /** Starts the data in adaptor in poll mode. */
    function startPoll() {
        openGpio();
        if (!me.config.pollInterval) {
            throw Error("Mode set to poll but no pollInterval available");
        }
        pollRead();
    }

    /** Starts the data in adaptor in interrupt mode. */
    function startInterrupt() {
        openGpio('both');
        gpio.watch(function(err, val) {
            if (err) {
                me.emitter.emit('error', err);
            } else {
                emit(val);
            }
        });
    }

    /** Starts the data in adaptor in ondemand mode. */
    function startOnDemand() {
        openGpio();
    }

    /** Opens the gpio ready for input. */
    function openGpio(interruptMode) {
        gpio = new Gpio(me.config.gpio, 'in', interruptMode);
    }

    function pollRead() {
        setTimeout(function() {
            // emit the value then re-initiate the next read.
            emit(gpio.readSync());
            pollRead();
        }, me.config.pollInterval)
    }

    /** Emits the specified value as a data event. */
    function emit(val) {
        me.emitter.emit("data", val);
    }
}