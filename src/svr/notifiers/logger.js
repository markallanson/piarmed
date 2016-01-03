"use strict";
module.exports = class {
    constructor(config) {
        this.config = config;
    }

    interestedIn() {
        return [ 'movement', 'tamper' ];
    }

    notify(event) {
        console.info("Event Occurred - ", event);
    }
}
