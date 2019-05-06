/**
 * The default configuration for the angular application.
 *
 * @type {Object}
 */
var DEFAULT = {

  /**
   * The main package string configuration.
   *
   * @type {String}
   */
  MAIN_PKG: 'io.github.luiseduardobrito.mc714-1s2016-lista3',

  /**
   * The main API definitions.
   */
  API: {

    /**
     * The API base url.
     */
    // BASE_URL: process.env.NODE_ENV !== 'DEVELOPMENT' ? "https://radiant-river-70847.herokuapp.com" : "http://localhost:3333"
    BASE_URL: process.env.NODE_ENV == 'DEVELOPMENT' ? "https://radiant-river-70847.herokuapp.com" : "http://localhost:3333",
    // IP: '192.168.0.254',
    // IP: '127.0.0.1',
    IP: '10.60.102.252',
    PORT: 20745,

  },

  /**
   * The default typing timeout.
   */
  CHAT: {
    TYPING_TIMEOUT: 2000
  },

  /**
   * Gets package name for supplied submodule. If none supplied
   * the main package will be returned.
   *
   * @type {Function}
   *
   * @param [suffix] The module name to be applied as a suffix to the main package name.
   * @return {string} The package string
   */
  PKG: function (suffix) {
    if (suffix != null && suffix.length) {
      return DEFAULT.MAIN_PKG + '.' + suffix;
    } else {
      return DEFAULT.MAIN_PKG;
    }
  }

};