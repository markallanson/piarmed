"use strict"

const EventEmitter = require("events");
const Bunyan = require("bunyan");

/**
 * An input filter that keeps a buffer of the last N input values
 * and only releases the value upstream if all of them are the same.<p>
 *
 * This acts as a simple noise filter by giving time for any signal changes
 * to stabilize. This should also filter out bouncing commonly associated with
 * things like button states.
 */
module.exports = function(config) {
    const me = this;
    const log = Bunyan.createLogger({ name: "InputFilter" });

    const buffer = new Array(config.sampleSize);
    const maxIndex = config.sampleSize - 1;
    let index = 0;

    this.push = push;
    this.emitter = new EventEmitter();

    log.info("Sample Size: ", config.sampleSize);

    config.dataAdaptor.emitter.on("data", function(val) {
       if (push(val)) {
           me.emitter.emit("data", val);
       }
//       logBuffer();
    });

    /**
     * Pushes a value into the filter and identifies whether the buffer is consistent.
     * @param val The value to push.
     * @return true if all items in the filter are the same value, otherwise false.
     */
    function push(val) {
        if (index > maxIndex) {
            index = 0;
        }
        buffer[index++] = val;
        for (let i = 0; i <= maxIndex; i++) {
            if (buffer[i] != val) {
                return false;
            }
        }
        return true;
    }

    /** Logs the contents of the input filter buffer to the console. */
    function logBuffer() {
       let bufferString = "|";
       buffer.forEach(function(v) {
           bufferString += v;
       });
       bufferString += "|";
       log.info("InputFilter", bufferString);
    }
}