# To Install Device Tree Compiler
   sudo apt-get install device-tree-compiler

# To compile
   dtc -@ -I dts -O dtb -o orchard-overlay.dtb orchard-overlay.dts

