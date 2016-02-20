# To Install Device Tree Compiler
Assuming running on a raspbian image. Change if using another distro that does not use apt-get.

    sudo apt-get install device-tree-compiler

# To compile
    dtc -@ -I dts -O dtb -o piarmed-overlay.dtb piarmed-overlay.dts

# To install
    sudo cp piarmed-overlay.dtb /boot/overlays/

# To configure
    sudo vim /boot/config.txt

Add the following line to the end of the file...

    device_tree_overlay=overlays/piarmed-overlay.dtb
