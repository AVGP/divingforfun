module.exports = function(eleventyConfig) {
  // Copy public assets directly to build output
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/nitrox/nitrox.css");
  eleventyConfig.addPassthroughCopy("src/nitrox/sw.js");
  eleventyConfig.addPassthroughCopy("src/nitrox/manifest.webmanifest");
  eleventyConfig.addPassthroughCopy("src/nitrox/icon-192x192.png");
  eleventyConfig.addPassthroughCopy("src/nitrox/favicon.ico");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
