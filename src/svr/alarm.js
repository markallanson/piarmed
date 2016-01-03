"use strict";

let EventEmitter = require('events');

module.exports = function(config) {
    const me = this;
    this.config = config;
    this.generators = [];
    this.start = start;
    this.stop = stop;

    function start() {
        me.emitter = new EventEmitter();

        // start alarms
        for (let generator of me.config.generators) {
            me.generators.push(generator.start());
        }
        // wire up each notifier to the events they are interested in on each generator.
        for (let notifier of me.config.notifiers) {
            for (let interestedIn of notifier.interestedIn()) {
                for (let generator of me.generators) {
                    generator.emitter.on(interestedIn, notifier.notify);
                }
            }
        }

        return me.emitter;
    }

    function stop() {
        this.emitter = null;
        // stop actors
        for (let generator of me.config.generators) {
            generator.stop();
        }
    }
}