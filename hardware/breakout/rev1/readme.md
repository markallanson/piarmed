This directory contains the eagle schematic and board files for the rev 1
piarmed breakout board.

The rev 1 board contains support for 9 zones, which allows the board to
be the same width as the Raspberry Pi Zero.

# Eagle Parts

## Custom parts
There are 2 custom parts in the piarmed.lbr file in this directory.

### 3x18 Header
I use this with a 3x18 right angle connector from ebay. Actually there is no
such thing, I just got some 3x40 right angle connectors and snipped down to
3x18.

[Sourced from ebay, here] [1].

### Transformer
This is a part to accommodate the placement of a simple small 12v-5v buck
converter.

[Sourced from ebay, here] [2].

## Other parts
The raspberry pi connector is from the [SparkFun Connectors library] [3].

# Inventory
Here's what you will need to assemble the breakout board.

   * 1 - 2x20 2.54mm female header.
   * 1 - 2x20 2.54mm male header.
   * 1 - 3x18 right angle header (doesn't need to be right angle, but this is the way I am assembling it)
   * 1 - [Ebay buck converter] [2].
   * 1 - DC power jack with positive tip polarity.
   * 4 - 3mm LEDS of your favourite colours.
   * 4 - 220ohm resistors. [I used a TE Connectivity resistor - Farnell part 2329900] [4]
   * 18 - 22kohm resistors. [I used a TE Connectivity resistor - Farnell part 2329901] [5]
   * 1 - 1x2 male header (power to Raspberry Pi)
   * 1 - 1x2 female header (to build power cable for the Raspberry Pi)
   * 1 - Micro USB connector

Misc bits
   * Short wires to build power cable
   * Some heat shrink to build power cable.

# Manufacturing
I used [Elecrow] [6] to manufacture the boards. They supply the CAM files and also DRC files
to be used in eagle.

# Known Issues
Rev 1 board has one known issue - the power header to supply the Raspberry Pi is too close to
the Micro USB power port on the Raspberry Pi, so you need to bend your header back towards
the DC power jack in order to make your power cable fit.

[1]: http://www.ebay.co.uk/itm/161947559638
[2]: http://www.ebay.co.uk/itm/171464543948
[3]: https://github.com/sparkfun/SparkFun-Eagle-Libraries
[4]: http://uk.farnell.com/te-connectivity/lr0204f220r/resistor-metal-220r-0-25w-1/dp/2329900
[5]: http://uk.farnell.com/te-connectivity/lr0204f220r/resistor-metal-220r-0-25w-1/dp/2329901
[6]: http://www.elecrow.com/10pcs-2-layer-pcb-p-1175.html
