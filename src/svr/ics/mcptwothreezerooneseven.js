/* global toString */
"use strict"

const i2c = require("i2c-bus");
const EventEmitter = require("events");
const bunyan = require("bunyan");

/**
 * Implementation of an MCP23017 I/O Expander. <p>
 *
 * Uses a polling loop to read the status of the GPIOA and GPIOB registers
 * then for each configured pin, publishes out the current status.
 *
 * In order to simplify the pin addressing GPIOs are simply labelled
 * from 1 - 16, where 1 is the first pin of GPIOA and 16 is the last
 * pin of GPIOB.
 */
module.exports = function(config) {
    const me = this;
    const log = bunyan.createLogger({ name:"mcp23017-" + config.address });
    me.emitter = new EventEmitter();
    me.set = set;

    const i2cInstance = i2c.openSync(config.bus);

    /** Register Address for reading the A bank of GPIOs */
    const GPIOA_ADDR = 0x12;
    /** Register Address for reading the B bank of GPIOs */
    const GPIOB_ADDR = 0x13;
    /** Register Address for setting the input/output mode of GPIO bank A */
    const IODIRA_ADDR = 0x00;
    /** Register Address for reading the input/output mode of GPIO bank B */
    const IODIRB_ADDR = 0x01;
    /** Regidter for enabling the pullup resistor on the pins of GPIO bank A */
    const GPPUA_ADDR = 0x0c;
    /** Regidter for enabling the pullup resistor on the pins of GPIO bank A */
    const GPPUB_ADDR = 0x0d;

    setup();

    log.info("Polling every ms", config.pollInterval);
    pollLoop();

    /** Sets up the MCP23017 ready to go */
    function setup() {
        log.info("Setting up on Bus", config.bus);
        let inout = 0;
        let pullup = 0;
        config.pins.forEach(function(pin) {
            if (pin.direction === "in") {
                inout = inout | pinMap(pin.id);
            }
            if (pin.pullup) {
                pullup = pullup | pinMap(pin.id);
            }
        });

        log.info("Pin InOut " + inout.toString(2));
        log.info("Pin Pullups " + inout.toString(2));

        // configure the pins for Input or Output.
        // anything unconfigured will be set as an input.
        i2cInstance.writeByteSync(config.address, IODIRA_ADDR, inout);
        i2cInstance.writeByteSync(config.address, IODIRB_ADDR, inout >> 8);

        // enable the pullup resistor for any pins that have requested it.
        i2cInstance.writeByteSync(config.address, GPPUA_ADDR, pullup);
        i2cInstance.writeByteSync(config.address, GPPUB_ADDR, pullup >> 8);
    }

    /**
     * Poll the bus and report the statuses of each configured pin.
     */
    function pollLoop() {
        // TODO: Only run this loop if we have > 1 pin set to input
        setTimeout(function() {
            // read the two status bytes from the ic
            const a = i2cInstance.readByteSync(config.address, GPIOA_ADDR);
            const b = i2cInstance.readByteSync(config.address, GPIOB_ADDR);

//            log.info("GPIO A " + a.toString(2));
//            log.info("GPIO B " + b.toString(2));

            // publish the status of each cnfigured pin.
            config.pins.forEach(function(pin) {
                if (pin.direction === "in") {
                    me.emitter.emit(pin.id.toString(), decode(pin.id, pin.id > 8 ? b : a));
                }
            });

            // re-enter poll
            pollLoop();
        }, config.pollInterval);
    }

    /**
     * Sets the value on the pin to high or low.
     */
    function set(pin, val) {
        const gpioRegister = pin < 9 ? GPIOA_ADDR : GPIOB_ADDR;
        const existing = i2cInstance.readByteSync(config.address, gpioRegister)
        var updated = encode(pin, val, existing);
        i2cInstance.writeByteSync(config.address, gpioRegister, updated);
    }

    /**
     * Calculates the updated value for the gpio register.
     *
     * Example: Currently Pin 1 and 8 are on, We want to turn on pin 4
     * 10000001 | pinMap(4)
     * 10000001 | 00001000
     * 10001001
     *
     * Example: Currently Pin 1 and 8 and 4 are on, We want to turn off pin 4
     * 10001001 & ~pinMap(4)
     * 10001001 & ~00001000
     * 10001001 & 11110111
     * 10000001
     */
    function encode(pin, val, existing) {
        if (val) {
            return existing | pinMap(pin);
        } else {
            return existing & ~pinMap(pin);
        }
    }

    /**
     * Decode the state of the pin, by anding the gpio state with the bitmask of the pin id
     * then shifting it right by the banks pin id.<p>
     *
     * Example, Pin ID 4 (Bank A, Pin 4 - GPA4 on the datasheet), pin state high.<br />
     * Pin ID 4, PinMapped: 0x08 - 00001000<br />
     * GPIO State: 0x09 - 00001001<br />
     * 00001000 & 00001001 = 00001000<br />
     * 00001000 >> ((4 - 1) % 7) = 00000001<br />
     * Decoded value: 1<p>
     *
     * Example, Pin ID 16 (Bank B, Pin 8 - GPB7 on the datasheet), pin state high.<br />
     * Pin ID 16, HexMapped: 0x80 - 10000000<br />
     * GPIO State: 0xFF - 11111111<br />
     * 10000000 & 11111111 = 10000000<br />
     * 10000000 >> ((16 - 1) % 7) = 00000001<br />
     * 10000000 >> (7) = 00000001<br />
     * Decoded value: 1
     */
    function decode(pinId, gpioState) {
        return (pinMap(pinId % 8) & gpioState) >> ((pinId - 1) % 8);
    }

    /**
     * Performs a mapping from a decimal representation of a linear 16 pin
     * addressing scheme to a bit based addressing scheme over two banks of
     * 8 bit registers.<p>
     *
     * TL;DR: Maps a pin number to a bit in a single byte. For pins higher than 8
     * the first 8 pins are ignored.<p>
     *
     * Example: Pin 3
     * Pin 3 - 0x03 - 00000011
     * 1 << ((3 - 1) % 7)
     * 1 << 2
     * 00000001 << 2
     * 00000100
     *
     * Example: Pin 15
     * Pin 15 - 0x15 - 00001111
     * 1 << ((15 - 1) % 8)
     * 1 << (14 % 8)
     * 1 << 6
     * 00000001 << 6
     * 01000000
     *
     * @returns A single byte representing the address of that Pin in it's GPIO bank.
     */
    function pinMap(pinId) {
        return 1 << (pinId - 1);
    }
}