"use strict";

const config = require("config");
const Bunyan = require("bunyan");
const Alarm = require("./alarm");

const log = Bunyan.createLogger({ name: "Piarmed" });

const alarm = new Alarm(generateConfiguration());
alarm.start();

function generateConfiguration() {
    const ics = [];
    const generators = [];
    const notifiers = [];

    for (const icConfig of config.get("ics")) {
        log.info("Configuring IC " + icConfig.name + " with config", icConfig.cfg);
        const IC = require(icConfig.module);
        ics.push({ name: icConfig.name, inst: new IC(icConfig.cfg) });
    }

    for (const comboConfig of config.get("combos")) {
        log.info("Configuring combo " + comboConfig.name + " with config", comboConfig.cfg);
        const Combo = require(comboConfig.module);
        const comboInstance = new Combo(comboConfig.cfg);
        generators.push({ name: comboConfig.name, inst: comboInstance });
        notifiers.push({ name: comboConfig.name, inst: comboInstance });
    }

    for (const generatorConfig of config.get("generators")) {
        log.info("Configuring generator " + generatorConfig.name + " with config", generatorConfig.cfg);

        generators.push({
            name: generatorConfig.name,
            inst: createGenerator(generatorConfig, ics) });
    }

    for (const notifierConfig of config.get("notifiers")) {
        log.info("Configuring notifier " + notifierConfig.name + " with config", notifierConfig.cfg);
        notifiers.push({
            name: notifierConfig.name,
            inst: createNotifier(notifierConfig, ics)
        });
    }

    return {
        generators: generators,
        notifiers: notifiers
    };
}

function createNotifier(definition, ics) {
    const Notifier = require(definition.module);

    // if a data data adaptor is configured for the notifier, supply it.
    if (definition.cfg.dataAdaptor) {
        definition.cfg.dataAdaptor = createDataAdaptor(definition.cfg.dataAdaptor, ics);
    }

    return new Notifier(definition.cfg);
}

function createGenerator(definition, ics) {
    // create each of the inputs defined in the generator
    for (const inputDefinition of definition.cfg.inputs) {
        createInput(inputDefinition, ics);
    }
    var Generator = require(definition.module);
    return new Generator(definition.cfg);
}

/**
 * Creates an input per defined configuration.
 */
function createInput(inputDefinition, ics) {
    // substitute the data adaptor config with the instance
    // that has been created.
    inputDefinition.dataAdaptor = createDataAdaptor(inputDefinition.dataAdaptor, ics);
}

/**
 * Creates a data adaptor with any defined filter attached.
 */
function createDataAdaptor(definition, ics) {
    const DataAdaptor = require(definition.module);

    // if the data adaptor defines it uses an IC, then substitute in the named IC.
    if (definition.cfg.ic) {
        log.info("Substituting IC " + definition.cfg.ic);
        const ic = ics.find(function(ic) {
            return ic.name === definition.cfg.ic;
        });
        if (!ic) {
            throw new Error("Input has dependency on IC " +
                definition.cfg.ic +
                " that has not been defined in configuration.")
        }
        definition.cfg.ic = ic.inst;
    }

    // wrap the data adaptor in it's defined filter.
    let dataAdaptor = createFilter(
        definition.filter,
        new DataAdaptor(definition.cfg)
    );

    // substitute the data adaptor config with the instance
    // that has been created.
    return dataAdaptor;
}

/**
 * Wraps the defined data adaptor in an input filter, or returns
 * the data adaptor if the input filter is undefined.
 */
function createFilter(filterDefinition, dataAdaptor) {
    log.info("Creating filter", filterDefinition);

    if (filterDefinition) {
        const Filter = require(filterDefinition.module);
        filterDefinition.cfg.dataAdaptor = dataAdaptor;
        return new Filter(filterDefinition.cfg);
    } else {
        return dataAdaptor;
    }
}