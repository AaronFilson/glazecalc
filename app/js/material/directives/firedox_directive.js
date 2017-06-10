module.exports = function(app) {
  app.directive('firedoxSelect', function() {
    return {
      restrict: 'EA',
      templateUrl: '/templates/material/directives/firedox_dir_template.html'
    };
  });
};
