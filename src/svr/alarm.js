"use strict";

const EventEmitter = require('events');
const Bunyan = require("bunyan");

module.exports = function(config) {
    const me = this;
    const log = Bunyan.createLogger({ name: "AlarmController"})

    this.generators = [];
    this.start = start;
    this.stop = stop;

    function start() {
        me.emitter = new EventEmitter();

        // start generators
        for (let generator of config.generators) {
            me.generators.push(generator.inst.start());
        }
        // wire up each notifier to the events they are interested in on each generator.
        for (let notifier of config.notifiers) {
            for (let interestedIn of notifier.inst.interestedIn()) {
                for (let generator of me.generators) {
                    generator.emitter.on(interestedIn, notifier.inst.notify);
                }
            }
        }

        for (let notifier of config.notifiers) {
            notifier.inst.notify({ event: "power-on" });
        }

        // wait for kill signal, and initiate the shutdown process.
        process.on( 'SIGINT', function() {
            log.info("SIGINT (Ctrl-C)", "Initiating alarm shutdown");
            stop();
            process.exit(0);
        })

        return me.emitter;
    }

    function stop() {
        for (let generator of config.generators) {
            generator.inst.stop();
        }
        for (let notifier of config.notifiers) {
            notifier.inst.notify({ event: "shutdown" });
        }
        me.emitter = null;
    }
}