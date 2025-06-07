(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.PwaTestingMain = {
    attach: function (context, settings) {
      $(document).ready(function () {});
      console.log("Drupal behavior PwaTestingMain attached");
    },
  };
})(jQuery, Drupal);
