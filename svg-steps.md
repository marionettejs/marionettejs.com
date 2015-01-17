## Steps for adding SVG

1. `npm install -g svgo`
2. `svgo filename.svg` to make it really small
3. Drop your newly compressed SVG file into the `src/svg-icons` directory
4. Run `grunt compile-site` and an updated global SVG file will be created under `src/images/svg-sprite.svg` with your new SVG added
5. The `svg-sprite.svg` will be sub-divided by symbols with id's and loaded at the top of the `layout.jade` file, so you can simply add the following Jade code wherever you want to use the SVG:

  ```
    svg
      use(xlink:href="#SVGfilename")
  ```

## Notes

* If you go into the `<path>` of your compressed SVG, you can add `fill="currentColor"` to have it take on the font color of its parent element.

* You can open `svg-sprite.svg` in a text editor to confirm that your new SVG has been added.


