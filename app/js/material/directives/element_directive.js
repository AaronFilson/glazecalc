module.exports = function(app) {
  app.directive('elementSelect', function() {
    return {
      restrict: 'EA',
      templateUrl: '/templates/material/directives/element_dir_template.html'
    };
  });
};
